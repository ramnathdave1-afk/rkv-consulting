/**
 * Fair Housing Compliance Filter
 * Pre-screens every AI-generated tenant/prospect message before delivery.
 * Blocks or rewrites messages containing protected class language per HUD Fair Housing Act.
 */

// Protected class categories per Fair Housing Act
const PROTECTED_CLASS_PATTERNS: { category: string; patterns: RegExp[] }[] = [
  {
    category: 'race',
    patterns: [
      /\b(white|black|african.?american|asian|hispanic|latino|latina|caucasian)\s+(neighborhood|area|community|tenant|resident|people|family|families)\b/i,
      /\b(racial|ethnicity|ethnic)\s+(preference|requirement|restriction)\b/i,
    ],
  },
  {
    category: 'religion',
    patterns: [
      /\b(christian|muslim|jewish|hindu|buddhist|catholic|protestant)\s+(neighborhood|area|community|tenant|resident)\b/i,
      /\b(church|mosque|synagogue|temple)\s+(nearby|close|walking distance)\b/i,
    ],
  },
  {
    category: 'national_origin',
    patterns: [
      /\b(where are you from|what country|speak english|english.?only|citizen|immigration status)\b/i,
      /\b(foreign|immigrant|undocumented)\s+(tenant|resident|applicant)\b/i,
    ],
  },
  {
    category: 'sex',
    patterns: [
      /\b(male.?only|female.?only|single (men|women|males|females) only|gender.?preference)\b/i,
      /\b(sexual orientation|gay|lesbian|transgender)\s+(restriction|preference|policy)\b/i,
    ],
  },
  {
    category: 'familial_status',
    patterns: [
      /\b(no (kids|children|babies|minors))\b/i,
      /\b(adults?.?only|no families|child.?free|single.?only)\b/i,
      /\b(pregnant|expecting|maternity)\s+(not allowed|restricted|prohibited)\b/i,
    ],
  },
  {
    category: 'disability',
    patterns: [
      /\b(handicapped|disabled|wheelchair|mental illness|psychiatric)\s+(not allowed|restricted|prohibited|cannot)\b/i,
      /\b(no (disabled|handicapped|wheelchairs|service animals|emotional support))\b/i,
    ],
  },
];

// Steering language — suggesting or discouraging based on demographics
const STEERING_PATTERNS: RegExp[] = [
  /\b(you (would|might|wouldn't) (like|enjoy|fit in|feel comfortable))\b/i,
  /\b(people like you|your kind|your type)\b/i,
  /\b(not (right|suitable|good) for (you|your family|someone like))\b/i,
  /\b(better suited|more appropriate) (neighborhood|area|community)\b/i,
];

export interface ComplianceResult {
  passed: boolean;
  violations: ComplianceViolation[];
  original_message: string;
}

export interface ComplianceViolation {
  category: string;
  matched_text: string;
  pattern_description: string;
}

export function checkCompliance(message: string): ComplianceResult {
  const violations: ComplianceViolation[] = [];

  // Check protected class patterns
  for (const group of PROTECTED_CLASS_PATTERNS) {
    for (const pattern of group.patterns) {
      const match = message.match(pattern);
      if (match) {
        violations.push({
          category: group.category,
          matched_text: match[0],
          pattern_description: `Protected class reference: ${group.category}`,
        });
      }
    }
  }

  // Check steering patterns
  for (const pattern of STEERING_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      violations.push({
        category: 'steering',
        matched_text: match[0],
        pattern_description: 'Potential steering language',
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    original_message: message,
  };
}
