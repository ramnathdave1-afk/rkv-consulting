import { query, queryOne, execute } from '../services/supabase.js';
import { createModuleLogger } from '../utils/logger.js';
import type { ReplyClassification } from '../types/index.js';

const log = createModuleLogger('task-generator');

/**
 * Auto-create tasks based on lead activity. Runs every hour.
 */
export async function generateTasks(): Promise<void> {
  log.info('Task-generator job started');

  try {
    let tasksCreated = 0;

    // 1. Replies with "call me" language -> follow_up_call task
    tasksCreated += await createCallTasks();

    // 2. Replies with timing language -> reschedule task
    tasksCreated += await createRescheduleTasks();

    // 3. Call booked > 3 days with no demo -> follow_up_call
    tasksCreated += await createCallBookedFollowups();

    // 4. Pilot stage -> send_proposal task
    tasksCreated += await createPilotProposalTasks();

    log.info(`Task-generator complete. Tasks created: ${tasksCreated}`);
  } catch (error) {
    log.error(`Task-generator job failed: ${error}`);
  }
}

/**
 * Create follow-up call tasks for replies requesting calls.
 */
async function createCallTasks(): Promise<number> {
  const { rows: replies } = await query(
    `SELECT id, lead_id, body_text, classification FROM outreach_replies
     WHERE is_classified = true
       AND classification = $1
       AND received_at >= $2
     LIMIT 50`,
    ['meeting_request', getHoursAgo(2)]
  );

  if (replies.length === 0) return 0;

  let count = 0;
  for (const reply of replies) {
    // Check for call-related language
    const callKeywords = ['call me', 'give me a call', 'phone call', 'ring me', 'schedule a call'];
    const hasCallLanguage = callKeywords.some((kw) =>
      reply.body_text.toLowerCase().includes(kw)
    );

    if (!hasCallLanguage && reply.classification !== 'meeting_request') continue;

    // Check if task already exists
    const existing = await taskExists(reply.lead_id, 'follow_up_call');
    if (existing) continue;

    // Get lead info for task title
    const lead = await queryOne(
      'SELECT first_name, company_name FROM outreach_leads WHERE id = $1',
      [reply.lead_id]
    );

    try {
      await execute(
        `INSERT INTO outreach_tasks (lead_id, type, title, description, due_date, priority, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          reply.lead_id,
          'follow_up_call',
          `Call ${lead?.first_name || 'Lead'} at ${lead?.company_name || 'Company'} - Requested call`,
          'Lead requested a phone call in their reply.',
          new Date().toISOString(),
          'urgent',
          'pending',
        ]
      );
      count++;
    } catch {
      // insert failed, skip
    }
  }

  return count;
}

/**
 * Create reschedule tasks for timing-related replies.
 */
async function createRescheduleTasks(): Promise<number> {
  const { rows: replies } = await query(
    `SELECT id, lead_id, body_text, classification FROM outreach_replies
     WHERE is_classified = true
       AND classification = $1
       AND received_at >= $2
     LIMIT 50`,
    ['not_now', getHoursAgo(2)]
  );

  if (replies.length === 0) return 0;

  let count = 0;
  for (const reply of replies) {
    const existing = await taskExists(reply.lead_id, 'reschedule');
    if (existing) continue;

    // Try to extract timing from reply
    const timingMatch = extractTiming(reply.body_text);

    const lead = await queryOne(
      'SELECT first_name, company_name FROM outreach_leads WHERE id = $1',
      [reply.lead_id]
    );

    const dueDate = timingMatch || addDays(new Date(), 14);

    try {
      await execute(
        `INSERT INTO outreach_tasks (lead_id, type, title, description, due_date, priority, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          reply.lead_id,
          'reschedule',
          `Reschedule outreach to ${lead?.first_name || 'Lead'} at ${lead?.company_name || 'Company'}`,
          `Lead indicated timing isn't right. Follow up around ${dueDate.toLocaleDateString()}.`,
          dueDate.toISOString(),
          'medium',
          'pending',
        ]
      );
      count++;
    } catch {
      // insert failed, skip
    }
  }

  return count;
}

