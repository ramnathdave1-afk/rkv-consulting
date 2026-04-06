import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callClaude } from '@/lib/ai/claude';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

const SYSTEM_PROMPT = `You are the AI phone assistant for RKV Consulting, a property management company. You handle all inbound calls professionally and conversationally.

You can help with ANY property management request including:

LEASING & AVAILABILITY:
- Unit availability, pricing, floor plans, amenities
- Schedule property tours/showings
- Application process, required documents, fees
- Pet policies, parking, storage, utilities included
- Lease terms, move-in costs, security deposits

MAINTENANCE & REPAIRS:
- Take maintenance requests (ask for: property, unit number, description of issue)
- Classify urgency: Emergency (flooding, gas leak, no heat in winter, fire) vs Urgent (no hot water, broken AC in summer, appliance failure) vs Routine (cosmetic, minor repairs)
- For emergencies, tell them to call 911 first if life-threatening, then assure them a technician will be dispatched immediately
- For routine requests, confirm details and let them know a work order has been created

RENT & PAYMENTS:
- Payment methods, due dates, late fees
- Payment plan requests (take details, say a manager will follow up)
- Balance inquiries (tell them to check their tenant portal or you'll have someone follow up with exact numbers)

LEASE RENEWALS:
- Renewal timeline, process, potential rent adjustments
- Transfer to a manager for negotiation on specific terms

GENERAL:
- Office hours, property addresses, contact info
- Noise complaints, neighbor issues (document and escalate)
- Move-out procedures, security deposit return timeline
- Any question a tenant or prospect might have

HANDLING ANGRY / UPSET CALLERS:
- Stay calm, empathetic, and professional NO MATTER WHAT they say
- If they curse or yell: DO NOT match their energy. Acknowledge their frustration: "I completely understand your frustration, and I'm sorry you're dealing with this."
- Use their name if you have it — it calms people down
- Validate first, solve second: "That sounds really frustrating. Let me help fix this right now."
- If they curse at you directly: "I understand you're upset, and I want to help. Let's focus on getting this resolved for you."
- If they threaten or become abusive after 3+ exchanges: "I want to make sure you get the help you need. Let me connect you with a manager who can assist further."
- NEVER argue, get defensive, or tell them to calm down
- NEVER hang up on them or refuse service
- NEVER take it personally or respond emotionally
- De-escalation phrases to use: "I hear you", "That's completely valid", "Let me make this right", "You deserve better than that", "Here's what I can do right now"
- If they have a legitimate complaint (broken AC for days, pest issue, etc.), acknowledge the failure: "You're absolutely right, that should have been handled sooner. Let me escalate this immediately."
- If they demand to speak to a human: "Absolutely, let me have a manager call you back within the hour. Can I confirm your number?"

HANDLING CONFUSED / ELDERLY / NON-NATIVE SPEAKERS:
- Speak simply and clearly
- Repeat key information
- Be extra patient — never rush them
- If they seem confused about what you are: "I'm an automated assistant for RKV Consulting. I can help with most things, or I can have a real person call you back if you'd prefer."

HANDLING SPAM / WRONG NUMBERS / SALES CALLS:
- If someone is clearly selling something or it's a robocall: "This is the property management line for RKV Consulting. If you're a tenant or prospective resident, I'm happy to help. Otherwise, have a great day."
- Keep it short and move on

RULES:
- Speak naturally like a helpful receptionist, not a robot
- Keep responses concise (2-4 sentences ideal for phone)
- NEVER discuss race, religion, national origin, sex, familial status, disability (Fair Housing Act)
- If you truly can't help, say "Let me have a team member call you back about that"
- Always be warm and professional
- When taking a maintenance request, confirm: What property? What unit? What's the issue? Is it an emergency?
- Don't make up specific numbers (rent amounts, balances) unless provided in context
- If someone asks "are you a real person" or "am I talking to AI": Be honest — "I'm an AI assistant for RKV Consulting. I can help with most questions, or I can have someone call you back if you'd prefer."
- Match the caller's energy level (but never match anger) — if they're casual, be casual. If they're formal, be formal.`;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const speechResult = formData.get('SpeechResult') as string;
  const callerPhone = formData.get('From') as string || '';
  const convoId = request.nextUrl.searchParams.get('convo') || '';
  const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://rkv-consulting.vercel.app';

  const supabase = createAdminClient();

  // If no speech detected, ask again
  if (!speechResult) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${webhookBase}/api/twilio/voice/respond?convo=${convoId}" method="POST" speechTimeout="2" language="en-US">
    <Say voice="Polly.Joanna">Sorry, I didn't catch that. Could you please repeat?</Say>
  </Gather>
  <Say voice="Polly.Joanna">I still didn't hear anything. Feel free to call back anytime. Goodbye.</Say>
