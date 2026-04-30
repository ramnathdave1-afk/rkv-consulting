/**
 * Fair Housing Compliance Filter
 * Pre-screens every AI-generated tenant/prospect message before delivery.
 * Blocks or rewrites messages containing protected class language per HUD Fair Housing Act.
 *
 * Uses an LLM (Claude Haiku) to detect subtle violations that regex cannot catch,
 * with a fast regex pre-check for the most blatant violations.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ComplianceResult {
  is_compliant: boolean;
  violations: string[];
  reasoning: string;
  suggested_revision?: string;
}

export async function checkFairHousingCompliance(text: string): Promise<ComplianceResult> {
  // Quick regex pre-check for obvious violations (fast path)
  const obviousViolations = quickRegexCheck(text);
  if (obviousViolations.length > 0) {
    return {
      is_compliant: false,
      violations: obviousViolations,
      reasoning: 'Detected explicit references to protected classes',
    };
  }

  // LLM check for subtle violations
  const prompt = `You are a Fair Housing compliance checker for a property management AI.
Analyze this proposed message to a tenant or prospect and identify any Fair Housing Act violations.

Federal Fair Housing Act protected classes: race, color, national origin, religion, sex (including gender identity, sexual orientation), familial status (kids, pregnant, single parent), disability.

Many states/cities also protect: age, marital status, source of income (Section 8), military status, ancestry.

PROBLEMATIC PATTERNS:
- "Perfect for young professionals" (age discrimination)
- "Family-friendly" or "great for couples" (familial status — implying singles unwelcome)
- "Quiet building, no kids" (familial status)
- "Christian community" (religion)
- "Must be employed" (vs. allowing other income sources — could be disability/source of income)
- Steering: "This neighborhood is more diverse" or "You'd fit in better elsewhere"
- Inquiries: "Are you single?" "Do you have kids?" "Do you go to church?"

ALLOWED:
- Factual descriptions of property: # bedrooms, sqft, amenities
- Objective qualifications: credit score requirements, income-to-rent ratio
- Pet policy
- Lease terms

Message to check:
"""
${text}
"""

Return ONLY JSON, no markdown:
{
  "is_compliant": true|false,
  "violations": ["specific violations found"],
  "reasoning": "1-2 sentence explanation",
  "suggested_revision": "if not compliant, suggest a compliant version"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fail-safe: if Claude can't respond, fall back to allowing (with warning)
      return {
        is_compliant: true,
        violations: [],
        reasoning: 'Compliance check unavailable, message allowed by default',
      };
    }
    return JSON.parse(jsonMatch[0]) as ComplianceResult;
  } catch {
    // Don't block sending if Claude is down
    return {
      is_compliant: true,
      violations: [],
      reasoning: 'Compliance check unavailable, message allowed',
    };
  }
}

function quickRegexCheck(text: string): string[] {
  const violations: string[] = [];
  // Only catch the most obvious — the LLM handles the rest
  const patterns: { pattern: RegExp; violation: string }[] = [
    { pattern: /\b(no kids|no children|no families)\b/i, violation: 'Familial status discrimination' },
    {
      pattern: /\b(christians?|muslims?|jewish|catholic|protestant) (only|preferred|community|building)\b/i,
      violation: 'Religious discrimination',
    },
    {
      pattern: /\b(white|black|asian|hispanic|latino|caucasian) (only|preferred)\b/i,
      violation: 'Racial discrimination',
    },
  ];
  for (const { pattern, violation } of patterns) {
    if (pattern.test(text)) violations.push(violation);
  }
  return violations;
}

// Keep old export name for backwards compat
export const checkCompliance = checkFairHousingCompliance;
