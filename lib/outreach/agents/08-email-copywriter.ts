import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import type { AgentName, AgentRunResult, AgentInput, OutreachContact, OutreachLead, OutreachResearchReport } from '../types';

const ROLE_ANGLES: Record<string, string> = {
  ceo: 'ROI, strategic growth, competitive advantage, reducing headcount costs',
  vp_ops: 'Operational efficiency, response times, maintenance automation, staff productivity',
  regional_manager: 'Day-to-day pain points, tenant satisfaction, maintenance dispatch, leasing speed',
  property_manager: 'Specific daily frustrations, after-hours calls, vacancy filling, vendor coordination',
  other: 'General efficiency and cost reduction',
};

class EmailCopywriter extends BaseAgent {
  name: AgentName = 'email_copywriter';
  description = 'Writes unique personalized emails per contact using research reports';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const campaignId = input.campaign_id as string | undefined;
    const contactIds = input.contact_ids as string[] | undefined;

    interface ContactWithDetails extends OutreachContact {
      company_name: string;
      unit_count: number | null;
      state: string | null;
      icp_score: number;
      lead_id: string;
    }

    let contacts: ContactWithDetails[];
    if (contactIds?.length) {
      const result = await query<ContactWithDetails>(
        `SELECT c.*, l.company_name, l.unit_count, l.state, l.icp_score
         FROM outreach_contacts c JOIN outreach_leads l ON l.id = c.lead_id
         WHERE c.id = ANY($1) AND c.org_id = $2 AND c.email IS NOT NULL AND c.email_status IN ('valid','risky','catch_all','unknown')`,
        [contactIds, ORG_ID]
      );
      contacts = result.rows;
    } else if (campaignId) {
      const result = await query<ContactWithDetails>(
        `SELECT c.*, l.company_name, l.unit_count, l.state, l.icp_score
         FROM outreach_contacts c
         JOIN outreach_leads l ON l.id = c.lead_id
         LEFT JOIN outreach_sends s ON s.contact_id = c.id
         WHERE l.campaign_id = $1 AND c.org_id = $2 AND l.status = 'qualified'
           AND c.email IS NOT NULL AND c.email_status != 'invalid' AND s.id IS NULL
         ORDER BY l.icp_score DESC LIMIT 500`,
        [campaignId, ORG_ID]
      );
      contacts = result.rows;
    } else {
      return { success: false, error: 'Provide campaign_id or contact_ids' };
    }

    await this.log('info', `Writing emails for ${contacts.length} contacts`);
    let written = 0;

    for (const contact of contacts) {
      try {
        await this.updateStatus('running', `Writing email: ${contact.first_name} at ${contact.company_name}`);

        // Get research report
        const reportResult = await query<OutreachResearchReport>(
          `SELECT * FROM outreach_research_reports WHERE lead_id = $1 AND org_id = $2 LIMIT 1`,
          [contact.lead_id, ORG_ID]
        );
        const report = reportResult.rows[0];

        const roleAngle = ROLE_ANGLES[contact.role_type || 'other'] || ROLE_ANGLES.other;
        const unitCount = contact.unit_count || 500;
        const monthlyCost = unitCount * 10;

        const prompt = `Write a cold outreach email to ${contact.first_name} ${contact.last_name || ''}, ${contact.title || contact.role_type || ''} at ${contact.company_name}.

COMPANY INTEL:
- ${unitCount} units managed in ${contact.state || 'US'}
- ICP Score: ${contact.icp_score}/100
${report ? `\nRESEARCH REPORT:\n${report.report_summary || ''}\n\nPrimary Hook: ${report.primary_hook || 'N/A'}\nSecondary Hook: ${report.secondary_hook || 'N/A'}\nPitch Strategy: ${report.pitch_strategy || 'N/A'}` : ''}

ROLE-SPECIFIC ANGLE (${contact.role_type || 'general'}): Focus on ${roleAngle}

PRODUCT: RKV Consulting's 5 AI agents — Leasing AI (90-sec response), Voice AI (24/7 phone), Maintenance AI (auto-dispatch), Finance Agent (owner reports), Acquisitions Agent. $10/unit/month. Live in 48 hours.

RESULTS: 96% occupancy, 90-sec response time, 97% AI resolution, 82% less delinquency.

RULES:
- 100-150 words MAX
- Conversational, not corporate
- Reference something SPECIFIC about their company (from research)
- End with a soft CTA asking for 15 minutes
- Sign off as "— Dave, RKV Consulting"
- NO subject line (that's a separate agent)
- NO "I hope this finds you well" or generic openers
- Start with their name and something specific about their portfolio`;

        // Use Sonnet for top 20%, Haiku for rest
        const useSonnet = contact.icp_score >= 70;
        const result = useSonnet
          ? await this.callSonnet([{ role: 'user', content: prompt }], 'You write hyper-personalized B2B cold emails for property management software. Be specific, concise, and conversational. Never be generic.')
          : await this.callHaiku([{ role: 'user', content: prompt }], 'You write concise B2B cold emails for property management software. Be specific and conversational.');

        const emailBody = result.content.trim();

        // Insert as queued send
        await query(
          `INSERT INTO outreach_sends
           (org_id, campaign_id, contact_id, lead_id, channel, body, sequence_step, status)
           VALUES ($1, $2, $3, $4, 'email', $5, 1, 'queued')`,
          [ORG_ID, campaignId || null, contact.id, contact.lead_id, emailBody]
        );

        written++;
      } catch (err) {
        await this.log('warning', `Failed writing for ${contact.first_name}: ${(err as Error).message}`);
      }
    }

    await this.log('success', `Wrote ${written}/${contacts.length} emails`);
    return { success: true, data: { written, total: contacts.length } };
  }
}

export default new EmailCopywriter();
