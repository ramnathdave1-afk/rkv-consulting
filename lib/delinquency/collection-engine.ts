import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/twilio/client';
import {
  getRentCollectionTier,
  RENT_REMINDER_FRIENDLY,
  RENT_REMINDER_FIRM,
  RENT_REMINDER_FINAL,
} from '@/lib/ai/prompts/rent-collection';

interface CollectionResult {
  success: boolean;
  tier: 'friendly' | 'firm' | 'final';
  channels: string[];
  message?: string;
  error?: string;
}

export async function triggerCollection(
  orgId: string,
  rentPaymentId: string,
  channels: ('sms' | 'voice')[]
): Promise<CollectionResult> {
  const supabase = createAdminClient();

  // Look up rent_payment + tenant + lease + property + unit
  const { data: payment, error: paymentErr } = await supabase
    .from('rent_payments')
    .select(`
      id, amount_due, amount_paid, due_date, days_late, late_fee, status,
      lease_id,
      leases!inner(
        id, monthly_rent, tenant_id,
        tenants!inner(id, name, phone, email),
        units!inner(id, unit_number, property_id,
          properties!inner(id, name)
        )
      )
    `)
    .eq('id', rentPaymentId)
    .eq('org_id', orgId)
    .single();

  if (paymentErr || !payment) {
    return { success: false, tier: 'friendly', channels: [], error: 'Rent payment not found' };
  }

  const lease = payment.leases as any;
  const tenant = lease.tenants;
  const unit = lease.units;
  const property = unit.properties;

  const daysLate = payment.days_late || 0;
  const tier = getRentCollectionTier(daysLate);
  const balance = (payment.amount_due || 0) - (payment.amount_paid || 0);
  const amountStr = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const lateFeeStr = `$${(payment.late_fee || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const totalDue = `$${((balance + (payment.late_fee || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 }))}`;

  // Generate tier-appropriate message
  let message = '';
  switch (tier) {
    case 'friendly':
      message = RENT_REMINDER_FRIENDLY(tenant.name, amountStr, payment.due_date, unit.unit_number);
      break;
    case 'firm':
      message = RENT_REMINDER_FIRM(tenant.name, amountStr, daysLate, unit.unit_number, lateFeeStr);
      break;
    case 'final':
      message = RENT_REMINDER_FINAL(tenant.name, amountStr, totalDue, unit.unit_number, daysLate);
      break;
  }

  const completedChannels: string[] = [];

  // Send SMS
  if (channels.includes('sms') && tenant.phone) {
    try {
      const { data: orgPhone } = await supabase
        .from('org_phone_numbers')
        .select('phone_number')
        .eq('org_id', orgId)
        .limit(1)
        .single();

      const fromNumber = orgPhone?.phone_number || process.env.TWILIO_PHONE_NUMBER!;
      await sendSMS(tenant.phone, fromNumber, message);
      completedChannels.push('sms');
    } catch (err) {
      console.error('SMS send error:', err);
    }
  }

  // Voice channel — delegate to voice-campaigns system
  if (channels.includes('voice') && tenant.phone) {
    try {
      const { makeOutboundCall } = await import('@/lib/twilio/client');
      const { generateOutboundScript } = await import('@/lib/twilio/voice');

      const { data: orgPhone } = await supabase
        .from('org_phone_numbers')
        .select('phone_number')
        .eq('org_id', orgId)
        .limit(1)
        .single();

      const fromNumber = orgPhone?.phone_number || process.env.TWILIO_PHONE_NUMBER!;
      const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://rkv-consulting.vercel.app';
      const details = `Your rent of ${amountStr} for Unit ${unit.unit_number} is ${daysLate} days past due.`;
      const twiml = generateOutboundScript('rent_reminder', tenant.name, details, webhookBase);
      await makeOutboundCall(tenant.phone, fromNumber, twiml);
      completedChannels.push('voice');
    } catch (err) {
      console.error('Voice call error:', err);
    }
  }

  // Log to delinquency_actions
  await supabase.from('delinquency_actions').insert({
    org_id: orgId,
    rent_payment_id: rentPaymentId,
    tenant_id: tenant.id,
    tier,
    channels: completedChannels,
    message_preview: message.slice(0, 500),
    status: completedChannels.length > 0 ? 'sent' : 'failed',
    created_at: new Date().toISOString(),
  });

  return {
    success: completedChannels.length > 0,
    tier,
    channels: completedChannels,
    message,
  };
}
