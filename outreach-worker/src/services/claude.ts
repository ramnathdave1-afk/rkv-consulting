import Anthropic from '@anthropic-ai/sdk';
import type {
  OutreachLead,
  ClassificationResult,
  DeepAnalysisResult,
  ReplyClassification,
} from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('claude');

const client = new Anthropic();

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock?.text || '';
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      log.warn(`Claude API attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw lastError || new Error('Claude API call failed after retries');
}

/**
 * Generate a personalized AI first line for a lead's cold email.
 */
export async function generatePersonalization(lead: OutreachLead): Promise<string> {
  const system = `You are a cold email copywriter for RKV Consulting, an AI property management platform.
Generate a single personalized opening line (15-25 words) for a cold email.
The line should reference something specific about the lead's company.
Do NOT include any greeting or the recipient's name. Just the opening line.
Be natural, not salesy. Do not use emojis.`;

  const user = `Lead info:
- Name: ${lead.first_name} ${lead.last_name}
- Company: ${lead.company_name}
- Title: ${lead.title || 'Unknown'}
- City/State: ${lead.city || '?'}, ${lead.state || '?'}
- Unit Count: ${lead.unit_count || 'Unknown'}
- Current Software: ${lead.current_software || 'Unknown'}

Write a personalized opening line:`;

  const result = await callClaude(system, user, 100);
  log.info(`Generated personalization for lead ${lead.id}`);
  return result.trim();
}

/**
 * Classify a reply into a category.
 */
export async function classifyReply(
  replyText: string,
  originalSubject: string,
  leadInfo: { company_name: string; first_name: string }
): Promise<ClassificationResult> {
  const system = `You are an email reply classifier for a B2B SaaS outreach system.
Classify the reply into exactly ONE of these categories:
- interested: Shows interest, wants to learn more
- meeting_request: Wants to schedule a call/meeting
- question: Has questions but no clear interest signal
- not_now: Timing isn't right, maybe later
- not_interested: Clear rejection
- unsubscribe: Wants to be removed from list
- out_of_office: Auto-reply / OOO
- wrong_person: Not the right contact
- referral: Referring to someone else
- competitor: Already using a competitor
- already_have_solution: Happy with current solution
- spam: Spam or irrelevant
- bounce: Bounce notification

Respond ONLY with valid JSON: {"classification": "category", "confidence": 0.0-1.0, "reasoning": "brief reason"}`;

  const user = `Original subject: ${originalSubject}
Lead: ${leadInfo.first_name} at ${leadInfo.company_name}

Reply text:
${replyText}`;

  const result = await callClaude(system, user, 200);

  try {
    const parsed = JSON.parse(result);
    return {
      classification: parsed.classification as ReplyClassification,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  } catch {
    log.warn(`Failed to parse classification JSON, falling back to regex extraction`);
    // Try to extract classification from freeform text
    const categories: ReplyClassification[] = [
      'interested', 'meeting_request', 'question', 'not_now', 'not_interested',
      'unsubscribe', 'out_of_office', 'wrong_person', 'referral', 'competitor',
      'already_have_solution', 'spam', 'bounce',
    ];
    const found = categories.find((c) => result.toLowerCase().includes(c));
    return {
      classification: found || 'question',
      confidence: 0.5,
      reasoning: 'Fallback classification from text extraction',
    };
  }
}

/**
 * Deep analysis of a reply for sentiment, pain points, objections, buying signals.
 */
export async function analyzeReplyDeep(
  replyText: string,
  originalContext: string,
  leadInfo: { company_name: string; first_name: string; unit_count?: number }
): Promise<DeepAnalysisResult> {
  const system = `You are an expert B2B sales analyst for a property management AI platform.
Analyze the reply and return ONLY valid JSON with this structure:
{
  "sentiment_score": <-1.0 to 1.0>,
  "pain_points": ["list of pain points mentioned"],
  "objections": ["list of objections raised"],
  "buying_signals": ["list of buying signals detected"],
  "urgency": "low" | "medium" | "high",
  "suggested_reply": "A brief suggested response strategy (1-2 sentences)",
  "key_topics": ["key topics discussed"]
}`;

  const user = `Lead: ${leadInfo.first_name} at ${leadInfo.company_name} (${leadInfo.unit_count || '?'} units)

Our original outreach context:
${originalContext}

Their reply:
${replyText}

Analyze:`;

  const result = await callClaude(system, user, 500);

  try {
    return JSON.parse(result) as DeepAnalysisResult;
  } catch {
    log.warn('Failed to parse deep analysis JSON, returning defaults');
    return {
      sentiment_score: 0,
      pain_points: [],
      objections: [],
      buying_signals: [],
      urgency: 'low',
      suggested_reply: 'Follow up with a personalized response addressing their message.',
      key_topics: [],
    };
  }
}

/**
 * Draft a reply to a lead's response.
 */
export async function draftReply(
  lead: OutreachLead,
  replyContext: string,
  classification: ReplyClassification
): Promise<string> {
  const system = `You are a friendly, professional B2B sales rep for RKV Consulting, an AI-powered property management platform.
Draft a reply email based on the classification and context.

Rules:
- Keep under 100 words
- Be conversational, not salesy
- If interested/meeting_request: suggest a quick 15-min call, include cal link placeholder [CAL_LINK]
- If question: answer genuinely, then pivot to a call
- If not_now: acknowledge timing, ask to check back in a specific timeframe
- If objection: address it briefly, share a relevant insight
- Do not use emojis
- Sign off with just first name

Return ONLY the email body text (no subject line).`;

  const user = `Lead: ${lead.first_name} ${lead.last_name}, ${lead.title || ''} at ${lead.company_name}
Units: ${lead.unit_count || 'Unknown'}
Classification: ${classification}

Their reply:
${replyContext}

Draft reply:`;

  const result = await callClaude(system, user, 300);
  log.info(`Drafted reply for lead ${lead.id} (${classification})`);
  return result.trim();
}
