import { query, queryOne, execute } from '../services/supabase.js';
import { sendEmail } from '../services/smtp.js';
import { replaceMergeTags, buildMergeContext } from '../utils/merge-tags.js';
import { canSend, recordSend } from '../utils/rate-limiter.js';
import { createModuleLogger } from '../utils/logger.js';
import { randomUUID } from 'crypto';
import type { OutreachLead, SendingAccount, SequenceStep } from '../types/index.js';

const log = createModuleLogger('send-emails');

/**
 * Main sending job. Runs every 15 min (8AM-6PM EST, Mon-Fri).
 * Queries leads due for their next send, renders and sends emails.
 */
export async function sendScheduledEmails(): Promise<void> {
  log.info('Send-emails job started');

  try {
    // 1. Query leads due for sending
    const now = new Date().toISOString();
    const { rows: leads } = await query(
      `SELECT * FROM outreach_leads
       WHERE status = $1
         AND next_send_at <= $2
         AND sequence_id IS NOT NULL
       ORDER BY next_send_at ASC
       LIMIT 50`,
      ['in_sequence', now]
    );

    if (leads.length === 0) {
      log.info('No leads due for sending');
      return;
    }

    log.info(`Found ${leads.length} leads due for sending`);

    let sentCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const lead of leads as OutreachLead[]) {
      try {
        // 2. Check if lead has a pending reply (skip if so)
        const pendingReply = await queryOne(
          `SELECT id FROM outreach_replies
           WHERE lead_id = $1 AND is_classified = false
           LIMIT 1`,
          [lead.id]
        );

        if (pendingReply) {
          log.info(`Skipping lead ${lead.id} - has unclassified reply`);
          skipCount++;
          continue;
        }

        // 3. Check for bounce or unsubscribe
        if (['bounced', 'unsubscribed', 'do_not_contact', 'dead'].includes(lead.status)) {
          skipCount++;
          continue;
        }

        // 4. Get the sequence and current step
        const sequence = await queryOne(
          'SELECT * FROM outreach_sequences WHERE id = $1',
          [lead.sequence_id!]
        );

        if (!sequence) {
          log.warn(`Sequence not found for lead ${lead.id}: ${lead.sequence_id}`);
          skipCount++;
          continue;
        }

        const steps: SequenceStep[] = sequence.steps || [];
        const currentStep = steps.find((s) => s.step_number === (lead.current_step || 1));

        if (!currentStep) {
          // Sequence complete - no more steps
          log.info(`Lead ${lead.id} completed sequence ${sequence.id}`);
          await execute(
            `UPDATE outreach_leads
             SET status = $1, next_send_at = NULL, updated_at = $2
             WHERE id = $3`,
            ['dead', new Date().toISOString(), lead.id]
          );
          continue;
        }

        // 5. Pick a sending account with capacity
        const account = await pickSendingAccount(lead.sending_account_id);
        if (!account) {
          log.warn(`No available sending account for lead ${lead.id}`);
          skipCount++;
          continue;
        }

        // 6. Rate limit check
        if (!canSend(account.id)) {
          log.debug(`Rate limited on account ${account.email}, skipping lead ${lead.id}`);
          skipCount++;
          continue;
        }

        // 7. Render email with merge tags
        const senderFirstName = account.display_name.split(' ')[0];
        const mergeContext = buildMergeContext(lead, senderFirstName);
        const subject = replaceMergeTags(currentStep.subject, mergeContext);
        const htmlBody = replaceMergeTags(currentStep.body_html, mergeContext);
        const textBody = replaceMergeTags(currentStep.body_text, mergeContext);

        // 8. Generate message ID
        const messageId = `${crypto.randomUUID()}`;

        // 9. Determine reply-to header if this is a follow-up step
        let replyToMessageId: string | undefined;
        if (currentStep.step_number > 1) {
          const prevEmail = await queryOne(
            `SELECT message_id FROM outreach_emails
             WHERE lead_id = $1 AND sequence_id = $2 AND step_number = $3`,
            [lead.id, lead.sequence_id!, 1]
          );

          if (prevEmail) {
            replyToMessageId = prevEmail.message_id;
          }
        }

        // 10. Send the email
        const result = await sendEmail(
          account,
          lead.email,
          subject,
          htmlBody,
          textBody,
          messageId,
          replyToMessageId
        );

        if (!result.success) {
          log.error(`Failed to send to ${lead.email}: ${result.error}`);
          errorCount++;
          continue;
        }

        // 11. Record in outreach_emails
        await execute(
          `INSERT INTO outreach_emails
           (lead_id, sending_account_id, sequence_id, step_number, message_id, subject, body_html, body_text, status, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            lead.id,
            account.id,
            lead.sequence_id,
            currentStep.step_number,
            result.messageId,
            subject,
            htmlBody,
            textBody,
            'sent',
            new Date().toISOString(),
          ]
        );

        // 12. Update sending account counters
        await execute(
          `UPDATE outreach_sending_accounts
           SET sent_today = $1, last_send_at = $2
           WHERE id = $3`,
          [account.sent_today + 1, new Date().toISOString(), account.id]
        );

        // 13. Calculate next send time
        const nextStep = steps.find((s) => s.step_number === currentStep.step_number + 1);
        const nextSendAt = nextStep
          ? calculateNextSendAt(nextStep.delay_days)
          : null;

        // 14. Update lead
        await execute(
          `UPDATE outreach_leads
           SET current_step = $1, next_send_at = $2, sending_account_id = $3, updated_at = $4
           WHERE id = $5`,
          [currentStep.step_number + 1, nextSendAt, account.id, new Date().toISOString(), lead.id]
        );

        recordSend(account.id);
        sentCount++;

        log.info(`Sent step ${currentStep.step_number} to ${lead.email} via ${account.email}`);

        // Small delay between sends (in addition to rate limiter)
        await sleep(2000);
      } catch (leadError) {
        const errMsg = leadError instanceof Error ? leadError.message : String(leadError);
        log.error(`Error processing lead ${lead.id}: ${errMsg}`);
        errorCount++;
      }
    }

    log.info(`Send-emails complete. Sent: ${sentCount}, Skipped: ${skipCount}, Errors: ${errorCount}`);
  } catch (error) {
    log.error(`Send-emails job failed: ${error}`);
  }
}

/**
 * Pick a sending account that has capacity and is active.
 */
async function pickSendingAccount(
  preferredAccountId?: string
): Promise<SendingAccount | null> {
  // Try preferred account first
  if (preferredAccountId) {
    const data = await queryOne(
      'SELECT * FROM outreach_sending_accounts WHERE id = $1 AND is_active = true',
      [preferredAccountId]
    );

    if (data) {
      const limit = (data as any).daily_send_limit ?? (data as any).daily_limit ?? 28;
      const warmupCap = (data as any).is_warmed_up === false ? Math.min(10, limit) : limit;
      if (((data as any).sent_today ?? 0) < warmupCap) {
        return data as SendingAccount;
      }
    }
  }

  // Find any account with remaining capacity
  const { rows: accounts } = await query(
    'SELECT * FROM outreach_sending_accounts WHERE is_active = true ORDER BY sent_today ASC'
  );

  if (accounts.length === 0) return null;

  for (const account of accounts) {
    const limit = (account as any).daily_send_limit ?? (account as any).daily_limit ?? 28;
    const warmupCap = (account as any).is_warmed_up === false ? Math.min(10, limit) : limit;

    if (((account as any).sent_today ?? 0) < warmupCap && canSend(account.id)) {
      return account as SendingAccount;
    }
  }

  return null;
}

/**
 * Calculate the next send datetime based on delay_days.
 * Ensures sends happen during business hours (8AM-6PM EST, Mon-Fri).
 */
function calculateNextSendAt(delayDays: number): string {
  const next = new Date();
  next.setDate(next.getDate() + delayDays);

  // Add some randomness (0-3 hours)
  next.setMinutes(next.getMinutes() + Math.floor(Math.random() * 180));

  // Adjust for weekends
  const day = next.getDay();
  if (day === 0) next.setDate(next.getDate() + 1); // Sunday -> Monday
  if (day === 6) next.setDate(next.getDate() + 2); // Saturday -> Monday

  return next.toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
