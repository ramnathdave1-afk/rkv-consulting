/**
 * Seller Outreach Sequence Engine
 * 5-step SMS/email drip campaigns to motivated sellers.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/twilio/client';
import { sendEmail } from '@/lib/email/send';
import { callClaude } from '@/lib/ai/claude';

interface DealForOutreach {
  id: string;
  org_id: string;
  address: string;
  city: string;
  state: string;
  seller_name: string | null;
  seller_phone: string | null;
  seller_email: string | null;
  seller_type: string | null;
  asking_price: number | null;
  mao: number | null;
}

export async function initSellerSequence(deal: DealForOutreach, sequenceType: string = 'cold_outreach'): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: sequence, error } = await supabase
    .from('seller_sequences')
    .insert({
      org_id: deal.org_id,
      deal_id: deal.id,
      status: 'active',
      sequence_type: sequenceType,
    })
    .select('id')
    .single();

  if (error || !sequence) return null;

  await processSellerStep(sequence.id, 1);
  return sequence.id;
}

export async function processSellerStep(sequenceId: string, step: number): Promise<void> {
  const supabase = createAdminClient();

  const { data: seq } = await supabase
    .from('seller_sequences')
    .select('*, deals(address, city, state, seller_name, seller_phone, seller_email, seller_type, asking_price, mao, org_id)')
    .eq('id', sequenceId)
    .single();

  if (!seq || seq.status !== 'active') return;

  const deal = seq.deals as unknown as DealForOutreach | null;
  if (!deal) return;

  const sellerName = deal.seller_name || 'Property Owner';
  const address = `${deal.address}, ${deal.city}`;

  // Generate personalized message using Claude
  const message = await generateOutreachMessage(step, seq.sequence_type, sellerName, address, deal.seller_type, deal.asking_price);

  // Get org phone
  const { data: orgPhone } = await supabase
    .from('org_phone_numbers')
    .select('phone_number')
    .eq('org_id', deal.org_id)
    .eq('is_active', true)
    .limit(1)
    .single();

  const stepField = `step_${step}_sent_at`;
  const channelField = `step_${step}_channel`;
  let channel = 'sms';

  // Try SMS first, fall back to email
  if (deal.seller_phone && orgPhone) {
    try {
      await sendSMS(deal.seller_phone, orgPhone.phone_number, message);
      channel = 'sms';
    } catch {
      if (deal.seller_email) {
        await sendEmail({ to: deal.seller_email, subject: `Regarding your property at ${address}`, html: `<p>${message}</p>` });
        channel = 'email';
      }
    }
  } else if (deal.seller_email) {
    await sendEmail({ to: deal.seller_email, subject: `Regarding your property at ${address}`, html: `<p>${message}</p>` });
    channel = 'email';
  }

  await supabase.from('seller_sequences').update({
    [stepField]: new Date().toISOString(),
    [channelField]: channel,
  }).eq('id', sequenceId);

  // Log activity
  await supabase.from('deal_activity').insert({
    deal_id: seq.deal_id,
    org_id: deal.org_id,
    activity_type: channel === 'sms' ? 'sms' : 'email',
    content: `Outreach step ${step}: ${message}`,
    metadata: { sequence_id: sequenceId, step, channel },
  });
}

async function generateOutreachMessage(
  step: number,
  sequenceType: string,
  sellerName: string,
  address: string,
  sellerType: string | null,
  askingPrice: number | null
): Promise<string> {
  const stepDescriptions: Record<number, string> = {
    1: 'Initial introduction — express interest, be warm and direct',
    2: 'Follow-up — reference first message, add value proposition',
    3: 'Social proof — mention track record, create urgency gently',
    4: 'Direct offer hint — mention you can close quickly, ask about timeline',
    5: 'Final touch — last attempt, leave door open, provide direct contact',
  };

  const result = await callClaude(
    [{ role: 'user', content: `Generate outreach message step ${step} of 5 for a ${sequenceType} sequence.

Seller: ${sellerName}
Property: ${address}
Seller Type: ${sellerType || 'unknown'}
Asking Price: ${askingPrice ? `$${askingPrice.toLocaleString()}` : 'not listed'}

Step purpose: ${stepDescriptions[step] || 'Follow up'}

Rules:
- Keep under 160 characters for SMS
- Be professional but personal
- Never be pushy or aggressive
- Reference the specific property address
- If this is a motivated seller, be empathetic to their situation` }],
    'You are a real estate investor writing personalized outreach messages to property sellers. Write concise, warm, professional SMS messages.'
  );

  const text = Array.isArray(result?.content)
    ? result.content.map((b: { text?: string }) => b.text || '').join('')
    : typeof result?.content === 'string' ? result.content : '';

  return text.trim() || `Hi ${sellerName}, I'm interested in your property at ${address}. Would you be open to discussing a potential sale? Thanks!`;
}
