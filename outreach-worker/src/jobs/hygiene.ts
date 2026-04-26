import { query, queryOne, execute } from '../services/supabase.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('hygiene');

// Known competitor domains to flag
const COMPETITOR_DOMAINS = [
  'appfolio.com',
  'buildium.com',
  'yardi.com',
  'rentmanager.com',
  'doorloop.com',
  'realpage.com',
  'entrata.com',
  'propertyware.com',
  'rentvine.com',
  'innago.com',
  'tenantcloud.com',
];

/**
 * List hygiene job. Runs daily at 3 AM EST.
 * Cleans up bounced, dead, invalid, inactive, and competitor leads.
 */
export async function runHygiene(): Promise<void> {
  log.info('Hygiene job started');

  try {
    let actions = 0;

    // 1. Hard bounced -> bounced status + suppression
    actions += await handleHardBounces();

    // 2. 3 emails, 0 opens -> dead status
    actions += await handleNoOpens();

    // 3. Invalid emails -> unverified_dead
    actions += await handleInvalidEmails();

    // 4. 180 day inactive -> archived
    actions += await handleInactiveLeads();

    // 5. Competitor domain detection -> flag for review
    actions += await handleCompetitorDomains();

    log.info(`Hygiene job complete. Total actions: ${actions}`);
  } catch (error) {
    log.error(`Hygiene job failed: ${error}`);
  }
}

/**
 * Hard bounced emails -> set lead to bounced, add to suppression.
 */
async function handleHardBounces(): Promise<number> {
  const { rows: bounced } = await query(
    `SELECT lead_id FROM outreach_emails
     WHERE bounce_type = 'hard' AND status = 'bounced'`
  );

  if (bounced.length === 0) return 0;

  const leadIds = [...new Set(bounced.map((b) => b.lead_id))];
  let count = 0;

  for (const leadId of leadIds) {
    // Check if already handled
    const lead = await queryOne(
      'SELECT id, status, email FROM outreach_leads WHERE id = $1',
      [leadId]
    );

    if (!lead || lead.status === 'bounced') continue;

    await execute(
      `UPDATE outreach_leads
       SET status = 'bounced', next_send_at = NULL, updated_at = $1
       WHERE id = $2`,
      [new Date().toISOString(), leadId]
    );

    await logHygieneAction('hard_bounce_suppression', leadId, {
      email: lead.email,
      previous_status: lead.status,
    });

    count++;
  }

  if (count > 0) log.info(`Suppressed ${count} hard-bounced leads`);
  return count;
}

/**
 * Leads with 3+ sent emails and 0 opens -> dead status.
 */
async function handleNoOpens(): Promise<number> {
  // Find leads with 3+ emails sent
  const { rows: leads } = await query(
    `SELECT id, email, status FROM outreach_leads
     WHERE status = 'in_sequence' AND current_step >= 3`
  );

  if (leads.length === 0) return 0;

  let count = 0;

  for (const lead of leads) {
    // Check if any emails were opened
    const openedResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE lead_id = $1 AND opened_at IS NOT NULL`,
      [lead.id]
    );

    if (parseInt(openedResult?.count || '0', 10) > 0) continue;

    // Confirm 3+ emails sent
    const sentResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE lead_id = $1 AND status = 'sent'`,
      [lead.id]
    );

    const sentCount = parseInt(sentResult?.count || '0', 10);
    if (sentCount < 3) continue;

    await execute(
      `UPDATE outreach_leads
       SET status = 'dead', next_send_at = NULL, updated_at = $1
       WHERE id = $2`,
      [new Date().toISOString(), lead.id]
    );

    await logHygieneAction('no_opens_dead', lead.id, {
      emails_sent: sentCount,
      emails_opened: 0,
    });

    count++;
  }

  if (count > 0) log.info(`Marked ${count} leads as dead (no opens)`);
  return count;
}

/**
 * Leads with invalid email format or verification failure -> unverified_dead.
 */
async function handleInvalidEmails(): Promise<number> {
  // Basic email format validation
  const { rows: leads } = await query(
    `SELECT id, email, status FROM outreach_leads
     WHERE status NOT IN ('bounced', 'unverified_dead', 'archived', 'do_not_contact')
     LIMIT 500`
  );

  if (leads.length === 0) return 0;

  let count = 0;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const lead of leads) {
    if (emailRegex.test(lead.email)) continue;

    await execute(
      `UPDATE outreach_leads
       SET status = 'unverified_dead', next_send_at = NULL, updated_at = $1
       WHERE id = $2`,
      [new Date().toISOString(), lead.id]
    );

    await logHygieneAction('invalid_email', lead.id, { email: lead.email });
    count++;
  }

  if (count > 0) log.info(`Marked ${count} leads as unverified_dead (invalid email)`);
  return count;
}

/**
 * Leads inactive for 180+ days -> archived.
 */
async function handleInactiveLeads(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 180);

  const { rows: leads } = await query(
    `SELECT id, status FROM outreach_leads
     WHERE updated_at <= $1
       AND status NOT IN ('archived', 'closed_won', 'do_not_contact')
     LIMIT 200`,
    [cutoffDate.toISOString()]
  );

  if (leads.length === 0) return 0;

  let count = 0;

  for (const lead of leads) {
    await execute(
      `UPDATE outreach_leads
       SET status = 'archived', next_send_at = NULL, updated_at = $1
       WHERE id = $2`,
      [new Date().toISOString(), lead.id]
    );

    await logHygieneAction('inactive_archived', lead.id, {
      previous_status: lead.status,
      days_inactive: 180,
    });

    count++;
  }

  if (count > 0) log.info(`Archived ${count} leads (180+ days inactive)`);
  return count;
}

/**
 * Detect leads with competitor email domains -> flag for review.
 */
async function handleCompetitorDomains(): Promise<number> {
  let count = 0;

  for (const domain of COMPETITOR_DOMAINS) {
    const { rows: leads } = await query(
      `SELECT id, email, tags FROM outreach_leads
       WHERE email ILIKE $1
         AND status NOT IN ('do_not_contact', 'archived')`,
      [`%@${domain}`]
    );

    for (const lead of leads) {
      const tags = lead.tags || [];
      if (tags.includes('competitor_domain')) continue;

      await execute(
        `UPDATE outreach_leads
         SET tags = $1, updated_at = $2
         WHERE id = $3`,
        [[...tags, 'competitor_domain'], new Date().toISOString(), lead.id]
      );

      await logHygieneAction('competitor_domain_flagged', lead.id, {
        email: lead.email,
        domain,
      });

      count++;
    }
  }

  if (count > 0) log.info(`Flagged ${count} leads with competitor domains`);
  return count;
}

// ─── Helpers ─────────────────────────────────────────────────────

async function logHygieneAction(
  action: string,
  leadId: string,
  details: Record<string, unknown>
): Promise<void> {
  await execute(
    `INSERT INTO outreach_hygiene_log (action, lead_id, details)
     VALUES ($1, $2, $3)`,
    [action, leadId, JSON.stringify(details)]
  );
}
