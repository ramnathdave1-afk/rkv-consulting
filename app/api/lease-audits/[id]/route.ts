import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Get audit
    const { data: audit, error: auditErr } = await supabase
      .from('lease_audits')
      .select('*')
      .eq('id', id)
      .eq('org_id', ORG_ID)
      .single();

    if (auditErr || !audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    // Get findings with lease + unit + tenant + property info
    const { data: findings, error: findingsErr } = await supabase
      .from('lease_audit_findings')
      .select('*, leases(id, monthly_rent, lease_start, lease_end, unit_id, tenant_id, units(unit_number, property_id, properties(name)), tenants(first_name, last_name))')
      .eq('lease_audit_id', id)
      .order('severity', { ascending: true });

    if (findingsErr) {
      return NextResponse.json({ error: findingsErr.message }, { status: 500 });
    }

    return NextResponse.json({ audit, findings: findings || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
