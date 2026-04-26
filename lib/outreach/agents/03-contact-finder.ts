import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { runActor, ACTORS } from '../apify-client';
import type { AgentName, AgentRunResult, AgentInput, OutreachLead } from '../types';

class ContactFinder extends BaseAgent {
  name: AgentName = 'contact_finder';
  description = 'Finds 2-3 decision-makers per company via LinkedIn + website scraping';

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
        `SELECT l.* FROM outreach_leads l
         LEFT JOIN outreach_contacts c ON c.lead_id = l.id
         WHERE l.campaign_id = $1 AND l.org_id = $2 AND l.status = 'enriched' AND c.id IS NULL
         LIMIT 200`,
        [campaignId, ORG_ID]
      );
      leads = result.rows;
    } else {
      return { success: false, error: 'Provide campaign_id or lead_ids' };
    }

    await this.log('info', `Finding contacts for ${leads.length} leads`);
    let totalContacts = 0;

    for (const lead of leads) {
      try {
        await this.updateStatus('running', `Finding contacts: ${lead.company_name}`);

        // Search LinkedIn for people at this company
        const searchQuery = `${lead.company_name} property management`;
        const results = await runActor<{
          fullName?: string;
          firstName?: string;
          lastName?: string;
          headline?: string;
          profileUrl?: string;
        }>(ACTORS.LINKEDIN_PEOPLE_SEARCH, {
          searchTerms: [searchQuery],
          maxResults: 10,
        }, { timeoutSecs: 120 });

        if (!results.length) continue;

        // Use Haiku to identify decision-makers
        const people = results.map((r, i) =>
          `${i + 1}. ${r.fullName || 'Unknown'} — ${r.headline || 'No title'}`
        ).join('\n');

        const { data } = await this.callHaikuJSON<{
          contacts: { index: number; role_type: string }[];
        }>(
          `Company: ${lead.company_name}\n\nPeople found on LinkedIn:\n${people}\n\nIdentify the best 2-3 decision-makers for selling AI property management software. Look for CEO/Owner, VP of Operations, Regional Manager, or Property Manager. Return their index and role_type.`,
          'Return JSON: {"contacts": [{"index": 1, "role_type": "ceo"}, {"index": 3, "role_type": "vp_ops"}]}. role_type must be: ceo, vp_ops, regional_manager, property_manager, or other.',
          { maxTokens: 256 }
        );

        for (const contact of (data.contacts || []).slice(0, 3)) {
          const person = results[contact.index - 1];
          if (!person) continue;

          await query(
            `INSERT INTO outreach_contacts
             (org_id, lead_id, first_name, last_name, title, linkedin_url, role_type, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
             ON CONFLICT DO NOTHING`,
            [
              ORG_ID, lead.id,
              person.firstName || person.fullName?.split(' ')[0] || null,
              person.lastName || person.fullName?.split(' ').slice(1).join(' ') || null,
              person.headline || null,
              person.profileUrl || null,
              contact.role_type || 'other',
            ]
          );
          totalContacts++;
        }
      } catch (err) {
        await this.log('warning', `Failed to find contacts for ${lead.company_name}: ${(err as Error).message}`);
      }
    }

    await this.log('success', `Found ${totalContacts} contacts across ${leads.length} leads`);
    return { success: true, data: { contactsFound: totalContacts, leadsProcessed: leads.length } };
  }
}

export default new ContactFinder();
