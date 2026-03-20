/**
 * Inbound Email Webhook
 * Receives forwarded emails via Resend inbound webhook.
 * Routes to the AI leasing agent for automated responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateLeasingResponse, classifyIntent } from '@/lib/ai/leasing-agent';
import { createWorkOrderFromMessage } from '@/lib/ai/maintenance-triage';
import { sendEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Resend inbound webhook payload
  const { from, to, subject, text, html } = body;
  const senderEmail = typeof from === 'string' ? from : from?.email || from?.[0]?.email;
  const recipientEmail = typeof to === 'string' ? to : to?.email || to?.[0]?.email;
  const messageBody = text || stripHTML(html || '');

  if (!senderEmail || !recipientEmail || !messageBody) {
    return NextResponse.json({ error: 'Invalid email payload' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Look up org by recipient email domain or configured email
  // For now, match by checking if any org has this email configured
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .limit(1)
    .single();

  if (!org) {
    return NextResponse.json({ received: true });
  }

  const orgId = org.id;

  // Find tenant by email
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', senderEmail)
    .limit(1)
    .single();

  // Find or create conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('id, tenant_id, property_id, status')
    .eq('org_id', orgId)
    .eq('channel', 'email')
    .eq('participant_phone', senderEmail) // reusing participant_phone field for email
    .in('status', ['active', 'ai_handling', 'human_handling'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        org_id: orgId,
        tenant_id: tenant?.id || null,
        channel: 'email',
        participant_phone: senderEmail, // storing email in this field
        participant_name: senderEmail.split('@')[0],
        status: 'ai_handling',
        last_message_at: new Date().toISOString(),
      })
      .select('id, tenant_id, property_id, status')
      .single();
    conversation = newConv;
  }

  if (!conversation) {
    return NextResponse.json({ received: true });
  }

  // Store inbound message
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    org_id: orgId,
    direction: 'inbound',
    sender_type: 'tenant',
    content: `Subject: ${subject || '(no subject)'}\n\n${messageBody}`,
    channel: 'email',
    status: 'received',
    metadata: { from: senderEmail, to: recipientEmail, subject },
  });

  await supabase.from('conversations')
    .update({ last_message_at: new Date().toISOString(), status: 'ai_handling' })
    .eq('id', conversation.id);

  // Don't auto-respond if human is handling
  if (conversation.status === 'human_handling') {
    return NextResponse.json({ received: true });
  }

  // Classify intent
  const intent = await classifyIntent(messageBody);

  // Handle maintenance requests
  if (intent === 'maintenance_request' && conversation.tenant_id) {
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
      const result = await createWorkOrderFromMessage({
        orgId,
        propertyId: unitData.property_id,
        unitId: lease?.unit_id,
        tenantId: conversation.tenant_id || undefined,
        description: messageBody,
        conversationId: conversation.id,
      });

      const responseText = `Thank you for reporting this issue. We've created a work order: "${result.triage.summary}". Priority: ${result.triage.priority}. ${result.vendor ? `${result.vendor.name} has been assigned.` : 'A vendor will be assigned shortly.'} We'll keep you updated.`;

      await sendResponseEmail(supabase, conversation.id, orgId, senderEmail, subject, responseText);
      return NextResponse.json({ received: true, intent, work_order_created: true });
    }
  }

  // Standard AI response
  const aiResult = await generateLeasingResponse({
    orgId,
    conversationId: conversation.id,
    participantPhone: senderEmail,
    tenantId: conversation.tenant_id || undefined,
  }, messageBody);

  await sendResponseEmail(supabase, conversation.id, orgId, senderEmail, subject, aiResult.response);

  return NextResponse.json({ received: true, intent });
}

async function sendResponseEmail(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  orgId: string,
  to: string,
  originalSubject: string | undefined,
  body: string
) {
  const subject = originalSubject ? `Re: ${originalSubject}` : 'Response from your property management team';

  try {
    await sendEmail({
      to,
      subject,
      html: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${body.replace(/\n/g, '<br>')}</div>`,
    });

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      org_id: orgId,
      direction: 'outbound',
      sender_type: 'ai',
      content: body,
      channel: 'email',
      status: 'sent',
      metadata: { to, subject },
    });
  } catch (err) {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      org_id: orgId,
      direction: 'outbound',
      sender_type: 'ai',
      content: body,
      channel: 'email',
      status: 'failed',
      metadata: { error: String(err) },
    });
  }
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
