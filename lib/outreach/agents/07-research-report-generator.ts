import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import type { AgentName, AgentRunResult, AgentInput, OutreachLead, OutreachContact } from '../types';

class ResearchReportGenerator extends BaseAgent {
  name: AgentName = 'research_report_generator';
  description = 'Generates detailed research dossiers for leads scoring 40+';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const campaignId = input.campaign_id as string | undefined;
    const leadIds = input.lead_ids as string[] | undefined;
    const minScore = (input.min_icp_score as number) || 40;

    let leads: OutreachLead[];
    if (leadIds?.length) {
      const result = await query<OutreachLead>(
        `SELECT * FROM outreach_leads WHERE id = ANY($1) AND org_id = $2`,
        [leadIds, ORG_ID]
      );
      leads = result.rows;
    } else if (campaignId) {
      const result = await query<OutreachLead>(
        `SELECT l.* FROM outreach_leads l
         LEFT JOIN outreach_research_reports r ON r.lead_id = l.id
         WHERE l.campaign_id = $1 AND l.org_id = $2 AND l.icp_score >= $3
           AND l.status = 'qualified' AND r.id IS NULL
         ORDER BY l.icp_score DESC LIMIT 200`,
        [campaignId, ORG_ID, minScore]
      );
      leads = result.rows;
    } else {
      return { success: false, error: 'Provide campaign_id or lead_ids' };
    }

    await this.log('info', `Generating research reports for ${leads.length} leads`);
    let generated = 0;

    for (const lead of leads) {
      try {
        await this.updateStatus('running', `Researching: ${lead.company_name}`);

        // Get contacts for this lead
        const contactsResult = await query<OutreachContact>(
          `SELECT * FROM outreach_contacts WHERE lead_id = $1 AND org_id = $2`,
          [lead.id, ORG_ID]
        );
        const contacts = contactsResult.rows;

        const contactsInfo = contacts.map(c =>
          `- ${c.first_name} ${c.last_name}, ${c.title || c.role_type || 'Unknown role'}, ${c.email || 'no email'}, ${c.linkedin_url || 'no LinkedIn'}`
        ).join('\n');

        const result = await this.callSonnet(
          [{ role: 'user', content: `Generate a detailed research report for this property management company. This report will be used by an email copywriter to write hyper-personalized cold outreach emails.

COMPANY DATA:
- Name: ${lead.company_name}
- Location: ${lead.city || ''}, ${lead.state || ''}
- Units: ${lead.unit_count || 'unknown'}
- Google Rating: ${lead.google_rating || 'unknown'}/5 (${lead.review_count} reviews)
- Website: ${lead.website || 'none'}
- Website Score: ${lead.website_score}/10
- Tech Stack: ${(lead.tech_stack || []).join(', ') || 'unknown'}
- Services: ${(lead.services || []).join(', ') || 'unknown'}
- Office Locations: ${lead.office_locations}
- Year Founded: ${lead.year_founded || 'unknown'}
- Employees: ${lead.employee_count || 'unknown'}
- Has AI Tools: ${lead.has_ai_tools}
- Pain Signals: ${JSON.stringify(lead.pain_signals || {})}
- ICP Score: ${lead.icp_score}/100 — ${lead.icp_score_reason}

DECISION MAKERS:
${contactsInfo || 'None found yet'}

Generate the report with these sections:
1. Company Overview (2-3 sentences)
2. Portfolio Analysis (units, properties, growth trajectory)
3. Tech Stack Assessment (what they use, what's missing)
4. Pain Point Assessment (specific problems we can solve)
5. Review Analysis (what tenants/owners complain about)
6. Competitive Landscape (other PM companies in their market)
7. Pitch Strategy:
   - Primary Hook (the #1 specific thing to reference in the email)
   - Secondary Hook (backup angle)
   - Best contact to lead with and why
   - Role-specific talking points for each contact
   - Likely objections they'll raise` }],
          `You are a B2B sales researcher specializing in property management. Generate thorough but concise research reports that give email copywriters specific, actionable hooks for personalized outreach. Focus on SPECIFIC details — company names, unit counts, review quotes, tech gaps — not generic observations.`,
          { maxTokens: 2048 }
        );

        // Parse sections (best-effort)
        const reportText = result.content;
        const sections = parseSections(reportText);

        // Determine best contact
        const bestContact = contacts.find(c => c.role_type === 'ceo') ||
          contacts.find(c => c.role_type === 'vp_ops') ||
          contacts[0];

        await query(
          `INSERT INTO outreach_research_reports
           (org_id, lead_id, report_json, report_summary, company_overview, portfolio_analysis,
            tech_stack_assessment, pain_point_assessment, review_analysis, competitive_landscape,
            pitch_strategy, primary_hook, secondary_hook, best_contact_id, generated_by, tokens_used, cost_usd)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'sonnet', $15, $16)`,
          [
            ORG_ID, lead.id,
            JSON.stringify({ full_report: reportText, ...sections }),
            reportText.slice(0, 500),
            sections.company_overview || null,
            sections.portfolio_analysis || null,
            sections.tech_stack_assessment || null,
            sections.pain_point_assessment || null,
            sections.review_analysis || null,
            sections.competitive_landscape || null,
            sections.pitch_strategy || null,
            sections.primary_hook || null,
            sections.secondary_hook || null,
            bestContact?.id || null,
            result.inputTokens + result.outputTokens,
            result.costUsd,
          ]
        );

        generated++;
      } catch (err) {
        await this.log('warning', `Report failed for ${lead.company_name}: ${(err as Error).message}`);
      }
    }

    await this.log('success', `Generated ${generated}/${leads.length} research reports`);
    return { success: true, data: { generated, total: leads.length } };
  }
}

function parseSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionMap: Record<string, string> = {
    'company overview': 'company_overview',
    'portfolio analysis': 'portfolio_analysis',
    'tech stack': 'tech_stack_assessment',
    'pain point': 'pain_point_assessment',
    'review analysis': 'review_analysis',
    'competitive landscape': 'competitive_landscape',
    'pitch strategy': 'pitch_strategy',
    'primary hook': 'primary_hook',
    'secondary hook': 'secondary_hook',
  };

  const lines = text.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const headerMatch = line.match(/^#+\s*\d*\.?\s*(.*)/);
    if (headerMatch) {
      const header = headerMatch[1].toLowerCase().trim();
      for (const [key, value] of Object.entries(sectionMap)) {
        if (header.includes(key)) {
          currentSection = value;
          sections[currentSection] = '';
          break;
        }
      }
    } else if (currentSection) {
      sections[currentSection] = (sections[currentSection] + '\n' + line).trim();
    }
  }

  return sections;
}

export default new ResearchReportGenerator();
