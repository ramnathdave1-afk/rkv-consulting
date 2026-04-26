import { query, queryOne, execute } from '../services/supabase.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('re-engagement');

const MAX_RE_ENGAGEMENT_ATTEMPTS = 2;
const COOLDOWN_DAYS = 90;

/**
 * Re-engagement job. Runs daily at 10 AM EST.
 * Scans for leads matching re-engagement triggers and assigns them to
 * re-engagement sequences.
 */
export async function runReEngagement(): Promise<void> {
  log.info('Re-engagement job started');

  try {
    // Get the active re-engagement sequence
    const reEngagementSeq = await queryOne(
      `SELECT id FROM outreach_sequences
       WHERE type = $1 AND is_active = true
       LIMIT 1`,
      ['re_engagement']
    );

    if (!reEngagementSeq) {
      log.warn('No active re-engagement sequence found. Skipping.');
      return;
    }

    let totalEnrolled = 0;

    // 1. Ghost after reply (replied > 7 days ago, no call booked)
    totalEnrolled += await enrollGhostReplies(reEngagementSeq.id);

    // 2. Said "not now" (reschedule date reached)
    totalEnrolled += await enrollNotNowLeads(reEngagementSeq.id);

    // 3. Completed sequence, no reply (90 days elapsed)
    totalEnrolled += await enrollCompletedNoReply(reEngagementSeq.id);

    // 4. Demo no-show (5 days, no reschedule)
    totalEnrolled += await enrollDemoNoShows(reEngagementSeq.id);

    // 5. Closed lost - soft reasons (90 days, timing/budget)
    totalEnrolled += await enrollClosedLostSoft(reEngagementSeq.id);

    log.info(`Re-engagement complete. Total enrolled: ${totalEnrolled}`);
  } catch (error) {
    log.error(`Re-engagement job failed: ${error}`);
  }
}

/**
 * Ghost after reply: replied > 7 days ago, still in 'replied' status, no call booked.
 */
async function enrollGhostReplies(sequenceId: string): Promise<number> {
  const sevenDaysAgo = daysAgo(7);

  const { rows: leads } = await query(
    `SELECT * FROM outreach_leads
     WHERE status = $1
       AND updated_at <= $2
       AND stage != $3
     LIMIT 50`,
    ['replied', sevenDaysAgo, 'call_booked']
  );

  let count = 0;
  for (const lead of leads) {
    if (await canReEngage(lead)) {
      await enrollLead(lead.id, sequenceId, 'ghost_after_reply');
      count++;
    }
  }

  log.info(`Ghost replies: enrolled ${count} leads`);
  return count;
}

/**
 * Not now: leads who said "not now" and their cooldown/reschedule date has passed.
 */
async function enrollNotNowLeads(sequenceId: string): Promise<number> {
  const now = new Date().toISOString();

  // Find leads with 'not_now' classification replies where enough time has passed
  const { rows: replies } = await query(
    `SELECT lead_id FROM outreach_replies
     WHERE classification = $1 AND is_classified = true`,
    ['not_now']
  );

  if (replies.length === 0) return 0;

  const leadIds = [...new Set(replies.map((r) => r.lead_id))];
  let count = 0;

  for (const leadId of leadIds) {
    const lead = await queryOne(
      'SELECT * FROM outreach_leads WHERE id = $1',
      [leadId]
    );

    if (!lead) continue;

    // Check if cooldown has passed
    if (lead.cooldown_until && lead.cooldown_until > now) continue;

    if (await canReEngage(lead)) {
      await enrollLead(lead.id, sequenceId, 'not_now_followup');
      count++;
    }
  }

  log.info(`Not-now leads: enrolled ${count} leads`);
  return count;
}

/**
 * Completed sequence with no reply: 'dead' status, 90+ days since last activity.
 */
async function enrollCompletedNoReply(sequenceId: string): Promise<number> {
  const ninetyDaysAgo = daysAgo(90);

  const { rows: leads } = await query(
    `SELECT * FROM outreach_leads
     WHERE status = $1 AND updated_at <= $2
     LIMIT 50`,
    ['dead', ninetyDaysAgo]
  );

  let count = 0;
  for (const lead of leads) {
    // Confirm no replies exist
    const { rows: replies } = await query(
      'SELECT id FROM outreach_replies WHERE lead_id = $1 LIMIT 1',
      [lead.id]
    );

    if (replies.length > 0) continue; // Had a reply, different category

    if (await canReEngage(lead)) {
      await enrollLead(lead.id, sequenceId, 'completed_no_reply');
      count++;
    }
  }

  log.info(`Completed no-reply: enrolled ${count} leads`);
  return count;
}

