import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { getAvailableAccount, sendTrackedEmail, randomDelay, isWithinSendWindow } from '../gmail-sender';
import type { AgentName, AgentRunResult, AgentInput } from '../types';

class EmailBlaster extends BaseAgent {
  name: AgentName = 'email_blaster';
  description = 'Sends queued emails across 17 Gmail accounts with rotation, warmup, and tracking';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const batchSize = (input.batch_size as number) || 50;

    // Check send window
    if (!isWithinSendWindow()) {
      await this.log('info', 'Outside send window (7am-6pm ET, Mon-Sat). Skipping.');
      return { success: true, data: { sent: 0, reason: 'outside_send_window' } };
    }

    // Get queued emails ordered by ICP score (best prospects first)
    const queued = await query<{
      id: string; contact_id: string; lead_id: string;
      subject: string; body: string; email: string;
      thread_id: string | null; state: string | null;
    }>(
      `SELECT s.id, s.contact_id, s.lead_id, s.subject, s.body,
              c.email, s.thread_id, l.state
       FROM outreach_sends s
       JOIN outreach_contacts c ON c.id = s.contact_id
       JOIN outreach_leads l ON l.id = s.lead_id
       WHERE s.org_id = $1 AND s.status = 'queued' AND s.channel = 'email'
         AND c.email IS NOT NULL AND c.email_status != 'invalid'
       ORDER BY l.icp_score DESC
       LIMIT $2`,
      [ORG_ID, batchSize]
    );

    if (!queued.rows.length) {
      await this.log('info', 'No emails in queue');
      return { success: true, data: { sent: 0 } };
    }

    await this.log('info', `Sending batch of ${queued.rows.length} emails`);
    let sent = 0, failed = 0, skipped = 0;

    for (const email of queued.rows) {
      try {
        // Check recipient timezone
        const recipientTz = getTimezoneForState(email.state);
        if (!isWithinSendWindow(recipientTz)) {
          skipped++;
          continue;
        }

        // Get available sending account
        const account = await getAvailableAccount();
        if (!account) {
          await this.log('warning', 'No available sending accounts (all at daily limit)');
          break;
        }

        // Check domain spacing (max 1 per recipient domain per account per day)
        const recipientDomain = email.email.split('@')[1];
        const alreadySent = await query(
          `SELECT id FROM outreach_sends
           WHERE org_id = $1 AND sending_account = $2 AND status IN ('sent','delivered','opened')
             AND created_at >= CURRENT_DATE
             AND contact_id IN (
               SELECT id FROM outreach_contacts WHERE email LIKE $3
             )
           LIMIT 1`,
          [ORG_ID, account.email_address, `%@${recipientDomain}`]
        );
        if (alreadySent.rows.length > 0) {
          skipped++;
          continue;
        }

        await this.updateStatus('running', `Sending to ${email.email} via ${account.email_address}`);

        // Mark as sending
        await query(`UPDATE outreach_sends SET status = 'sending' WHERE id = $1`, [email.id]);

        // Send
        const result = await sendTrackedEmail(
          account,
          email.email,
          email.subject || 'Quick question',
          formatHtml(email.body || ''),
          email.id,
          { threadId: email.thread_id || undefined }
        );

        // Update send record
        await query(
          `UPDATE outreach_sends
           SET status = 'sent', sent_at = now(), sending_account = $1, message_id = $2, thread_id = $3
           WHERE id = $4`,
          [result.sendingAccount, result.messageId, result.threadId, email.id]
        );

        // Update contact status
        await query(
          `UPDATE outreach_contacts SET status = 'contacted' WHERE id = $1 AND status IN ('new','verified')`,
          [email.contact_id]
        );

        sent++;
        await this.log('info', `Sent to ${email.email} via ${account.email_address}`, { sendId: email.id });

        // Random delay between sends (30-90 seconds)
        if (sent < queued.rows.length) {
          await randomDelay(30000, 90000);
        }
      } catch (err) {
        failed++;
        await query(
          `UPDATE outreach_sends SET status = 'failed', metadata = jsonb_set(COALESCE(metadata,'{}'), '{error}', $1::jsonb) WHERE id = $2`,
          [JSON.stringify((err as Error).message), email.id]
        );
        await this.log('error', `Send failed for ${email.email}: ${(err as Error).message}`);
      }
    }

    await this.log('success', `Batch complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);
    return { success: true, data: { sent, failed, skipped } };
  }
}

function formatHtml(body: string): string {
  // Convert plain text to simple HTML
  if (body.includes('<') && body.includes('>')) return body;
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;">
    ${body.split('\n').map(line => `<p style="margin:0 0 10px 0;">${line}</p>`).join('')}
  </div>`;
}

function getTimezoneForState(state?: string | null): string {
  const tzMap: Record<string, string> = {
    FL: 'America/New_York', GA: 'America/New_York', NC: 'America/New_York',
    TN: 'America/Chicago', TX: 'America/Chicago', OH: 'America/New_York',
    PA: 'America/New_York', CO: 'America/Denver', AZ: 'America/Phoenix',
    CA: 'America/Los_Angeles',
  };
  return tzMap[(state || '').toUpperCase()] || 'America/New_York';
}

export default new EmailBlaster();
