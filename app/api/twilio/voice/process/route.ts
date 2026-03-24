import { NextResponse } from 'next/server';
import { generateVoiceResponse, transferToHuman } from '@/lib/twilio/voice';
import { classifyIntent, generateLeasingResponse } from '@/lib/ai/leasing-agent';
import { triageMaintenanceRequest, matchVendor, createWorkOrderFromMessage } from '@/lib/ai/maintenance-triage';
import { analyzeSentiment, shouldEscalate } from '@/lib/ai/sentiment-analysis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const formData = await request.formData();
  const speechResult = formData.get('SpeechResult') as string;
  const from = formData.get('From') as string;
  const callSid = formData.get('CallSid') as string;
  const conversationId = new URL(request.url).searchParams.get('conversation_id');

  const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://meridian-node.vercel.app';

  if (!speechResult) {
    const twiml = generateVoiceResponse(
      "I didn't quite catch that. Could you repeat that?",
      webhookBase,
      conversationId || undefined
    );
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  }

  // Log the caller's speech
  if (conversationId) {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'tenant',
      content: speechResult,
      channel: 'voice',
      metadata: { call_sid: callSid, transcription: true },
    });
  }

  // Check sentiment — escalate if angry
  const sentiment = await analyzeSentiment(speechResult);
  const escalation = shouldEscalate(sentiment, 0);

  if (escalation.escalate) {
    const twiml = transferToHuman(
      process.env.STAFF_PHONE || '+15551234567',
      "I understand this is important. Let me connect you with a team member who can help right away."
    );
    // Update conversation status
    if (conversationId) {
      await supabase.from('conversations').update({ status: 'human_handling' }).eq('id', conversationId);
    }
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  }

  // Classify intent
  const intent = await classifyIntent(speechResult);

  let responseText: string;

  if (intent === 'maintenance_request') {
    // Triage + dispatch
    const triage = await triageMaintenanceRequest(speechResult);

    // Look up org from conversation
    let orgId: string | null = null;
    if (conversationId) {
      const { data: conv } = await supabase.from('conversations').select('org_id').eq('id', conversationId).single();
      orgId = conv?.org_id;
    }

    const vendor = orgId ? await matchVendor(orgId, triage.category) : null;

    const priorityLabels: Record<string, string> = {
      emergency: 'an emergency',
      high: 'urgent',
      medium: 'a standard priority',
      low: 'a low priority',
    };

    responseText = `I've logged this as ${priorityLabels[triage.priority] || 'a'} ${triage.category} maintenance request.`;
    if (vendor) {
      responseText += ` ${vendor.name} has been dispatched and should contact you within 2 hours.`;
    } else {
      responseText += ` Our maintenance team has been notified and will reach out shortly.`;
    }
    responseText += ` You'll receive a text confirmation with your work order number.`;

  } else {
    // General leasing/inquiry response
    // Look up org from conversation for context
    let voiceOrgId = '';
    let voiceConvId = '';
    if (conversationId) {
      const { data: conv } = await supabase.from('conversations').select('org_id').eq('id', conversationId).single();
      voiceOrgId = conv?.org_id || '';
      voiceConvId = conversationId;
    }
    const result = await generateLeasingResponse(
      { orgId: voiceOrgId, conversationId: voiceConvId, participantPhone: from || '' },
      speechResult
    );
    responseText = result.response;

    // Trim for voice (keep under ~30 seconds of speech)
    if (responseText.length > 400) {
      responseText = responseText.substring(0, 397) + '...';
    }
  }

  // Log AI response
  if (conversationId) {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'ai',
      content: responseText,
      channel: 'voice',
      metadata: { call_sid: callSid, intent },
    });
  }

  const twiml = generateVoiceResponse(responseText, webhookBase, conversationId || undefined);
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}
