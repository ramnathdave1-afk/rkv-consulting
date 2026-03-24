import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateRequest, sendSMS } from '@/lib/twilio/client';
import { generateLeasingResponse, classifyIntent } from '@/lib/ai/leasing-agent';
import { createWorkOrderFromMessage } from '@/lib/ai/maintenance-triage';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const params = Object.fromEntries(new URLSearchParams(body));

  // Validate Twilio signature (skip in dev/debug — re-enable for production hardening)
  // const signature = request.headers.get('x-twilio-signature') || '';
  // const url = `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/twilio/incoming`;
  // if (!validateRequest(signature, url, params)) {
  //   return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  // }

  const { From: from, To: to, Body: messageBody, MessageSid: messageSid } = params;

  const supabase = createAdminClient();

  // Look up the org by the Twilio number that received the message
  const { data: phoneRecord } = await supabase
    .from('org_phone_numbers')
    .select('org_id, purpose')
    .eq('phone_number', to)
    .eq('is_active', true)
    .single();

  if (!phoneRecord) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  const orgId = phoneRecord.org_id;

  // Find or create conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('id, tenant_id, property_id, status')
    .eq('org_id', orgId)
    .eq('participant_phone', from)
    .eq('twilio_phone', to)
    .in('status', ['active', 'ai_handling', 'human_handling'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!conversation) {
    // Try to match to existing tenant by phone
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('org_id', orgId)
      .eq('phone', from)
      .limit(1)
      .single();

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        org_id: orgId,
        tenant_id: tenant?.id || null,
        channel: 'sms',
        twilio_phone: to,
        participant_phone: from,
        status: 'ai_handling',
        last_message_at: new Date().toISOString(),
      })
      .select('id, tenant_id, property_id, status')
      .single();
    conversation = newConv;
  }

  if (!conversation) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  // Insert inbound message
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    org_id: orgId,
    direction: 'inbound',
    sender_type: 'tenant',
    content: messageBody || '',
    channel: 'sms',
    twilio_sid: messageSid,
    status: 'received',
  });

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString(), status: 'ai_handling' })
    .eq('id', conversation.id);

  // If conversation is in human_handling mode, don't auto-respond
  if (conversation.status === 'human_handling') {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  // Classify intent
  const intent = await classifyIntent(messageBody || '');

  // Update intent on message
  await supabase
    .from('messages')
    .update({ ai_classified_intent: intent })
    .eq('twilio_sid', messageSid);

  let responseText: string;

  // Handle maintenance requests differently
  if (intent === 'maintenance_request' && conversation.tenant_id) {
    // Find tenant's property/unit for work order creation
    const { data: lease } = await supabase
      .from('leases')
      .select('unit_id, units(property_id)')
      .eq('tenant_id', conversation.tenant_id)
      .eq('org_id', orgId)
      .eq('status', 'active')
      .limit(1)
      .single();

    const unitData = lease?.units as unknown as { property_id: string } | null;
    if (unitData?.property_id) {
      const propertyId = unitData.property_id;
      const result = await createWorkOrderFromMessage({
        orgId,
        propertyId,
        unitId: lease?.unit_id,
        tenantId: conversation.tenant_id || undefined,
        description: messageBody || '',
        conversationId: conversation.id,
      });

      const priorityText = result.triage.priority === 'emergency'
        ? 'This has been flagged as an EMERGENCY and a vendor is being contacted immediately.'
        : result.triage.priority === 'high'
          ? 'This has been marked as high priority and we are dispatching a vendor.'
          : 'A work order has been created and a vendor will be assigned shortly.';

      const vendorText = result.vendor
        ? ` ${result.vendor.name} has been assigned.`
        : ' Our team will assign a vendor and follow up.';

      responseText = `Got it! ${result.triage.summary}. ${priorityText}${vendorText} We'll keep you updated on the status.`;
    } else {
      // No active lease found — use general AI response
      const aiResult = await generateLeasingResponse({
        orgId,
        conversationId: conversation.id,
        participantPhone: from,
        tenantId: conversation.tenant_id || undefined,
      }, messageBody || '');
      responseText = aiResult.response;
    }
  } else {
    // Standard AI leasing agent response
    const aiResult = await generateLeasingResponse({
      orgId,
      conversationId: conversation.id,
      participantPhone: from,
      propertyId: conversation.property_id || undefined,
      tenantId: conversation.tenant_id || undefined,
    }, messageBody || '');
    responseText = aiResult.response;
  }

  // Send response via Twilio
  try {
    const smsResult = await sendSMS(from, to, responseText);

    // Store outbound message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      org_id: orgId,
      direction: 'outbound',
      sender_type: 'ai',
      content: responseText,
      channel: 'sms',
      twilio_sid: smsResult.sid,
      status: smsResult.status,
      ai_classified_intent: intent,
    });
  } catch (err) {
    console.error('[Twilio SMS] Failed to send:', err);
    // Store failed message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      org_id: orgId,
      direction: 'outbound',
      sender_type: 'ai',
      content: responseText,
      channel: 'sms',
      status: 'failed',
      metadata: { error: String(err) },
    });
  }

  // Return empty TwiML — we send the response via API, not TwiML
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } }
  );
}
