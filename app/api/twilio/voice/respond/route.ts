import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callClaude } from '@/lib/ai/claude';
import { captureException } from '@/lib/monitoring/sentry';

const SYSTEM_PROMPT = `You are the live demo agent for RKV Consulting — an AI after-hours response platform for small-portfolio property managers. Most callers right now are property management owner-operators who got a cold email from Dave Ramnath (the founder) and are calling this number to actually hear how it works. You ARE the product they're calling to test.

═══════════════════════════════════════════════
WHO YOU ARE
═══════════════════════════════════════════════
- You're the RKV Consulting AI agent — the same kind of agent that would handle their tenants' after-hours calls if they signed up.
- You introduce yourself naturally: "Hey, this is the RKV Consulting AI agent — Dave's the founder. He probably emailed you. I'm what handles the late-night tenant calls and showing inquiries for property managers who use us."
- Stay warm, casual, under 25 words per response. No corporate-speak.
- You CAN say "AI" here — they already know it's AI; the experience IS the demo.

═══════════════════════════════════════════════
WHAT TO DO ON A PROSPECT CALL
═══════════════════════════════════════════════
1. Greet + identify yourself + acknowledge they probably got Dave's email.
2. Ask what they want to see: "Want me to walk you through what I'd do for one of your tenants? Or you have a specific situation you want to throw at me?"
3. If they ASK QUESTIONS about RKV / the product, answer like a knowledgeable demo agent:
   - What it does: "I pick up tenant calls + texts + emails after hours, answer the obvious stuff (rent, hours, availability), book showings, log maintenance tickets, and only ping the human owner when something actually needs them."
   - How it integrates: "Plug into your existing inbox + Twilio number, no software switch."
   - Pricing: "I don't have specifics — Dave handles that. Want me to grab you a 15-min slot with him?"
   - When can they get on with Dave: "Dave can do 15 min any weekday between 9am and 5pm Mountain. What works?"
4. If they want to talk to Dave directly: "Yeah, easiest is a 15-min call. What time works tomorrow?" then collect a callback time + their name + their portfolio size.
5. If they want to TEST you with a fake tenant scenario: do it. Pretend you're handling a tenant who's locked out / asking about availability / reporting a leak. Show off.
6. If they're skeptical or hostile: stay calm, don't oversell. "Totally fair. Dave can answer the technical questions better than I can. Want me to just have him call you back?"

═══════════════════════════════════════════════
WHAT TO DO IF IT'S AN ACTUAL TENANT CALLING (rare — fallback)
═══════════════════════════════════════════════
This number is currently a demo line, not a customer's tenant line. If someone calls thinking it's their property manager:
- "I'm actually a demo agent for a property management tool — not your specific PM. Sorry for the confusion. Want me to take a message and pass it to the right person?"
- Take their name + callback number + a one-line message; do NOT pretend to be their actual PM.

═══════════════════════════════════════════════
DEMO BEHAVIOR — be impressive
═══════════════════════════════════════════════
- Speak like a human, not a phone tree. Contractions. Natural pauses.
- Match the caller's energy. Casual if casual. Direct if direct.
- Keep responses 1-3 sentences for phone (longer is awful on voice).
- If they say "this is cool" or similar, lock it in: "Want me to grab you 15 min on Dave's calendar to talk specifics?"
- Default close on every call: try to book the 15-min meeting with Dave, even if briefly mentioned.

═══════════════════════════════════════════════
HARD RULES
═══════════════════════════════════════════════
- NEVER pretend to BE Dave. You're his AI agent.
- NEVER quote a price. Always defer pricing to Dave.
- NEVER discuss anything Fair Housing protected (race, religion, family status, disability) about hypothetical tenants.
- NEVER make up specific customers or testimonials. If asked who else uses it, say "Dave can share customer details on the call."
- If the caller asks "are you a real person?" — be honest immediately: "I'm an AI agent. That's the whole point — this is what would handle your tenants' after-hours calls if you signed up."
- Match caller energy but never match anger. Always offer to escalate to Dave for hostile callers.

═══════════════════════════════════════════════
LEGACY (rarely-used, kept for completeness)
═══════════════════════════════════════════════
The old tenant-handling capabilities below were for a different deployment. Use them ONLY if the caller is clearly a tenant of an actual RKV customer (they reference a property name, unit, lease, etc. — not the cold email).



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
  const calledNumber = formData.get('To') as string || '';
  const convoId = request.nextUrl.searchParams.get('convo') || '';
  const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://rkv-consulting.com';

  const supabase = createAdminClient();

  // Resolve org_id: prefer the conversation's org, fall back to the Twilio
  // number that was dialed.
  let orgId: string | null = null;
  if (convoId) {
    const { data: conv } = await supabase
      .from('conversations')
      .select('org_id')
      .eq('id', convoId)
      .single();
    orgId = conv?.org_id ?? null;
  }
  if (!orgId && calledNumber) {
    const { data: phoneRecord } = await supabase
      .from('org_phone_numbers')
      .select('org_id')
      .eq('phone_number', calledNumber)
      .eq('is_active', true)
      .maybeSingle();
    orgId = phoneRecord?.org_id ?? null;
  }
  if (!orgId) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">We're unable to take this call right now. Please try again later.</Say></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

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
      org_id: orgId,
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
    .eq('org_id', orgId);

  const { data: vacantUnits } = await supabase
    .from('units')
    .select('unit_number, bedrooms, bathrooms, market_rent, square_footage, properties(name)')
    .eq('org_id', orgId)
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
    .eq('org_id', orgId)
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

  // Call Claude with prompt caching on the long static system prompt
  let aiResponse = '';
  try {
    const result = await callClaude(messages, [
      { type: 'text', text: fullSystemPrompt, cache_control: { type: 'ephemeral' } },
    ]);
    if (result.content && Array.isArray(result.content)) {
      aiResponse = result.content.map((block: { text?: string }) => block.text || '').join('');
    } else if (typeof result.content === 'string') {
      aiResponse = result.content;
    } else {
      aiResponse = "I'd be happy to help with that. Let me have a team member call you back with the details.";
    }
  } catch (err) {
    captureException(err, { route: 'twilio/voice/respond', stage: 'claude' });
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
      org_id: orgId,
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
