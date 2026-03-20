/**
 * AI Leasing Agent
 * Handles inbound tenant/prospect messages with intelligent responses.
 * Qualifies leads, answers FAQs, schedules showings, and handles renewals.
 */

import { callClaude } from './claude';
import { checkCompliance } from './compliance-filter';
import { createAdminClient } from '@/lib/supabase/admin';

export interface LeasingAgentContext {
  orgId: string;
  conversationId: string;
  participantPhone: string;
  propertyId?: string;
  tenantId?: string;
}

interface ConversationMessage {
  role: string;
  content: string;
}

function buildSystemPrompt(orgName: string, properties: PropertyInfo[]): string {
  const propertyList = properties.map((p) =>
    `- ${p.name}: ${p.address}, ${p.city}, ${p.state} ${p.zip} (${p.unit_count} units, ${p.property_type.replace('_', ' ')})`
  ).join('\n');

  const availableUnits = properties.flatMap((p) =>
    (p.vacant_units || []).map((u) =>
      `  - ${p.name} Unit ${u.unit_number}: ${u.bedrooms}bd/${u.bathrooms}ba, $${u.market_rent}/mo`
    )
  ).join('\n');

  return `You are the AI leasing assistant for ${orgName}, a property management company. You handle tenant and prospect communications via SMS.

PROPERTIES MANAGED:
${propertyList || 'No properties loaded yet.'}

AVAILABLE UNITS:
${availableUnits || 'No vacant units currently.'}

YOUR RESPONSIBILITIES:
1. Answer questions about available units, pricing, pet policies, lease terms, and application process
2. Qualify leads by asking about: desired move-in date, bedroom preference, monthly budget, and income
3. Schedule property showings when a prospect is qualified
4. Handle basic tenant requests and route complex issues to staff
5. Initiate lease renewal conversations when directed

COMMUNICATION RULES:
- Be friendly, professional, and concise (SMS format — keep responses under 320 characters when possible)
- NEVER discuss or reference race, religion, national origin, sex, familial status, or disability
- NEVER steer prospects toward or away from specific neighborhoods or properties based on demographics
- NEVER ask about immigration status, citizenship, or country of origin
- If asked about demographics of an area, respond: "I can share details about the property and amenities. For neighborhood information, I recommend visiting the area."
- If you cannot answer a question, say you'll have a team member follow up
- Always include the property name when discussing specific units
- Use natural conversational tone appropriate for text messaging

LEAD QUALIFICATION FLOW:
1. Greet and ask what they're looking for (bedrooms, budget, move-in date)
2. Match to available units
3. If match found, offer to schedule a showing
4. If no match, offer to add them to a waitlist
5. Collect their name and email for follow-up

NEVER make up information about units, pricing, or policies you don't have.`;
}

interface PropertyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  unit_count: number;
  property_type: string;
  vacant_units?: { unit_number: string; bedrooms: number; bathrooms: number; market_rent: number }[];
}

async function getOrgContext(orgId: string): Promise<{ orgName: string; properties: PropertyInfo[] }> {
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, address_line1, city, state, zip, unit_count, property_type')
    .eq('org_id', orgId);

  const propertyInfos: PropertyInfo[] = [];

  for (const p of (properties || [])) {
    const { data: vacantUnits } = await supabase
      .from('units')
      .select('unit_number, bedrooms, bathrooms, market_rent')
      .eq('property_id', p.id)
      .eq('status', 'vacant')
      .order('unit_number');

    propertyInfos.push({
      name: p.name,
      address: p.address_line1,
      city: p.city,
      state: p.state,
      zip: p.zip,
      unit_count: p.unit_count,
      property_type: p.property_type,
      vacant_units: (vacantUnits || []).map((u) => ({
        unit_number: u.unit_number,
        bedrooms: u.bedrooms || 0,
        bathrooms: Number(u.bathrooms) || 1,
        market_rent: Number(u.market_rent) || 0,
      })),
    });
  }

  return { orgName: org?.name || 'the property management company', properties: propertyInfos };
}

async function getConversationHistory(conversationId: string, limit = 20): Promise<ConversationMessage[]> {
  const supabase = createAdminClient();

  const { data: messages } = await supabase
    .from('messages')
    .select('direction, sender_type, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  return (messages || []).map((m) => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content,
  }));
}

export async function generateLeasingResponse(
  context: LeasingAgentContext,
  inboundMessage: string
): Promise<{ response: string; blocked: boolean; violations?: string[] }> {
  // Get org context (properties, units)
  const { orgName, properties } = await getOrgContext(context.orgId);

  // Get conversation history
  const history = await getConversationHistory(context.conversationId);

  // Build messages array for Claude
  const systemPrompt = buildSystemPrompt(orgName, properties);
  const messages = [
    ...history,
    { role: 'user', content: inboundMessage },
  ];

  // Call Claude
  const result = await callClaude(messages, systemPrompt);

  if (result.error || !result.content) {
    return {
      response: "Thanks for reaching out! A team member will get back to you shortly.",
      blocked: false,
    };
  }

  // Extract text from Claude response
  const aiText = Array.isArray(result.content)
    ? result.content.map((block: { text?: string }) => block.text || '').join('')
    : typeof result.content === 'string'
      ? result.content
      : '';

  // Run compliance filter
  const compliance = checkCompliance(aiText);

  if (!compliance.passed) {
    // Log the violation
    const supabase = createAdminClient();
    await supabase.from('messages').insert({
      conversation_id: context.conversationId,
      org_id: context.orgId,
      direction: 'outbound',
      sender_type: 'system',
      content: `[COMPLIANCE BLOCKED] Original AI response violated fair housing rules: ${compliance.violations.map((v) => v.category).join(', ')}`,
      channel: 'sms',
      status: 'failed',
      metadata: { compliance_violations: compliance.violations },
    });

    return {
      response: "Thanks for your message! A team member will follow up with you shortly.",
      blocked: true,
      violations: compliance.violations.map((v) => `${v.category}: ${v.matched_text}`),
    };
  }

  return { response: aiText, blocked: false };
}

export async function classifyIntent(message: string): Promise<string> {
  const result = await callClaude(
    [{ role: 'user', content: message }],
    `Classify this tenant/prospect message into exactly ONE category. Respond with only the category name, nothing else.

Categories:
- tour_scheduling (wants to see a unit or schedule a showing)
- availability_inquiry (asking about available units, pricing, features)
- lease_question (questions about lease terms, policies, pet policy, parking)
- maintenance_request (reporting a broken/damaged item, requesting repair)
- rent_payment (questions about rent, payment methods, late fees)
- lease_renewal (about renewing or extending their lease)
- complaint (noise, neighbor issues, management complaints)
- general_inquiry (anything else)

Message: "${message}"`
  );

  const text = Array.isArray(result?.content)
    ? result.content[0]?.text || 'general_inquiry'
    : 'general_inquiry';

  return text.trim().toLowerCase();
}
