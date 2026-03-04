import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Autopilot Cron Agent
 * Runs daily via Vercel Cron to execute automated agent sequences.
 *
 * Checks:
 * 1. Overdue rent → triggers late_rent email sequence
 * 2. Leases expiring within 90 days → triggers lease_renewal email
 * 3. Unresolved maintenance > 48h → triggers maintenance_followup email
 * 4. Preventive maintenance due → logs reminder
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    console.error('[Autopilot] CRON_SECRET not set or too short');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    lateRent: 0,
    leaseRenewal: 0,
    maintenanceFollowup: 0,
    preventiveMaintenance: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // ── 1. Late Rent Check ──────────────────────────────────────────
    // Find tenants with rent_due_day that has passed this month
    const { data: allTenants } = await supabaseAdmin
      .from('tenants')
      .select('*, properties(*)')
      .eq('status', 'active');

    if (allTenants) {
      const currentDay = now.getDate();

      for (const tenant of allTenants) {
        const rentDueDay = tenant.rent_due_day || 1;
        const graceDays = tenant.late_fee_grace_days || 5;
        const daysLate = currentDay - rentDueDay;

        // Only process if rent is overdue (past grace period)
        if (daysLate > graceDays && daysLate <= graceDays + 1) {
          // Check if we already sent a late rent notice today
          const { data: existingLog } = await supabaseAdmin
            .from('agent_logs')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('trigger_event', 'late_rent')
            .gte('created_at', `${today}T00:00:00`)
            .limit(1);

          if (!existingLog?.length) {
            // Log the autopilot action (actual email sending requires user auth context)
            await supabaseAdmin.from('agent_logs').insert({
              user_id: tenant.user_id,
              tenant_id: tenant.id,
              property_id: tenant.property_id,
              agent_type: 'email',
              trigger_event: 'late_rent',
              subject: `Late Rent Notice - ${tenant.first_name} ${tenant.last_name}`,
              content: `Automated late rent notice triggered. Rent was due on day ${rentDueDay}, now ${daysLate} days overdue.`,
              outcome: 'Autopilot: Late rent sequence triggered',
              status: 'queued',
            });
            results.lateRent++;
          }
        }
      }
    }

    // ── 2. Lease Renewal Check ───────────────────────────────────────
    // Find leases expiring within 90 days
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: expiringLeases } = await supabaseAdmin
      .from('tenants')
      .select('*, properties(*)')
      .eq('status', 'active')
      .lte('lease_end', ninetyDaysFromNow)
      .gte('lease_end', today);

    if (expiringLeases) {
      for (const tenant of expiringLeases) {
        const leaseEnd = new Date(tenant.lease_end);
        const daysUntilExpiry = Math.ceil(
          (leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send at 90, 60, and 30 day marks
        const milestones = [90, 60, 30];
        if (milestones.includes(daysUntilExpiry)) {
          const { data: existingLog } = await supabaseAdmin
            .from('agent_logs')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('trigger_event', 'lease_renewal')
            .gte('created_at', `${today}T00:00:00`)
            .limit(1);

          if (!existingLog?.length) {
            await supabaseAdmin.from('agent_logs').insert({
              user_id: tenant.user_id,
              tenant_id: tenant.id,
              property_id: tenant.property_id,
              agent_type: 'email',
              trigger_event: 'lease_renewal',
              subject: `Lease Renewal - ${daysUntilExpiry} Days Notice`,
              content: `Automated lease renewal notice. Lease expires ${tenant.lease_end}. ${daysUntilExpiry} days remaining.`,
              outcome: `Autopilot: ${daysUntilExpiry}-day renewal notice queued`,
              status: 'queued',
            });
            results.leaseRenewal++;
          }
        }
      }
    }

    // ── 3. Maintenance Followup Check ────────────────────────────────
    // Find unresolved maintenance requests older than 48 hours
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const { data: unresolvedMaintenance } = await supabaseAdmin
      .from('maintenance_requests')
      .select('*, tenants(*), properties(*)')
      .in('status', ['open', 'in_progress'])
      .lte('created_at', fortyEightHoursAgo);

    if (unresolvedMaintenance) {
      for (const request of unresolvedMaintenance) {
        // Only send followup once per request per day
        const { data: existingLog } = await supabaseAdmin
          .from('agent_logs')
          .select('id')
          .eq('property_id', request.property_id)
          .eq('trigger_event', 'maintenance_followup')
          .gte('created_at', `${today}T00:00:00`)
          .limit(1);

        if (!existingLog?.length && request.tenants) {
          await supabaseAdmin.from('agent_logs').insert({
            user_id: request.user_id,
            tenant_id: request.tenant_id,
            property_id: request.property_id,
            agent_type: 'email',
            trigger_event: 'maintenance_followup',
            subject: `Maintenance Update - ${request.title || request.category}`,
            content: `Automated followup for maintenance request "${request.title || request.category}". Status: ${request.status}. Created: ${request.created_at}.`,
            outcome: 'Autopilot: Maintenance followup queued',
            status: 'queued',
          });
          results.maintenanceFollowup++;
        }
      }
    }

    // ── 4. Preventive Maintenance Check ──────────────────────────────
    const { data: dueSchedules } = await supabaseAdmin
      .from('preventive_schedules')
      .select('*, properties(*)')
      .lte('next_due', today)
      .eq('auto_schedule', true);

    if (dueSchedules) {
      for (const schedule of dueSchedules) {
        const { data: existingLog } = await supabaseAdmin
          .from('agent_logs')
          .select('id')
          .eq('property_id', schedule.property_id)
          .eq('trigger_event', `preventive_${schedule.task_type}`)
          .gte('created_at', `${today}T00:00:00`)
          .limit(1);

        if (!existingLog?.length) {
          await supabaseAdmin.from('agent_logs').insert({
            user_id: schedule.user_id,
            property_id: schedule.property_id,
            agent_type: 'email',
            trigger_event: `preventive_${schedule.task_type}`,
            subject: `Preventive Maintenance Due - ${schedule.task_type.replace(/_/g, ' ')}`,
            content: `Scheduled ${schedule.task_type.replace(/_/g, ' ')} is due for property. Frequency: ${schedule.frequency}.`,
            outcome: 'Autopilot: Preventive maintenance reminder logged',
            status: 'queued',
          });
          results.preventiveMaintenance++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error('[Autopilot] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Autopilot execution failed',
        results,
      },
      { status: 500 }
    );
  }
}
