import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { getAvailableAccount, sendTrackedEmail } from '../gmail-sender';
import { getAvailableSlots } from '../google-calendar';
import { OBJECTION_REBUTTALS } from '../types';
import type { AgentName, AgentRunResult, AgentInput, OutreachReply, OutreachDomain } from '../types';

class LeadResponder extends BaseAgent {
  name: AgentName = 'lead_responder';
  description = 'Auto-replies to interested leads within 2 minutes with meeting times, rebuttals, or answers';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const replyIds = input.reply_ids as string[] | undefined;

    // Get unresponded replies
    let replies: (OutreachReply & {
      contact_email: string; first_name: string; company_name: string;
      unit_count: number | null; thread_id: string | null;
      sending_account: string | null; message_id: string | null;
      send_id: string;
    })[];

    if (replyIds?.length) {
      const result = await query<typeof replies[0]>(
        `SELECT r.*, c.email as contact_email, c.first_name, l.company_name, l.unit_count,
                s.thread_id, s.sending_account, s.message_id
         FROM outreach_replies r
         JOIN outreach_contacts c ON c.id = r.contact_id
         JOIN outreach_leads l ON l.id = r.lead_id
         JOIN outreach_sends s ON s.id = r.send_id
         WHERE r.id = ANY($1) AND r.org_id = $2 AND r.auto_response_sent = false`,
        [replyIds, ORG_ID]
      );
      replies = result.rows;
    } else {
      const result = await query<typeof replies[0]>(
        `SELECT r.*, c.email as contact_email, c.first_name, l.company_name, l.unit_count,
                s.thread_id, s.sending_account, s.message_id
         FROM outreach_replies r
         JOIN outreach_contacts c ON c.id = r.contact_id
         JOIN outreach_leads l ON l.id = r.lead_id
         JOIN outreach_sends s ON s.id = r.send_id
         WHERE r.org_id = $1 AND r.auto_response_sent = false
           AND r.classification IN ('interested', 'objection', 'question')
         ORDER BY r.created_at ASC LIMIT 20`,
        [ORG_ID]
      );
      replies = result.rows;
    }

    if (!replies.length) {
      return { success: true, data: { responded: 0 } };
    }

    await this.log('info', `Responding to ${replies.length} replies`);
    let responded = 0;

