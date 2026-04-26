import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { listMessages, type GmailCredentials } from '../../integrations/gmail';
import type { AgentName, AgentRunResult, AgentInput, OutreachDomain, ReplyClassification } from '../types';

class ReplyClassifier extends BaseAgent {
  name: AgentName = 'reply_classifier';
  description = 'Monitors all 17 inboxes, classifies replies: interested/objection/question/etc.';

  async run(input: AgentInput): Promise<AgentRunResult> {
    // Get all active Gmail accounts
    const domains = await query<OutreachDomain>(
      `SELECT * FROM outreach_domains WHERE org_id = $1 AND status IN ('active','warming')`,
      [ORG_ID]
    );

    if (!domains.rows.length) {
      await this.log('warning', 'No active Gmail accounts to check');
      return { success: true, data: { repliesProcessed: 0 } };
    }

    await this.log('info', `Checking ${domains.rows.length} inboxes for replies`);
    let processed = 0, interested = 0;

    for (const domain of domains.rows) {
      if (!domain.oauth_credentials) continue;

      try {
        await this.updateStatus('running', `Checking: ${domain.email_address}`);

        const creds = domain.oauth_credentials as unknown as GmailCredentials;
        const messages = await listMessages(creds, 'is:unread in:inbox', 20);

        for (const msg of messages) {
          // Check if this is a reply to one of our outreach emails
          const matchingSend = await query<{ id: string; contact_id: string; lead_id: string; campaign_id: string }>(
            `SELECT id, contact_id, lead_id, campaign_id FROM outreach_sends
             WHERE org_id = $1 AND (thread_id = $2 OR message_id = $3)
             LIMIT 1`,
            [ORG_ID, msg.thread_id, msg.id]
          );

          if (!matchingSend.rows.length) continue;
          const send = matchingSend.rows[0];

          // Check if we already processed this reply
          const existing = await query(
            `SELECT id FROM outreach_replies WHERE send_id = $1 AND from_email = $2`,
            [send.id, msg.from]
          );
          if (existing.rows.length) continue;

          // Classify with Haiku
          const { data } = await this.callHaikuJSON<{
            classification: ReplyClassification;
            sentiment_score: number;
            objection_type: string | null;
            referred_to_name: string | null;
            referred_to_email: string | null;
            summary: string;
          }>(
            `Classify this email reply to a cold outreach about AI property management software.\n\nSubject: ${msg.subject}\nFrom: ${msg.from}\nBody: ${msg.body.slice(0, 2000)}`,
            `Classify the reply. Return JSON:
{
  "classification": one of "interested", "objection", "question", "not_interested", "unsubscribe", "out_of_office", "wrong_person", "referral",
  "sentiment_score": 0.0-1.0 (1.0 = very positive),
  "objection_type": if objection, what type (e.g. "too_expensive", "already_use_appfolio", "dont_trust_ai", "no_time", "current_system_works"),
  "referred_to_name": if referral, the name of who they referred to,
  "referred_to_email": if referral, their email,
  "summary": one-line summary of the reply
}`,
            { maxTokens: 256 }
          );

          // Insert reply
          await query(
            `INSERT INTO outreach_replies
             (org_id, send_id, contact_id, lead_id, from_email, subject, body,
              classification, sentiment_score, objection_type, referred_to_name, referred_to_email)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              ORG_ID, send.id, send.contact_id, send.lead_id,
              msg.from, msg.subject, msg.body.slice(0, 5000),
              data.classification, data.sentiment_score, data.objection_type,
              data.referred_to_name, data.referred_to_email,
            ]
          );

          // Update send status
          await query(
            `UPDATE outreach_sends SET status = 'replied', replied_at = now() WHERE id = $1`,
            [send.id]
          );

          // Stop all sequences for this contact (except OOO)
          if (data.classification !== 'out_of_office') {
            await query(
              `UPDATE outreach_sequences SET status = 'replied', stopped_reason = $1
               WHERE contact_id = $2 AND org_id = $3 AND status = 'active'`,
              [data.classification, send.contact_id, ORG_ID]
            );
          }

          // Update contact and lead status based on classification
          if (data.classification === 'interested') {
            interested++;
            await query(`UPDATE outreach_contacts SET status = 'interested' WHERE id = $1`, [send.contact_id]);
            await query(`UPDATE outreach_leads SET status = 'replied' WHERE id = $1`, [send.lead_id]);
            if (send.campaign_id) {
              await query(`UPDATE outreach_campaigns SET interested = interested + 1 WHERE id = $1`, [send.campaign_id]);
            }
            await this.log('success', `HOT LEAD: ${msg.from} replied with interest!`, { sendId: send.id, classification: data.classification });
          } else if (data.classification === 'unsubscribe' || data.classification === 'not_interested') {
            await query(`UPDATE outreach_contacts SET status = $1 WHERE id = $2`, [data.classification === 'unsubscribe' ? 'unsubscribed' : 'not_interested', send.contact_id]);
            if (data.classification === 'unsubscribe') {
              const contactEmail = msg.from.match(/<(.+)>/)?.[1] || msg.from;
              await query(
                `INSERT INTO outreach_suppression (org_id, email, reason) VALUES ($1, $2, 'unsubscribe_reply') ON CONFLICT DO NOTHING`,
                [ORG_ID, contactEmail]
              );
            }
          }

          // Update campaign replied count
          if (send.campaign_id) {
            await query(`UPDATE outreach_campaigns SET replied = replied + 1 WHERE id = $1`, [send.campaign_id]);
          }

          processed++;
          await this.log('info', `Classified reply from ${msg.from}: ${data.classification}`, {
            sendId: send.id, classification: data.classification, summary: data.summary,
          });
        }
      } catch (err) {
        await this.log('warning', `Failed checking ${domain.email_address}: ${(err as Error).message}`);
      }
    }

    await this.log('success', `Processed ${processed} replies (${interested} interested)`);
    return { success: true, data: { repliesProcessed: processed, interested } };
  }
}

export default new ReplyClassifier();
