import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import type { AgentName, AgentRunResult, AgentInput } from '../types';

class SubjectLineOptimizer extends BaseAgent {
  name: AgentName = 'subject_line_optimizer';
  description = 'Generates 3 A/B/C subject line variants per email';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const campaignId = input.campaign_id as string | undefined;
    const sendIds = input.send_ids as string[] | undefined;

    interface SendWithContext {
      [key: string]: unknown;
      id: string;
      body: string;
      company_name: string;
      first_name: string;
      unit_count: number | null;
      role_type: string | null;
    }

    let sends: SendWithContext[];
    if (sendIds?.length) {
      const result = await query<SendWithContext>(
        `SELECT s.id, s.body, l.company_name, c.first_name, l.unit_count, c.role_type
         FROM outreach_sends s
         JOIN outreach_contacts c ON c.id = s.contact_id
         JOIN outreach_leads l ON l.id = s.lead_id
         WHERE s.id = ANY($1) AND s.org_id = $2`,
        [sendIds, ORG_ID]
      );
      sends = result.rows;
    } else if (campaignId) {
      const result = await query<SendWithContext>(
        `SELECT s.id, s.body, l.company_name, c.first_name, l.unit_count, c.role_type
         FROM outreach_sends s
         JOIN outreach_contacts c ON c.id = s.contact_id
         JOIN outreach_leads l ON l.id = s.lead_id
         WHERE s.campaign_id = $1 AND s.org_id = $2 AND s.subject IS NULL AND s.status = 'queued'
         LIMIT 500`,
        [campaignId, ORG_ID]
      );
      sends = result.rows;
    } else {
      return { success: false, error: 'Provide campaign_id or send_ids' };
    }

    await this.log('info', `Generating subject lines for ${sends.length} emails`);

    // Batch process (groups of 10)
    const batches = chunkArray(sends, 10);
    let optimized = 0;

    for (const batch of batches) {
      await this.updateStatus('running', `Optimizing ${batch.length} subject lines`);

      const emailSummaries = batch.map((s, i) =>
        `${i + 1}. To: ${s.first_name} (${s.role_type || 'unknown role'}) at ${s.company_name} (${s.unit_count || '?'} units)\nEmail preview: ${(s.body || '').slice(0, 200)}`
      ).join('\n\n');

      const { data } = await this.callHaikuJSON<{
        subjects: { index: number; A: string; B: string; C: string }[];
      }>(
        `Generate 3 subject line variants (A, B, C) for each cold email below. Rules:\n- Under 50 characters\n- No spam words (free, guaranteed, act now)\n- Curiosity-driven or specific\n- Lowercase okay, no ALL CAPS\n- Personalize with company name or unit count when possible\n- Variant A: Question or curiosity\n- Variant B: Specific/data-driven\n- Variant C: Direct/casual\n\n${emailSummaries}`,
        'Return JSON: {"subjects": [{"index": 1, "A": "subject a", "B": "subject b", "C": "subject c"}]}',
        { maxTokens: 1024 }
      );

      for (const subj of (data.subjects || [])) {
        const send = batch[subj.index - 1];
        if (!send) continue;

        // Pick variant randomly for this send (weighted by historical data later)
        const variants = [
          { variant: 'A' as const, subject: subj.A },
          { variant: 'B' as const, subject: subj.B },
          { variant: 'C' as const, subject: subj.C },
        ];
        const pick = variants[Math.floor(Math.random() * 3)];

        await query(
          `UPDATE outreach_sends SET subject = $1, subject_variant = $2,
           metadata = jsonb_set(COALESCE(metadata, '{}'), '{subject_variants}', $3::jsonb)
           WHERE id = $4`,
          [
            pick.subject, pick.variant,
            JSON.stringify({ A: subj.A, B: subj.B, C: subj.C }),
            send.id,
          ]
        );
        optimized++;
      }
    }

    await this.log('success', `Generated subject lines for ${optimized}/${sends.length} emails`);
    return { success: true, data: { optimized, total: sends.length } };
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export default new SubjectLineOptimizer();