/**
 * Create follow-up tasks for call_booked leads with no demo after 3 days.
 */
async function createCallBookedFollowups(): Promise<number> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { rows: leads } = await query(
    `SELECT id, first_name, company_name, stage, updated_at FROM outreach_leads
     WHERE stage = $1 AND updated_at <= $2
     LIMIT 50`,
    ['call_booked', threeDaysAgo.toISOString()]
  );

  if (leads.length === 0) return 0;

  let count = 0;
  for (const lead of leads) {
    // Check they haven't moved to demo_completed
    if (lead.stage !== 'call_booked') continue;

    const existing = await taskExists(lead.id, 'follow_up_call');
    if (existing) continue;

    try {
      await execute(
        `INSERT INTO outreach_tasks (lead_id, type, title, description, due_date, priority, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          lead.id,
          'follow_up_call',
          `Follow up with ${lead.first_name} at ${lead.company_name} - Call booked 3+ days ago`,
          'Call was booked but no demo has been completed. Follow up to confirm.',
          new Date().toISOString(),
          'high',
          'pending',
        ]
      );
      count++;
    } catch {
      // insert failed, skip
    }
  }

  return count;
}

/**
 * Create send_proposal tasks for leads in pilot stage.
 */
async function createPilotProposalTasks(): Promise<number> {
  const { rows: leads } = await query(
    `SELECT id, first_name, company_name, stage FROM outreach_leads
     WHERE stage = $1
     LIMIT 50`,
    ['pilot']
  );

  if (leads.length === 0) return 0;

  let count = 0;
  for (const lead of leads) {
    const existing = await taskExists(lead.id, 'send_proposal');
    if (existing) continue;

    try {
      await execute(
        `INSERT INTO outreach_tasks (lead_id, type, title, description, due_date, priority, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          lead.id,
          'send_proposal',
          `Send proposal to ${lead.first_name} at ${lead.company_name}`,
          'Lead is in pilot stage. Prepare and send a formal proposal.',
          addDays(new Date(), 1).toISOString(),
          'high',
          'pending',
        ]
      );
      count++;
    } catch {
      // insert failed, skip
    }
  }

  return count;
}

// ─── Helpers ─────────────────────────────────────────────────────

async function taskExists(leadId: string, type: string): Promise<boolean> {
  const data = await queryOne(
    `SELECT id FROM outreach_tasks
     WHERE lead_id = $1 AND type = $2 AND status = 'pending'
     LIMIT 1`,
    [leadId, type]
  );

  return !!data;
}

function getHoursAgo(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Try to extract a follow-up date from reply text.
 * Looks for patterns like "next quarter", "after summer", "in 2 weeks", etc.
 */
function extractTiming(text: string): Date | null {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('next quarter') || lower.includes('q2') || lower.includes('q3') || lower.includes('q4')) {
    return addDays(now, 90);
  }
  if (lower.includes('next month')) return addDays(now, 30);
  if (lower.includes('next week')) return addDays(now, 7);
  if (lower.includes('couple weeks') || lower.includes('two weeks') || lower.includes('2 weeks')) {
    return addDays(now, 14);
  }
  if (lower.includes('after summer') || lower.includes('fall')) return addDays(now, 120);
  if (lower.includes('end of year') || lower.includes('eoy')) return addDays(now, 180);
  if (lower.includes('few months') || lower.includes('couple months')) return addDays(now, 60);

  const weeksMatch = lower.match(/in\s+(\d+)\s+weeks?/);
  if (weeksMatch) return addDays(now, parseInt(weeksMatch[1]) * 7);

  const monthsMatch = lower.match(/in\s+(\d+)\s+months?/);
  if (monthsMatch) return addDays(now, parseInt(monthsMatch[1]) * 30);

  return null;
}
