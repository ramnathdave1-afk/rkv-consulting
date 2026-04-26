import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { runActor, ACTORS } from '../apify-client';
import type { AgentName, AgentRunResult, AgentInput, OutreachLead } from '../types';

class CompanyEnricher extends BaseAgent {
  name: AgentName = 'company_enricher';
  description = 'Crawls company websites to extract unit count, services, tech stack, pain signals';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const campaignId = input.campaign_id as string | undefined;
    const leadIds = input.lead_ids as string[] | undefined;

    // Get leads to enrich
    let leads: OutreachLead[];
    if (leadIds?.length) {
      const result = await query<OutreachLead>(
        `SELECT * FROM outreach_leads WHERE id = ANY($1) AND org_id = $2`,
        [leadIds, ORG_ID]
      );
      leads = result.rows;
    } else if (campaignId) {
      const result = await query<OutreachLead>(
        `SELECT * FROM outreach_leads WHERE campaign_id = $1 AND org_id = $2 AND status = 'raw' AND website IS NOT NULL LIMIT 500`,
        [campaignId, ORG_ID]
      );
      leads = result.rows;
    } else {
      return { success: false, error: 'Provide campaign_id or lead_ids' };
    }

    await this.log('info', `Enriching ${leads.length} leads`);
    let enriched = 0;

    for (const lead of leads) {
      if (!lead.website) continue;

      try {
        await this.updateStatus('running', `Enriching: ${lead.company_name}`);

        // Crawl website
        const pages = await runActor<{ text?: string; url?: string }>(ACTORS.WEBSITE_CONTENT_CRAWLER, {
          startUrls: [{ url: lead.website }],
          maxCrawlPages: 5,
          maxCrawlDepth: 2,
        }, { timeoutSecs: 120 });

        const allText = pages.map(p => p.text || '').join('\n\n').slice(0, 8000);

        if (!allText.trim()) {
          await query(`UPDATE outreach_leads SET status = 'enriched', website_score = 1 WHERE id = $1`, [lead.id]);
          continue;
        }

        // Haiku extracts structured data
        const { data } = await this.callHaikuJSON<{
          unit_count: number | null;
          services: string[];
          tech_stack: string[];
          office_locations: number;
          year_founded: number | null;
          employee_count: number | null;
          has_ai_tools: boolean;
          website_score: number;
          pain_signals: Record<string, string>;
        }>(
          `Extract property management company data from this website content:\n\n${allText}`,
          `You extract structured data from property management company websites. Return JSON with:
- unit_count: number of units managed (null if not found)
- services: array of services offered (e.g. "leasing", "maintenance", "accounting")
- tech_stack: any software mentioned (e.g. "AppFolio", "Buildium", "Yardi")
- office_locations: number of office locations (default 1)
- year_founded: year company was founded (null if not found)
- employee_count: estimated employee count (null if not found)
- has_ai_tools: boolean, true if they mention AI or automation tools
- website_score: 1-10 quality score (design, content, professionalism)
- pain_signals: key-value pairs of potential pain points (e.g. {"understaffed": "hiring for multiple roles", "slow_response": "mentions 24hr response time"})`,
          { maxTokens: 512 }
        );

        await query(
          `UPDATE outreach_leads SET
             unit_count = COALESCE($1, unit_count),
             services = $2,
             tech_stack = $3,
             office_locations = $4,
             year_founded = $5,
             employee_count = $6,
             has_ai_tools = $7,
             website_score = $8,
             pain_signals = $9,
             status = 'enriched'
           WHERE id = $10`,
          [
            data.unit_count, data.services || [], data.tech_stack || [],
            data.office_locations || 1, data.year_founded, data.employee_count,
            data.has_ai_tools || false, data.website_score || 5,
            JSON.stringify(data.pain_signals || {}), lead.id,
          ]
        );
        enriched++;
      } catch (err) {
        await this.log('warning', `Failed to enrich ${lead.company_name}: ${(err as Error).message}`);
      }
    }

    await this.log('success', `Enriched ${enriched}/${leads.length} leads`);
    return { success: true, data: { enriched, total: leads.length } };
  }
}

export default new CompanyEnricher();
