/**
 * Lease Renewal Sequence Engine
 * Manages automated 90/60/30-day renewal outreach.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/twilio/client';

interface LeaseWithDetails {
  id: string;
  org_id: string;
  tenant_id: string;
  unit_id: string;
  lease_end: string;
  monthly_rent: number;
  tenants: { first_name: string; last_name: string; phone: string | null } | null;
  units: { unit_number: string; properties: { name: string } | null } | null;
}

export async function initRenewalSequence(lease: LeaseWithDetails): Promise<string | null> {
  const supabase = createAdminClient();

  // Calculate proposed rent (default: 3% increase)
  const currentRent = Number(lease.monthly_rent);
  const increasePct = 3;
  const proposedRent = Math.round(currentRent * (1 + increasePct / 100));

  const triggerDate = new Date(lease.lease_end);
  triggerDate.setDate(triggerDate.getDate() - 90);

  const { data: sequence, error } = await supabase
    .from('lease_renewal_sequences')
    .insert({
      org_id: lease.org_id,
      lease_id: lease.id,
      tenant_id: lease.tenant_id,
      status: 'active',
      trigger_date: triggerDate.toISOString().split('T')[0],
      proposed_rent: proposedRent,
      rent_increase_pct: increasePct,
    })
    .select('id')
    .single();

  if (error || !sequence) return null;

  // Send 90-day notice
  await processRenewalStep(sequence.id, '90');
  return sequence.id;
}

export async function processRenewalStep(
  sequenceId: string,
  step: '90' | '60' | '30'
): Promise<void> {
  const supabase = createAdminClient();

  const { data: seq } = await supabase
    .from('lease_renewal_sequences')
    .select('*, leases(monthly_rent, lease_end, units(unit_number, properties(name)), tenants(first_name, phone))')
    .eq('id', sequenceId)
    .single();

  if (!seq || seq.status !== 'active') return;

  const lease = seq.leases as unknown as {
    monthly_rent: number;
    lease_end: string;
    units: { unit_number: string; properties: { name: string } | null } | null;
    tenants: { first_name: string; phone: string | null } | null;
  };

  if (!lease?.tenants?.phone) return;

  const tenantName = lease.tenants.first_name;
  const propertyName = lease.units?.properties?.name || 'your property';
  const unitNumber = lease.units?.unit_number || '';
  const leaseEnd = lease.lease_end;
  const proposedRent = seq.proposed_rent;

  // Get org phone number for sending
  const { data: orgPhone } = await supabase
    .from('org_phone_numbers')
    .select('phone_number')
    .eq('org_id', seq.org_id)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!orgPhone) return;

  const messages: Record<string, string> = {
    '90': `Hi ${tenantName}! Your lease at ${propertyName} Unit ${unitNumber} expires on ${leaseEnd}. We'd love to have you stay! Your renewal rate would be $${proposedRent}/mo. Reply YES to renew or let us know if you have questions.`,
    '60': `Hi ${tenantName}, checking in about your lease renewal at ${propertyName}. The renewal offer of $${proposedRent}/mo is still available. Let us know your plans so we can help!`,
    '30': `Hi ${tenantName}, your lease at ${propertyName} expires in 30 days. Please let us know if you'd like to renew at $${proposedRent}/mo or if you plan to move out so we can begin the transition.`,
  };

  try {
    await sendSMS(lease.tenants.phone, orgPhone.phone_number, messages[step]);

    const updateField = `step_${step}_sent_at`;
    const channelField = `step_${step}_channel`;
    await supabase
      .from('lease_renewal_sequences')
      .update({
        [updateField]: new Date().toISOString(),
        [channelField]: 'sms',
        ...(step === '90' ? { renewal_offered_at: new Date().toISOString() } : {}),
      })
      .eq('id', sequenceId);
  } catch (err) {
    console.error(`[Renewal] Failed to send ${step}-day notice for sequence ${sequenceId}:`, err);
  }
}

export async function handleRenewalResponse(
  sequenceId: string,
  response: 'accepted' | 'declined' | 'negotiating'
): Promise<void> {
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = { tenant_response: response };

  if (response === 'accepted') {
    updates.renewal_accepted_at = new Date().toISOString();
    updates.status = 'completed';

    // Update lease
    const { data: seq } = await supabase
      .from('lease_renewal_sequences')
      .select('lease_id, proposed_rent')
      .eq('id', sequenceId)
      .single();

    if (seq) {
      await supabase.from('leases').update({
        renewal_offered: true,
        renewal_rent: seq.proposed_rent,
        status: 'renewed',
      }).eq('id', seq.lease_id);
    }
  } else if (response === 'declined') {
    updates.renewal_declined_at = new Date().toISOString();
    updates.status = 'completed';
  }

  await supabase.from('lease_renewal_sequences').update(updates).eq('id', sequenceId);
}
