import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { runActor, ACTORS } from '../apify-client';
import type { AgentName, AgentRunResult, AgentInput, OutreachContact, OutreachLead } from '../types';

class EmailFinder extends BaseAgent {
  name: AgentName = 'email_finder';
  description = 'Discovers email addresses via pattern matching + Apify email finder';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const campaignId = input.campaign_id as string | undefined;
    const contactIds = input.contact_ids as string[] | undefined;

    let contacts: (OutreachContact & { website?: string; company_name?: string })[];
    if (contactIds?.length) {
      const result = await query<OutreachContact & { website: string; company_name: string }>(
        `SELECT c.*, l.website, l.company_name FROM outreach_contacts c
         JOIN outreach_leads l ON l.id = c.lead_id
         WHERE c.id = ANY($1) AND c.org_id = $2`,
        [contactIds, ORG_ID]
      );
      contacts = result.rows;
    } else if (campaignId) {
      const result = await query<OutreachContact & { website: string; company_name: string }>(
        `SELECT c.*, l.website, l.company_name FROM outreach_contacts c
         JOIN outreach_leads l ON l.id = c.lead_id
         WHERE l.campaign_id = $1 AND c.org_id = $2 AND (c.email IS NULL OR c.email = '')
         LIMIT 500`,
        [campaignId, ORG_ID]
      );
      contacts = result.rows;
    } else {
      return { success: false, error: 'Provide campaign_id or contact_ids' };
    }

    await this.log('info', `Finding emails for ${contacts.length} contacts`);
    let found = 0;

    for (const contact of contacts) {
      if (!contact.first_name || !contact.website) continue;

      try {
        await this.updateStatus('running', `Finding email: ${contact.first_name} ${contact.last_name}`);

        const domain = extractDomain(contact.website);
        if (!domain) continue;

        // Try pattern matching first
        const patterns = generatePatterns(contact.first_name, contact.last_name || '', domain);

        // Use Apify email finder as supplement
        try {
          const apifyResults = await runActor<{ email?: string; confidence?: number }>(ACTORS.EMAIL_FINDER, {
            firstName: contact.first_name,
            lastName: contact.last_name || '',
            domain,
          }, { timeoutSecs: 60 });

          if (apifyResults[0]?.email) {
            patterns.unshift(apifyResults[0].email);
          }
        } catch {
          // Apify email finder failed — use patterns only
        }

        // Take the first pattern as the best guess
        const bestEmail = patterns[0];
        if (bestEmail) {
          await query(
            `UPDATE outreach_contacts SET email = $1, email_status = 'unknown' WHERE id = $2`,
            [bestEmail, contact.id]
          );
          found++;
        }
      } catch (err) {
        await this.log('warning', `Failed for ${contact.first_name}: ${(err as Error).message}`);
      }
    }

    await this.log('success', `Found ${found}/${contacts.length} emails`);
    return { success: true, data: { emailsFound: found, total: contacts.length } };
  }
}

function extractDomain(website: string): string | null {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function generatePatterns(firstName: string, lastName: string, domain: string): string[] {
  const f = firstName.toLowerCase().trim();
  const l = lastName.toLowerCase().trim();
  if (!f || !l) return [`${f || l}@${domain}`];

  return [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}@${domain}`,
    `${f[0]}.${l}@${domain}`,
    `${f}_${l}@${domain}`,
    `${f}${l[0]}@${domain}`,
  ];
}

export default new EmailFinder();
