/**
 * Web Chat Widget API
 * Public endpoint for the embeddable chat widget on PM company websites.
 * No auth required — identified by org_id in the request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateLeasingResponse, classifyIntent } from '@/lib/ai/leasing-agent';

export async function POST(request: NextRequest) {
  const { org_id, session_id, message, visitor_name, visitor_email, visitor_phone } = await request.json();

  if (!org_id || !message) {
    return NextResponse.json({ error: 'Missing org_id or message' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify org exists
  const { data: org } = await supabase.from('organizations').select('id').eq('id', org_id).single();
  if (!org) return NextResponse.json({ error: 'Invalid org' }, { status: 404 });

  // Find or create conversation by session_id
  let conversation;
  if (session_id) {
    const { data } = await supabase
      .from('conversations')
      .select('id, tenant_id, property_id, status')
      .eq('id', session_id)
      .eq('org_id', org_id)
      .single();
    conversation = data;
  }

  if (!conversation) {
    // Try to match visitor to existing tenant
    let tenantId = null;
    if (visitor_email) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('org_id', org_id)
        .eq('email', visitor_email)
        .limit(1)
        .single();
      tenantId = tenant?.id || null;
    }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        org_id,
        tenant_id: tenantId,
        channel: 'web_chat',
        participant_name: visitor_name || null,
        participant_phone: visitor_email || visitor_phone || null,
        status: 'ai_handling',
        last_message_at: new Date().toISOString(),
      })
      .select('id, tenant_id, property_id, status')
      .single();
    conversation = newConv;
  }

  if (!conversation) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }

  // Store inbound message
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    org_id,
    direction: 'inbound',
    sender_type: 'tenant',
    content: message,
    channel: 'web_chat',
    status: 'received',
  });

  await supabase.from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation.id);

  // Generate AI response
  const intent = await classifyIntent(message);
  const aiResult = await generateLeasingResponse({
    orgId: org_id,
    conversationId: conversation.id,
    participantPhone: visitor_email || visitor_phone || 'web_visitor',
    tenantId: conversation.tenant_id || undefined,
  }, message);

  // Store outbound message
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    org_id,
    direction: 'outbound',
    sender_type: 'ai',
    content: aiResult.response,
    channel: 'web_chat',
    status: 'delivered',
    ai_classified_intent: intent,
  });

  return NextResponse.json({
    session_id: conversation.id,
    response: aiResult.response,
    intent,
  });
}