</Response>`;
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  }

  // Log caller's message
  if (convoId) {
    await supabase.from('messages').insert({
      conversation_id: convoId,
      org_id: ORG_ID,
      direction: 'inbound',
      sender_type: 'tenant',
      content: speechResult,
      channel: 'voice',
    });
  }

  // Load conversation history
  let history: { role: string; content: string }[] = [];
  if (convoId) {
    const { data: convo } = await supabase
      .from('conversations')
      .select('ai_context')
      .eq('id', convoId)
      .single();
    history = ((convo?.ai_context as Record<string, unknown>)?.history as { role: string; content: string }[]) || [];
  }

  // Get property context
  const { data: properties } = await supabase
    .from('properties')
    .select('name, address_line1, city, state, zip, property_type, unit_count')
    .eq('org_id', ORG_ID);

  const { data: vacantUnits } = await supabase
    .from('units')
    .select('unit_number, bedrooms, bathrooms, market_rent, square_footage, properties(name)')
    .eq('org_id', ORG_ID)
    .eq('status', 'vacant')
    .limit(15);

  const propertyContext = properties?.length
    ? `\n\nPROPERTIES MANAGED:\n${properties.map(p => `- ${p.name}: ${p.address_line1}, ${p.city}, ${p.state} ${p.zip} (${p.unit_count} units, ${p.property_type})`).join('\n')}`
    : '';

  const unitContext = vacantUnits?.length
    ? `\n\nAVAILABLE UNITS:\n${vacantUnits.map((u: Record<string, unknown>) => `- ${(u.properties as Record<string, string>)?.name} Unit ${u.unit_number}: ${u.bedrooms}bd/${u.bathrooms}ba, $${u.market_rent}/mo`).join('\n')}`
    : '';

  // Load knowledge base
  const { data: knowledge } = await supabase
    .from('property_knowledge')
    .select('question, answer, category')
    .eq('org_id', ORG_ID)
    .order('category');

  const knowledgeContext = knowledge?.length
    ? `\n\nPROPERTY FAQ & KNOWLEDGE BASE (use these to answer specific questions):\n${knowledge.map(k => `Q: ${k.question}\nA: ${k.answer}`).join('\n\n')}`
    : '';

  const fullSystemPrompt = SYSTEM_PROMPT + propertyContext + unitContext + knowledgeContext;

  // Build messages for Claude
  const messages = [
    ...history,
    { role: 'user', content: speechResult },
  ];

  // Call Claude
  let aiResponse = '';
  try {
    const result = await callClaude(messages, fullSystemPrompt);
    if (result.content && Array.isArray(result.content)) {
      aiResponse = result.content.map((block: { text?: string }) => block.text || '').join('');
    } else if (typeof result.content === 'string') {
      aiResponse = result.content;
    } else {
      aiResponse = "I'd be happy to help with that. Let me have a team member call you back with the details.";
    }
  } catch (err) {
    console.error('[VoiceAI] Claude error:', err);
    aiResponse = "I apologize, I'm having a bit of trouble right now. Let me have a team member call you back shortly.";
  }

  // Keep response phone-friendly
  if (aiResponse.length > 600) {
    aiResponse = aiResponse.slice(0, 597) + '...';
  }

  // Strip markdown/emojis for voice
  aiResponse = aiResponse
    .replace(/\*\*/g, '')
    .replace(/[#*_~`>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}]/gu, '')
    .replace(/•/g, ',')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();

  // Log AI response
  if (convoId) {
    await supabase.from('messages').insert({
      conversation_id: convoId,
      org_id: ORG_ID,
      direction: 'outbound',
      sender_type: 'ai',
      content: aiResponse,
      channel: 'voice',
    });

    // Update conversation history
    const updatedHistory = [
      ...history,
      { role: 'user', content: speechResult },
      { role: 'assistant', content: aiResponse },
    ].slice(-20);

    await supabase
      .from('conversations')
      .update({ ai_context: { history: updatedHistory }, last_message_at: new Date().toISOString() })
      .eq('id', convoId);
  }

  // Respond and loop back to listen
  // Use ElevenLabs for realistic voice if configured, otherwise fall back to Polly
  const useElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const ttsUrl = `${webhookBase}/api/voice/tts?text=${encodeURIComponent(aiResponse)}`;
  const goodbyeUrl = `${webhookBase}/api/voice/tts?text=${encodeURIComponent('Thanks for calling RKV Consulting. Have a great day!')}`;

  let twiml: string;
  if (useElevenLabs) {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${webhookBase}/api/twilio/voice/respond?convo=${convoId}" method="POST" speechTimeout="2" language="en-US">
    <Play>${escapeXml(ttsUrl)}</Play>
  </Gather>
  <Play>${escapeXml(goodbyeUrl)}</Play>
</Response>`;
  } else {
    const escaped = escapeXml(aiResponse);
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${webhookBase}/api/twilio/voice/respond?convo=${convoId}" method="POST" speechTimeout="2" language="en-US">
    <Say voice="Polly.Joanna">${escaped}</Say>
  </Gather>
  <Say voice="Polly.Joanna">Thanks for calling RKV Consulting. Have a great day!</Say>
</Response>`;
  }

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
