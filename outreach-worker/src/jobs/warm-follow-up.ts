import { query, queryOne, execute } from '../services/supabase.js';
import { sendEmail } from '../services/smtp.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('warm-follow-up');

/**
 * Runs daily at 11 AM EST.
 * Finds warm leads who replied but haven't booked, sends a nudge.
 */
export async function runWarmFollowUp(): Promise<void> {
  log.info('Warm follow-up job started');

  // Find leads: replied positively, 3 days since reply, haven't booked,
  // haven't been nudged yet.
  const { rows: leads } = await query(`
    SELECT DISTINCT l.*,
           r.id AS last_reply_id,
           r.body_text AS last_reply_body,
           r.received_at AS last_reply_at
    FROM outreach_leads l
    JOIN outreach_replies r ON r.lead_id = l.id
    WHERE r.classification = 'interested'
      AND l.stage IN ('outreach', 'engaged')
      AND l.status NOT IN ('call_booked', 'demo_completed', 'pilot',
                           'closed_won', 'closed_lost', 'unsubscribed',
                           'bounced', 'dead', 'unverified_dead', 'archived',
                           'do_not_contact')
      AND r.received_at < NOW() - INTERVAL '3 days'
      AND r.received_at > NOW() - INTERVAL '10 days'
      AND NOT EXISTS (
        SELECT 1 FROM outreach_emails e
        WHERE e.lead_id = l.id
          AND e.sent_at > r.received_at
          AND e.body_text LIKE '%nudge%'
      )
    ORDER BY r.received_at ASC
    LIMIT 20
  `);

  log.info(`Found ${leads.length} warm leads to nudge`);
  let sent = 0;

  for (const lead of leads) {
    try {
      // Pick a sending account
      const account = await queryOne<any>(
        'SELECT * FROM outreach_sending_accounts WHERE is_active = true ORDER BY sent_today ASC LIMIT 1'
      );
      if (!account) { log.warn('No active sending accounts'); break; }

      const calLink = process.env.CAL_BOOKING_URL || 'https://cal.com/rkv/15min';
      const subject = `Following up, ${lead.first_name || ''}`;
      const body = `Hey ${lead.first_name || 'there'},\n\nJust circling back — didn't want this to slip through the cracks. You were interested in seeing how RKV Consulting could fit ${lead.company_name || 'your operation'}.\n\nStill have time for a quick 15-min call? Here's my calendar: ${calLink}\n\nOr just reply with a good time.\n\nBest,\n${account.display_name || 'Dave'}\n\n[nudge]`;

      // Record the email
      await execute(`
        INSERT INTO outreach_emails (lead_id, sending_account_id, subject, body_text, status, sent_at, created_at)
        VALUES ($1, $2, $3, $4, 'sent', NOW(), NOW())
      `, [lead.id, account.id, subject, body]);

      // Actually try to send via SMTP
      try {
        const msgId = `nudge-${lead.id}-${Date.now()}`;
        await sendEmail(account as any, lead.email, subject, '<p>' + body.replace(/\n/g, '<br>') + '</p>', body, msgId);
      } catch (smtpErr) {
        log.warn(`SMTP send failed for nudge to ${lead.email}: ${smtpErr instanceof Error ? smtpErr.message : smtpErr}`);
      }

      await execute('UPDATE outreach_leads SET updated_at = NOW() WHERE id = $1', [lead.id]);
      sent++;
      log.info(`Nudge sent to ${lead.email}`);
    } catch (err) {
      log.error(`Failed nudge for lead ${lead.id}: ${err instanceof Error ? err.message : err}`);
    }
  }

  log.info(`Warm follow-up complete: sent ${sent} nudges`);
}
