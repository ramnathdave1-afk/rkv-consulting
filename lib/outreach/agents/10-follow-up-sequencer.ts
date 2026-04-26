import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { FOLLOW_UP_STEPS } from '../types';
import type { AgentName, AgentRunResult, AgentInput, OutreachSequence } from '../types';

class FollowUpSequencer extends BaseAgent {
  name: AgentName = 'follow_up_sequencer';
  description = 'Manages 5-touch, 14-day follow-up sequences. Writes + queues follow-ups.';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const campaignId = input.campaign_id as string | undefined;

    // Find sequences due for next touch
    const dueResult = await query<OutreachSequence & {
      first_name: string; last_name: string; company_name: string;
      email: string; lead_id: string; contact_id: string;
      unit_count: number | null; role_type: string | null; icp_score: number;
    }>(
      `SELECT seq.*, c.first_name, c.last_name, c.email, c.role_type, c.lead_id,
              l.company_name, l.unit_count, l.icp_score
       FROM outreach_sequences seq
       JOIN outreach_contacts c ON c.id = seq.contact_id
       JOIN outreach_leads l ON l.id = seq.lead_id
       WHERE seq.org_id = $1 AND seq.status = 'active'
         AND seq.next_send_at <= now()
         AND seq.current_step < seq.max_steps
         ${campaignId ? 'AND seq.campaign_id = $2' : ''}
       ORDER BY l.icp_score DESC LIMIT 200`,
      campaignId ? [ORG_ID, campaignId] : [ORG_ID]
    );

    const due = dueResult.rows;
    if (!due.length) {
      await this.log('info', 'No follow-ups due');
      return { success: true, data: { followUpsSent: 0 } };
    }

    await this.log('info', `Processing ${due.length} follow-ups`);
    let queued = 0;

    for (const seq of due) {
      try {
        const nextStep = seq.current_step + 1;
        const stepConfig = FOLLOW_UP_STEPS[nextStep] || FOLLOW_UP_STEPS[FOLLOW_UP_STEPS.length - 1];

        await this.updateStatus('running', `Follow-up #${nextStep} for ${seq.first_name} at ${seq.company_name}`);

        // Get previous emails for context
        const prevEmails = await query<{ body: string; sequence_step: number }>(
          `SELECT body, sequence_step FROM outreach_sends
           WHERE contact_id = $1 AND org_id = $2 ORDER BY created_at ASC`,
          [seq.contact_id, ORG_ID]
        );

        const previousContext = prevEmails.rows.map(e =>
          `Step ${e.sequence_step}: ${(e.body || '').slice(0, 200)}`
        ).join('\n');

        // Get research report hook
        const reportResult = await query<{ primary_hook: string; secondary_hook: string }>(
          `SELECT primary_hook, secondary_hook FROM outreach_research_reports WHERE lead_id = $1 LIMIT 1`,
          [seq.lead_id]
        );
        const report = reportResult.rows[0];

        const { data } = await this.callHaikuJSON<{ subject: string; body: string }>(
          `Write follow-up #${nextStep} for ${seq.first_name} ${seq.last_name || ''} at ${seq.company_name} (${seq.unit_count || '?'} units).

ANGLE: ${stepConfig.angle}
MAX WORDS: ${stepConfig.max_words}
${report ? `Primary Hook: ${report.primary_hook}\nSecondary Hook: ${report.secondary_hook}` : ''}

PREVIOUS EMAILS SENT:
${previousContext || 'Initial email only'}

RULES:
- Different angle from previous emails
- Reference the previous email naturally ("circling back", "one more thought")
- ${stepConfig.angle === 'breakup' ? 'Friendly close, leave door open, no pressure' : ''}
- ${stepConfig.angle === 'case_study' ? 'Include specific results: 96% occupancy, 90-sec response, $10/unit' : ''}
- ${stepConfig.angle === 'direct_ask' ? 'Short and direct, just ask for 15 minutes' : ''}
- Sign off as "— Dave"
- Include a subject line`,
          'Return JSON: {"subject": "short subject line", "body": "email body text"}',
          { maxTokens: 512 }
        );

        // Queue the follow-up
        await query(
          `INSERT INTO outreach_sends
           (org_id, campaign_id, contact_id, lead_id, channel, subject, body, sequence_step, status)
           VALUES ($1, $2, $3, $4, 'email', $5, $6, $7, 'queued')`,
          [ORG_ID, seq.campaign_id, seq.contact_id, seq.lead_id, data.subject, data.body, nextStep]
        );

        // Advance sequence
        const nextStepConfig = FOLLOW_UP_STEPS[nextStep + 1];
        const nextSendAt = nextStepConfig
          ? new Date(Date.now() + nextStepConfig.delay_days * 24 * 60 * 60 * 1000).toISOString()
          : null;

        await query(
          `UPDATE outreach_sequences
           SET current_step = $1, last_sent_at = now(), next_send_at = $2,
               status = $3
           WHERE id = $4`,
          [
            nextStep,
            nextSendAt,
            nextSendAt ? 'active' : 'completed',
            seq.id,
          ]
        );

        queued++;
      } catch (err) {
        await this.log('warning', `Follow-up failed for ${seq.first_name}: ${(err as Error).message}`);
      }
    }

    await this.log('success', `Queued ${queued} follow-up emails`);
    return { success: true, data: { followUpsSent: queued, total: due.length } };
  }
}

export default new FollowUpSequencer();
