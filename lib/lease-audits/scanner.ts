import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export interface AuditFinding {
  lease_audit_id: string;
  lease_id: string;
  finding_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  current_value: string | null;
  recommended_value: string | null;
  monthly_impact: number;
  status: 'open' | 'resolved' | 'dismissed';
}

function severityFromGapPercent(gapPercent: number): 'critical' | 'high' | 'medium' | 'low' {
  if (gapPercent >= 30) return 'critical';
  if (gapPercent >= 20) return 'high';
  if (gapPercent >= 10) return 'medium';
  return 'low';
}

export async function runLeaseAudit(orgId: string = ORG_ID) {
  const supabase = createAdminClient();

  // Create audit row
  const { data: audit, error: auditErr } = await supabase
    .from('lease_audits')
    .insert({
      org_id: orgId,
      status: 'running',
      leases_scanned: 0,
      issues_found: 0,
      potential_monthly_recovery: 0,
    })
    .select()
    .single();

  if (auditErr || !audit) {
    throw new Error(`Failed to create audit: ${auditErr?.message}`);
  }

  const findings: AuditFinding[] = [];

  try {
    // Fetch all active leases with unit + tenant info
    const { data: leases, error: leaseErr } = await supabase
      .from('leases')
      .select('id, monthly_rent, security_deposit, status, lease_start, lease_end, terms, unit_id, tenant_id, units(id, unit_number, market_rent, property_id, properties(id, name)), tenants(id, first_name, last_name)')
      .eq('org_id', orgId)
      .eq('status', 'active');

    if (leaseErr) throw new Error(`Failed to fetch leases: ${leaseErr.message}`);

    const activeLeases = leases || [];

    // Check 1: Below market rent
    for (const lease of activeLeases) {
      const unit = lease.units as any;
      if (!unit?.market_rent || !lease.monthly_rent) continue;

      const threshold = unit.market_rent * 0.9;
      if (lease.monthly_rent < threshold) {
        const gap = unit.market_rent - lease.monthly_rent;
        const gapPercent = Math.round((gap / unit.market_rent) * 100);

        findings.push({
          lease_audit_id: audit.id,
          lease_id: lease.id,
          finding_type: 'below_market_rent',
          severity: severityFromGapPercent(gapPercent),
          description: `Rent $${lease.monthly_rent}/mo is ${gapPercent}% below market rate of $${unit.market_rent}/mo`,
          current_value: `$${lease.monthly_rent}`,
          recommended_value: `$${unit.market_rent}`,
          monthly_impact: gap,
          status: 'open',
        });
      }
    }

    // Check 2: Missing late fees
    for (const lease of activeLeases) {
      const { data: latePmts } = await supabase
        .from('rent_payments')
        .select('id, days_late, late_fee, amount')
        .eq('lease_id', lease.id)
        .gt('days_late', 5)
        .or('late_fee.is.null,late_fee.eq.0');

      if (latePmts && latePmts.length > 0) {
        const estimatedFees = latePmts.length * 50; // $50 avg late fee
        findings.push({
          lease_audit_id: audit.id,
          lease_id: lease.id,
          finding_type: 'missing_late_fees',
          severity: latePmts.length >= 5 ? 'high' : 'medium',
          description: `${latePmts.length} late payment(s) over 5 days with no late fee charged`,
          current_value: '$0',
          recommended_value: `$${estimatedFees} total`,
          monthly_impact: Math.round(estimatedFees / 12),
          status: 'open',
        });
      }
    }

    // Check 3: Expired lease still active — query separately for all leases that are active but past end date
    const { data: expiredLeases } = await supabase
      .from('leases')
      .select('id, monthly_rent, lease_end, unit_id, tenant_id, units(id, unit_number, market_rent, property_id, properties(id, name)), tenants(id, first_name, last_name)')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .lt('lease_end', new Date().toISOString().split('T')[0]);

    for (const lease of expiredLeases || []) {
      const daysExpired = Math.floor(
        (Date.now() - new Date(lease.lease_end).getTime()) / (1000 * 60 * 60 * 24)
      );
      findings.push({
        lease_audit_id: audit.id,
        lease_id: lease.id,
        finding_type: 'expired_lease',
        severity: daysExpired > 90 ? 'critical' : daysExpired > 30 ? 'high' : 'medium',
        description: `Lease expired ${daysExpired} day(s) ago on ${lease.lease_end} but still marked active`,
        current_value: `Expired ${lease.lease_end}`,
        recommended_value: 'Renew or terminate',
        monthly_impact: 0,
        status: 'open',
      });
    }

    // Check 4: Missing security deposit
    for (const lease of activeLeases) {
      if (!lease.security_deposit || lease.security_deposit === 0) {
        findings.push({
          lease_audit_id: audit.id,
          lease_id: lease.id,
          finding_type: 'missing_security_deposit',
          severity: 'high',
          description: 'No security deposit on file for active lease',
          current_value: '$0',
          recommended_value: `$${lease.monthly_rent || 0} (1 month rent)`,
          monthly_impact: 0,
          status: 'open',
        });
      }
    }

    // Insert all findings
    if (findings.length > 0) {
      const { error: findingsErr } = await supabase
        .from('lease_audit_findings')
        .insert(findings);

      if (findingsErr) {
        console.error('Failed to insert findings:', findingsErr.message);
      }
    }

    // Calculate totals
    const totalRecovery = findings.reduce((sum, f) => sum + f.monthly_impact, 0);

    // Update audit with totals
    const { data: completedAudit, error: updateErr } = await supabase
      .from('lease_audits')
      .update({
        status: 'completed',
        leases_scanned: activeLeases.length,
        issues_found: findings.length,
        potential_monthly_recovery: totalRecovery,
        completed_at: new Date().toISOString(),
      })
      .eq('id', audit.id)
      .select()
      .single();

    if (updateErr) {
      console.error('Failed to update audit:', updateErr.message);
    }

    return { audit: completedAudit || audit, findings };
  } catch (err: any) {
    // Mark audit as failed
    await supabase
      .from('lease_audits')
      .update({ status: 'failed' })
      .eq('id', audit.id);

    throw err;
  }
}
