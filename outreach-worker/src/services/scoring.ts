import type {
  OutreachLead,
  OutreachEmail,
  OutreachReply,
  ScoreResult,
} from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('scoring');

/**
 * Calculate a 0-100 lead score based on multiple weighted factors.
 */
export function calculateLeadScore(
  lead: OutreachLead,
  emails: OutreachEmail[],
  replies: OutreachReply[]
): ScoreResult {
  const companySize = scoreCompanySize(lead.unit_count);
  const engagement = scoreEngagement(emails, replies);
  const replySentiment = scoreReplySentiment(replies);
  const titleSeniority = scoreTitleSeniority(lead.title);
  const timingSignals = scoreTimingSignals(emails, replies);

  const score = Math.min(
    100,
    companySize + engagement + replySentiment + titleSeniority + timingSignals
  );

  let temperature: 'hot' | 'warm' | 'cold';
  if (score >= 70) temperature = 'hot';
  else if (score >= 40) temperature = 'warm';
  else temperature = 'cold';

  log.debug(`Lead ${lead.id} scored ${score} (${temperature})`, {
    companySize,
    engagement,
    replySentiment,
    titleSeniority,
    timingSignals,
  });

  return {
    score,
    temperature,
    components: {
      company_size: companySize,
      engagement,
      reply_sentiment: replySentiment,
      title_seniority: titleSeniority,
      timing_signals: timingSignals,
    },
  };
}

/** Company size scoring (25 pts max) */
function scoreCompanySize(unitCount?: number): number {
  if (!unitCount) return 5; // Unknown gets small base
  if (unitCount >= 250) return 25;
  if (unitCount >= 100) return 18;
  if (unitCount >= 50) return 10;
  if (unitCount >= 20) return 5;
  return 2;
}

/** Engagement scoring (25 pts max) */
function scoreEngagement(emails: OutreachEmail[], replies: OutreachReply[]): number {
  let score = 0;

  // Has opened any email
  const hasOpened = emails.some((e) => e.opened_at);
  if (hasOpened) score += 5;

  // Has replied
  if (replies.length > 0) score += 15;

  // Has a positive reply
  const positiveClassifications = ['interested', 'meeting_request', 'question', 'referral'];
  const hasPositive = replies.some(
    (r) => r.classification && positiveClassifications.includes(r.classification)
  );
  if (hasPositive) score = 25; // Override to max

  return Math.min(25, score);
}

/** Reply sentiment scoring (25 pts max) */
function scoreReplySentiment(replies: OutreachReply[]): number {
  if (replies.length === 0) return 0;

  // Use the most recent reply with a sentiment score
  const repliesWithSentiment = replies
    .filter((r) => r.sentiment_score != null)
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());

  if (repliesWithSentiment.length === 0) return 5; // Has replies but no sentiment scored

  const latestSentiment = repliesWithSentiment[0].sentiment_score!;

  // sentiment_score is -1.0 to 1.0, map to 0-25
  // -1.0 -> 0, 0.0 -> 12.5, 1.0 -> 25
  return Math.round(((latestSentiment + 1) / 2) * 25);
}

/** Title/seniority scoring (15 pts max) */
function scoreTitleSeniority(title?: string): number {
  if (!title) return 3;

  const normalized = title.toLowerCase();

  // Owner / C-suite
  if (
    normalized.includes('owner') ||
    normalized.includes('ceo') ||
    normalized.includes('president') ||
    normalized.includes('founder') ||
    normalized.includes('principal')
  ) {
    return 15;
  }

  // VP / Director
  if (
    normalized.includes('vp') ||
    normalized.includes('vice president') ||
    normalized.includes('director')
  ) {
    return 12;
  }

  // Manager
  if (
    normalized.includes('manager') ||
    normalized.includes('head of') ||
    normalized.includes('lead')
  ) {
    return 8;
  }

  // Other known titles
  if (
    normalized.includes('coordinator') ||
    normalized.includes('specialist') ||
    normalized.includes('assistant')
  ) {
    return 5;
  }

  return 3;
}

/** Timing signals scoring (10 pts max) */
function scoreTimingSignals(emails: OutreachEmail[], replies: OutreachReply[]): number {
  if (replies.length === 0 || emails.length === 0) return 0;

  // Find the earliest reply and the email it responded to
  const sortedReplies = [...replies].sort(
    (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
  );
  const firstReply = sortedReplies[0];

  // Find the email this reply was responding to
  const matchedEmail = firstReply.email_id
    ? emails.find((e) => e.id === firstReply.email_id)
    : emails.sort(
        (a, b) => new Date(b.sent_at || b.created_at).getTime() - new Date(a.sent_at || a.created_at).getTime()
      )[0];

  if (!matchedEmail?.sent_at) return 2;

  const sentTime = new Date(matchedEmail.sent_at).getTime();
  const replyTime = new Date(firstReply.received_at).getTime();
  const diffHours = (replyTime - sentTime) / (1000 * 60 * 60);

  if (diffHours <= 1) return 10;   // Within 1 hour
  if (diffHours <= 8) return 7;    // Same business day
  if (diffHours <= 24) return 4;   // Next day
  if (diffHours <= 72) return 2;   // Within 3 days

  return 0;
}