/**
 * Demo no-show: call_booked stage, 5+ days, no progress to demo_completed.
 */
async function enrollDemoNoShows(sequenceId: string): Promise<number> {
  const fiveDaysAgo = daysAgo(5);

  const { rows: leads } = await query(
    `SELECT * FROM outreach_leads
     WHERE stage = $1 AND updated_at <= $2
     LIMIT 50`,
    ['call_booked', fiveDaysAgo]
  );

  let count = 0;
  for (const lead of leads) {
    // Check no reschedule task exists
    const { rows: tasks } = await query(
      `SELECT id FROM outreach_tasks
       WHERE lead_id = $1 AND type = 'reschedule' AND status = 'pending'
       LIMIT 1`,
      [lead.id]
    );

    if (tasks.length > 0) continue;

    if (await canReEngage(lead)) {
      await enrollLead(lead.id, sequenceId, 'demo_no_show');
      count++;
    }
  }

  log.info(`Demo no-shows: enrolled ${count} leads`);
  return count;
}

/**
 * Closed lost soft: timing/budget reasons, 90+ days ago.
 */
async function enrollClosedLostSoft(sequenceId: string): Promise<number> {
  const ninetyDaysAgo = daysAgo(90);

  const { rows: leads } = await query(
    `SELECT * FROM outreach_leads
     WHERE status = $1 AND updated_at <= $2
     LIMIT 50`,
    ['closed_lost', ninetyDaysAgo]
  );

  let count = 0;
  for (const lead of leads) {
    // Check for soft-close reasons (not_now, timing/budget objections)
    const { rows: replies } = await query(
      `SELECT classification, objections FROM outreach_replies
       WHERE lead_id = $1 AND is_classified = true
       ORDER BY received_at DESC
       LIMIT 1`,
      [lead.id]
    );

    if (replies.length === 0) continue;

    const lastReply = replies[0];
    const softReasons = ['not_now', 'not_interested'];
    const hasBudgetTiming =
      lastReply.objections?.some((o: string) =>
        /budget|timing|not the right time|too busy|later/i.test(o)
      ) || false;

    if (!softReasons.includes(lastReply.classification) && !hasBudgetTiming) continue;

    if (await canReEngage(lead)) {
      await enrollLead(lead.id, sequenceId, 'closed_lost_soft');
      count++;
    }
  }

  log.info(`Closed lost soft: enrolled ${count} leads`);
  return count;
}

// ─── Helpers ─────────────────────────────────────────────────────

async function canReEngage(lead: any): Promise<boolean> {
  // Max attempts check
  if (lead.re_engagement_count >= MAX_RE_ENGAGEMENT_ATTEMPTS) {
    log.debug(`Lead ${lead.id} exceeded max re-engagement attempts`);
    return false;
  }

  // Cooldown check
  if (lead.cooldown_until && new Date(lead.cooldown_until) > new Date()) {
    log.debug(`Lead ${lead.id} is in cooldown until ${lead.cooldown_until}`);
    return false;
  }

  // Skip certain statuses
  const skipStatuses = ['unsubscribed', 'bounced', 'do_not_contact', 'closed_won'];
  if (skipStatuses.includes(lead.status)) return false;

  return true;
}

async function enrollLead(
  leadId: string,
  sequenceId: string,
  trigger: string
): Promise<void> {
  const cooldownUntil = new Date();
  cooldownUntil.setDate(cooldownUntil.getDate() + COOLDOWN_DAYS);

  await execute(
    `UPDATE outreach_leads
     SET status = $1,
         sequence_id = $2,
         current_step = $3,
         next_send_at = $4,
         last_re_engagement_at = $5,
         cooldown_until = $6,
         updated_at = $7,
         re_engagement_count = re_engagement_count + 1
     WHERE id = $8`,
    [
      'in_sequence',
      sequenceId,
      1,
      addBusinessDays(new Date(), 1).toISOString(),
      new Date().toISOString(),
      cooldownUntil.toISOString(),
      new Date().toISOString(),
      leadId,
    ]
  );

  // Log the action
  await execute(
    `INSERT INTO outreach_hygiene_log (action, lead_id, details)
     VALUES ($1, $2, $3)`,
    ['re_engagement_enrolled', leadId, JSON.stringify({ trigger, sequence_id: sequenceId })]
  );

  log.info(`Enrolled lead ${leadId} in re-engagement (trigger: ${trigger})`);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}
