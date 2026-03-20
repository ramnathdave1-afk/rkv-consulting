/**
 * Sentiment Analysis + Escalation Triggers
 * Analyzes tenant message sentiment for escalation to human staff.
 * Uses Claude Haiku for fast, cheap classification.
 */

import { callClaude } from './claude';

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'angry';
  confidence: number;
  escalation_recommended: boolean;
  escalation_reason: string | null;
  keywords: string[];
}

const ESCALATION_KEYWORDS = [
  'lawyer', 'attorney', 'legal', 'sue', 'lawsuit', 'court',
  'health department', 'code violation', 'uninhabitable', 'unsafe',
  'discrimination', 'fair housing', 'harass',
  'emergency', 'flood', 'fire', 'gas leak',
  'police', 'threatening', 'danger',
  'media', 'news', 'review', 'yelp', 'google review',
  'withhold rent', 'rent strike', 'tenant union',
];

export function quickKeywordCheck(message: string): { hasEscalationKeyword: boolean; matchedKeywords: string[] } {
  const lower = message.toLowerCase();
  const matched = ESCALATION_KEYWORDS.filter((kw) => lower.includes(kw));
  return { hasEscalationKeyword: matched.length > 0, matchedKeywords: matched };
}

export async function analyzeSentiment(message: string): Promise<SentimentResult> {
  // Fast keyword check first
  const { hasEscalationKeyword, matchedKeywords } = quickKeywordCheck(message);

  if (hasEscalationKeyword) {
    return {
      sentiment: 'angry',
      confidence: 0.95,
      escalation_recommended: true,
      escalation_reason: `Escalation keywords detected: ${matchedKeywords.join(', ')}`,
      keywords: matchedKeywords,
    };
  }

  // Use Claude for deeper sentiment analysis
  const result = await callClaude(
    [{ role: 'user', content: message }],
    `Analyze this tenant/prospect message for sentiment and escalation need. Respond with ONLY JSON:

{
  "sentiment": "positive|neutral|negative|angry",
  "confidence": 0.0-1.0,
  "escalation_recommended": true/false,
  "escalation_reason": "reason or null",
  "keywords": ["relevant", "keywords"]
}

ESCALATE if: angry/threatening tone, mentions legal action, repeated complaints (3+ exchanges), health/safety concerns, fair housing language, or requests to speak with a manager/human.

Respond with ONLY the JSON.`
  );

  const text = Array.isArray(result?.content)
    ? result.content[0]?.text || ''
    : typeof result?.content === 'string'
      ? result.content
      : '';

  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      sentiment: parsed.sentiment || 'neutral',
      confidence: parsed.confidence || 0.5,
      escalation_recommended: parsed.escalation_recommended || false,
      escalation_reason: parsed.escalation_reason || null,
      keywords: parsed.keywords || [],
    };
  } catch {
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      escalation_recommended: false,
      escalation_reason: null,
      keywords: [],
    };
  }
}

export function shouldEscalate(
  sentiment: SentimentResult,
  exchangeCount: number
): { escalate: boolean; reason: string } {
  if (sentiment.escalation_recommended) {
    return { escalate: true, reason: sentiment.escalation_reason || 'AI flagged for escalation' };
  }
  if (sentiment.sentiment === 'angry') {
    return { escalate: true, reason: 'Angry sentiment detected' };
  }
  if (exchangeCount >= 3 && sentiment.sentiment === 'negative') {
    return { escalate: true, reason: '3+ exchanges with negative sentiment — escalating to human' };
  }
  return { escalate: false, reason: '' };
}
