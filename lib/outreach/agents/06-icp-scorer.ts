import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import type { AgentName, AgentRunResult, AgentInput, OutreachLead, DEFAULT_ICP_CRITERIA } from '../types';

class IcpScorer extends BaseAgent {
  name: AgentName = 'icp_scorer';
  description = 'Scores leads 0-100 on ICP criteria. Haiku for bulk, Sonnet for top 10%';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const campaignId = input.campaign_id as string | undefined;
    const leadIds = input.lead_ids as string[] | undefined;

    let leads: OutreachLead[];
    if (leadIds?.length) {
      const result = await query<OutreachLead>(
        `SELECT * FROM outreach_leads WHERE id = ANY($1) AND org_id = $2`,
        [leadIds, ORG_ID]
      );
      leads = result.rows;
    } else if (campaignId) {
      const result = await query<OutreachLead>(
        `SELECT * FROM outreach_leads WHERE campaign_id = $1 AND org_id = $2 AND status = 'enriched' AND icp_score = 0
         LIMIT 1000`,
        [campaignId, ORG_ID]
      );
      leads = result.rows;
    } else {
      return { success: false, error: 'Provide campaign_id or lead_ids' };
    }

    await this.log('info', `Scoring ${leads.length} leads`);

    // Batch score with Haiku (groups of 10)
    const batches = chunkArray(leads, 10);
    const scores: { id: string; score: number; reason: string }[] = [];

    for (const batch of batches) {
      await this.updateStatus('running', `Scoring batch of ${batch.length} leads`);

      const leadsDescription = batch.map((l, i) => {
        const contacts = 'checking...';
        return `${i + 1}. "${l.company_name}" — ${l.unit_count || '?'} units, ${l.state || '?'}, ` +
          `Rating: ${l.google_rating || '?'}/5 (${l.review_count} reviews), ` +
          `Tech: ${(l.tech_stack || []).join(', ') || 'unknown'}, ` +
          `Website Score: ${l.website_score}/10, ` +
          `Locations: ${l.office_locations}, AI Tools: ${l.has_ai_tools ? 'yes' : 'no'}, ` +
          `Pain Signals: ${JSON.stringify(l.pain_signals || {})}`;
      }).join('\n');

      const { data } = await this.callHaikuJSON<{
        scores: { index: number; score: number; reason: string }[];
      }>(
        `Score these property management companies 0-100 as potential buyers of AI property management software ($10/unit/month). Higher = better fit.\n\nScoring criteria:\n- 500-999 units: +20, 1000-2499: +30, 2500+: +40\n- Uses AppFolio/Buildium/Yardi/RealPage/Entrata: +15\n- Bad reviews mentioning maintenance/response time: +10\n- Multiple office locations: +10\n- No AI tools: +10\n- High website score (7+): +5\n- Pain signals present: +5-15\n\nDisqualify (score 0): under 200 units, government housing, already using AI tools.\n\n${leadsDescription}`,
        'Score property management leads for ICP fit. Return JSON: {"scores": [{"index": 1, "score": 75, "reason": "850 units, uses AppFolio, bad reviews about maintenance"}]}',
        { maxTokens: 1024 }
      );

      for (const s of (data.scores || [])) {
        const lead = batch[s.index - 1];
        if (lead) {
          scores.push({ id: lead.id, score: s.score, reason: s.reason });
        }
      }
    }

    // Re-score top 10% with Sonnet for deeper analysis
    const sortedScores = scores.sort((a, b) => b.score - a.score);
    const top10Pct = sortedScores.slice(0, Math.max(1, Math.ceil(sortedScores.length * 0.1)));

    for (const topScore of top10Pct) {
      const lead = leads.find(l => l.id === topScore.id);
      if (!lead) continue;

      await this.updateStatus('running', `Deep scoring: ${lead.company_name}`);

      const { data } = await this.callSonnetJSON<{ score: number; reason: string }>(
        `Deep-score this property management company as a potential buyer of our AI platform ($10/unit/month, 5 AI agents for leasing, voice, maintenance, finance, acquisitions).\n\nCompany: ${lead.company_name}\nUnits: ${lead.unit_count || 'unknown'}\nState: ${lead.state}\nRating: ${lead.google_rating}/5 (${lead.review_count} reviews)\nTech Stack: ${(lead.tech_stack || []).join(', ')}\nServices: ${(lead.services || []).join(', ')}\nWebsite Score: ${lead.website_score}/10\nLocations: ${lead.office_locations}\nAI Tools: ${lead.has_ai_tools}\nPain Signals: ${JSON.stringify(lead.pain_signals)}\nYear Founded: ${lead.year_founded || 'unknown'}\nEmployees: ${lead.employee_count || 'unknown'}\n\nInitial score: ${topScore.score}/100 because: ${topScore.reason}\n\nRe-evaluate with deeper analysis. Consider growth trajectory, market position, and likelihood to adopt.`,
        'Return JSON: {"score": 85, "reason": "Detailed reasoning..."}',
        { maxTokens: 512 }
      );

      topScore.score = data.score;
      topScore.reason = data.reason;
    }

    // Save all scores
    let qualified = 0, archived = 0;
    for (const s of scores) {
      const newStatus = s.score >= 30 ? 'qualified' : 'disqualified';
      await query(
        `UPDATE outreach_leads SET icp_score = $1, icp_score_reason = $2, status = $3 WHERE id = $4`,
        [s.score, s.reason, newStatus, s.id]
      );
      if (s.score >= 30) qualified++;
      else archived++;
    }

    if (campaignId) {
      await query(
        `UPDATE outreach_campaigns SET qualified_leads = $1, status = 'scoring' WHERE id = $2`,
        [qualified, campaignId]
      );
    }

    await this.log('success', `Scored ${scores.length} leads: ${qualified} qualified, ${archived} archived`);
    return { success: true, data: { scored: scores.length, qualified, archived } };
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export default new IcpScorer();
