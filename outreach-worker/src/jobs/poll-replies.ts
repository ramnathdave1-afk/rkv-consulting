import { query, queryOne, execute } from '../services/supabase.js';
import { fetchNewEmails, extractReplyText } from '../services/imap.js';
import { createModuleLogger } from '../utils/logger.js';
import type { SendingAccount } from '../types/index.js';

const log = createModuleLogger('poll-replies');

/**
 * Poll for new replies. Runs every 5 minutes.
 * Connects to each active sending account's IMAP inbox and fetches new emails.
 */
export async function pollReplies(): Promise<void> {
  log.info('Poll-replies job started');

  try {
    // Get all active sending accounts
    const { rows: accounts } = await query(
      'SELECT * FROM outreach_sending_accounts WHERE is_active = true'
    );

    if (accounts.length === 0) {
      log.info('No active sending accounts to poll');
      return;
    }

    let totalReplies = 0;

    for (const account of accounts as SendingAccount[]) {
      try {
        // Fetch emails from last 24 hours
        const since = new Date();
        since.setHours(since.getHours() - 24);

        const emails = await fetchNewEmails(account, since);

        if (emails.length === 0) {
          log.debug(`No new emails for ${account.email}`);
          continue;
        }

        log.info(`Fetched ${emails.length} new emails for ${account.email}`);

        for (const email of emails) {
          try {
            // Try to match to an outreach email via In-Reply-To header
            let matchedEmail = null;

            if (email.inReplyTo) {
              matchedEmail = await queryOne(
                `SELECT id, lead_id, subject, sequence_id, step_number
                 FROM outreach_emails WHERE message_id = $1`,
                [email.inReplyTo]
              );
            }

            // Fallback: match by subject line (strip Re: prefix)
            if (!matchedEmail) {
              const cleanSubject = email.subject
                .replace(/^(Re|Fwd|Fw):\s*/gi, '')
                .trim();

              if (cleanSubject) {
                matchedEmail = await queryOne(
                  `SELECT id, lead_id, subject, sequence_id, step_number
                   FROM outreach_emails
                   WHERE sending_account_id = $1 AND subject ILIKE $2
                   ORDER BY sent_at DESC
                   LIMIT 1`,
                  [account.id, cleanSubject]
                );
              }
            }

            // Fallback: match by from email
            if (!matchedEmail) {
              const leadMatch = await queryOne(
                'SELECT id FROM outreach_leads WHERE email = $1 LIMIT 1',
                [email.from.toLowerCase()]
              );

              if (leadMatch) {
                matchedEmail = { lead_id: leadMatch.id, id: null };
              }
            }

            if (!matchedEmail) {
              log.debug(`Could not match reply from ${email.from} - subject: "${email.subject}"`);
              continue;
            }

            // Check if this reply was already recorded
            const existing = await queryOne(
              `SELECT id FROM outreach_replies
               WHERE lead_id = $1 AND from_email = $2 AND subject = $3 AND received_at >= $4
               LIMIT 1`,
              [matchedEmail.lead_id, email.from.toLowerCase(), email.subject, since.toISOString()]
            );

            if (existing) {
              log.debug(`Reply already recorded from ${email.from}`);
              continue;
            }

            // Extract clean reply text
            const replyText = extractReplyText(email.bodyText);

            // Create the reply record
            try {
              await execute(
                `INSERT INTO outreach_replies
                 (email_id, lead_id, from_email, subject, body_text, body_html, in_reply_to, is_classified, received_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  matchedEmail.id,
                  matchedEmail.lead_id,
                  email.from.toLowerCase(),
                  email.subject,
                  replyText,
                  email.bodyHtml,
                  email.inReplyTo,
                  false,
                  email.date.toISOString(),
                ]
              );
            } catch (insertErr) {
              const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
              log.error(`Failed to insert reply: ${errMsg}`);
              continue;
            }

            // Update the matched outreach email status to 'replied'
            if (matchedEmail.id) {
              await execute(
                "UPDATE outreach_emails SET status = 'replied' WHERE id = $1",
                [matchedEmail.id]
              );
            }

            // Update lead status to 'replied'
            await execute(
              `UPDATE outreach_leads
               SET status = 'replied', next_send_at = NULL, updated_at = $1
               WHERE id = $2`,
              [new Date().toISOString(), matchedEmail.lead_id]
            );

            totalReplies++;
            log.info(`Recorded reply from ${email.from} for lead ${matchedEmail.lead_id}`);
          } catch (emailError) {
            log.error(`Error processing email from ${email.from}: ${emailError}`);
          }
        }
      } catch (accountError) {
        log.error(`Error polling account ${account.email}: ${accountError}`);
      }
    }

    log.info(`Poll-replies complete. New replies recorded: ${totalReplies}`);
  } catch (error) {
    log.error(`Poll-replies job failed: ${error}`);
  }
}
