import { createClient } from '@supabase/supabase-js';
import { makeOutboundCall } from '@/lib/twilio/client';
import { generateOutboundScript } from '@/lib/twilio/voice';
import { getRentCollectionTier } from '@/lib/ai/prompts/rent-collection';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://meridian-node.vercel.app';

export async function scheduleRentReminderCalls(orgId: string) {
  // Find tenants with active leases who are 3+ days late
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of month

  const daysSinceDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceDue < 3) return []; // Too early for reminders

  const { data: leases } = await supabase
    .from('leases')
    .select('id, tenant_id, monthly_rent, tenants(name, phone), units(unit_number)')
    .eq('org_id', orgId)
    .eq('status', 'active');

  if (!leases?.length) return [];

  const calls = [];
  const tier = getRentCollectionTier(daysSinceDue);

  for (const lease of leases) {
    const tenant = lease.tenants as any;
    const unit = lease.units as any;
    if (!tenant?.phone) continue;

    // Check if we already called today
    const { data: existingCall } = await supabase
      .from('conversations')
      .select('id')
      .eq('org_id', orgId)
      .eq('participant_phone', tenant.phone)
      .eq('channel', 'voice')
      .gte('created_at', new Date(now.toDateString()).toISOString())
      .limit(1)
      .single();

    if (existingCall) continue; // Already called today

    const details = `Your rent of $${lease.monthly_rent} for Unit ${unit?.unit_number} is ${daysSinceDue} days past due.`;

    try {
      const { data: orgPhone } = await supabase
        .from('org_phone_numbers')
        .select('phone_number')
        .eq('org_id', orgId)
        .limit(1)
        .single();

      const fromNumber = orgPhone?.phone_number || process.env.TWILIO_PHONE_NUMBER!;
      const twiml = generateOutboundScript('rent_reminder', tenant.name, details, webhookBase);

      const call = await makeOutboundCall(tenant.phone, fromNumber, twiml);
      calls.push({ tenant: tenant.name, callSid: call.sid, tier });
    } catch (err) {
      console.error(`Failed to call ${tenant.name}:`, err);
    }
  }

  return calls;
}

export async function scheduleMaintenanceUpdateCalls(orgId: string) {
  // Find open work orders assigned 24+ hours ago without recent update
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('id, title, status, tenants(name, phone), units(unit_number)')
    .eq('org_id', orgId)
    .in('status', ['assigned', 'in_progress'])
    .lte('updated_at', oneDayAgo);

  if (!workOrders?.length) return [];

  const calls = [];
  for (const wo of workOrders) {
    const tenant = wo.tenants as any;
    if (!tenant?.phone) continue;

    const details = `We're following up on your maintenance request: ${wo.title}. Status: ${wo.status}. We wanted to check if the vendor has been in contact with you.`;

    try {
      const { data: orgPhone } = await supabase
        .from('org_phone_numbers')
        .select('phone_number')
        .eq('org_id', orgId)
        .limit(1)
        .single();

      const fromNumber = orgPhone?.phone_number || process.env.TWILIO_PHONE_NUMBER!;
      const twiml = generateOutboundScript('maintenance_update', tenant.name, details, webhookBase);
      const call = await makeOutboundCall(tenant.phone, fromNumber, twiml);
      calls.push({ tenant: tenant.name, workOrder: wo.id, callSid: call.sid });
    } catch (err) {
      console.error(`Failed maintenance follow-up call for ${tenant.name}:`, err);
    }
  }

  return calls;
}