    for (const reply of replies) {
      try {
        await this.updateStatus('running', `Responding to ${reply.first_name} (${reply.classification})`);

        let responseText: string;

        if (reply.classification === 'interested') {
          // Get available meeting slots for next 3 business days
          const slots = await getNextAvailableSlots(3);
          const slotsList = slots.slice(0, 3).map(s => {
            const d = new Date(s);
            return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) +
              ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET';
          }).join('\n- ');

          const result = await this.callSonnet(
            [{ role: 'user', content: `Write a warm, enthusiastic reply to ${reply.first_name} from ${reply.company_name} who expressed interest in our AI property management platform.

Their reply: "${(reply.body || '').slice(0, 500)}"

Include these 3 available meeting times:
- ${slotsList}

RULES:
- Be warm and appreciative, not salesy
- Brief — max 80 words
- Mention their company by name
- Ask which time works best, or suggest they pick another
- Sign off as "Dave"` }],
            'You write warm, concise follow-up replies to interested prospects. Keep it conversational and brief.'
          );
          responseText = result.content;
        } else if (reply.classification === 'objection') {
          const rebuttal = OBJECTION_REBUTTALS[reply.objection_type || ''] || '';

          const result = await this.callSonnet(
            [{ role: 'user', content: `Write a reply to ${reply.first_name} from ${reply.company_name} who raised an objection about our AI property management platform.

Their objection: "${(reply.body || '').slice(0, 500)}"
Objection type: ${reply.objection_type || 'general'}
${rebuttal ? `Rebuttal angle: ${rebuttal}` : ''}

RULES:
- Acknowledge their concern genuinely
- Address it with data/proof, not dismissal
- Soft CTA — don't push hard
- Max 100 words
- Sign off as "Dave"` }],
            'You handle sales objections with empathy and data. Never be pushy or dismissive.'
          );
          responseText = result.content;
        } else {
          // Question
          const result = await this.callSonnet(
            [{ role: 'user', content: `Reply to ${reply.first_name} from ${reply.company_name} (${reply.unit_count || '?'} units) who asked a question about our AI property management platform.

Their question: "${(reply.body || '').slice(0, 500)}"

Product details:
- 5 AI agents: Leasing (90-sec response), Voice (24/7), Maintenance (auto-dispatch), Finance (owner reports), Acquisitions
- $10/unit/month
- Integrates with AppFolio, Buildium, Yardi, RealPage, Entrata
- Live in 48 hours
- 96% occupancy, 97% AI resolution rate

RULES:
- Answer their specific question
- Brief — max 100 words
- Include a soft CTA for a call/meeting
- Sign off as "Dave"` }],
            'You answer prospect questions about AI property management software. Be helpful, specific, and brief.'
          );
          responseText = result.content;
        }

        // Send the reply via the same account that sent the original
        const sendingAccountEmail = reply.sending_account;
        let account = null;
        if (sendingAccountEmail) {
          const accountResult = await query(
            `SELECT * FROM outreach_domains WHERE email_address = $1 AND org_id = $2 LIMIT 1`,
            [sendingAccountEmail, ORG_ID]
          );
          account = accountResult.rows[0];
        }
        if (!account) {
          account = await getAvailableAccount();
        }
        if (!account) {
          await this.log('warning', 'No available account to send reply');
          continue;
        }

        // Create a new send record for the response
        const sendResult = await query<{ id: string }>(
          `INSERT INTO outreach_sends
           (org_id, contact_id, lead_id, channel, subject, body, sequence_step, status)
           VALUES ($1, $2, $3, 'email', $4, $5, 0, 'queued')
           RETURNING id`,
          [ORG_ID, reply.contact_id, reply.lead_id, `Re: ${reply.subject || ''}`, responseText]
        );

        await sendTrackedEmail(
          account as OutreachDomain,
          reply.contact_email,
          `Re: ${reply.subject || ''}`,
          formatHtml(responseText),
          sendResult.rows[0].id,
          { replyToMessageId: reply.message_id || undefined, threadId: reply.thread_id || undefined }
        );

        // Mark reply as responded
        await query(
          `UPDATE outreach_replies SET auto_response_sent = true, auto_response_text = $1, responded_at = now() WHERE id = $2`,
          [responseText, reply.id]
        );

        await query(
          `UPDATE outreach_sends SET status = 'sent', sent_at = now(), sending_account = $1 WHERE id = $2`,
          [account.email_address, sendResult.rows[0].id]
        );

        responded++;
        await this.log('success', `Replied to ${reply.first_name} (${reply.classification})`);
      } catch (err) {
        await this.log('error', `Failed replying to ${reply.first_name}: ${(err as Error).message}`);
      }
    }

    return { success: true, data: { responded, total: replies.length } };
  }
}

async function getNextAvailableSlots(days: number): Promise<string[]> {
  const slots: string[] = [];
  const today = new Date();

  for (let i = 1; i <= days + 4 && slots.length < 6; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = date.toISOString().split('T')[0];
    try {
      const daySlots = await getAvailableSlots(dateStr, 30, 9, 17);
      slots.push(...daySlots);
    } catch {
      // Calendar unavailable — generate reasonable times
      slots.push(new Date(`${dateStr}T14:00:00-04:00`).toISOString());
      slots.push(new Date(`${dateStr}T15:00:00-04:00`).toISOString());
    }
  }

  return slots;
}

function formatHtml(body: string): string {
  if (body.includes('<') && body.includes('>')) return body;
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;">
    ${body.split('\n').map(line => `<p style="margin:0 0 10px 0;">${line}</p>`).join('')}
  </div>`;
}

export default new LeadResponder();
