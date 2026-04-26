import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { verifyEmail } from '../email-verifier';
import type { AgentName, AgentRunResult, AgentInput, OutreachContact } from '../types';

class EmailVerifierAgent extends BaseAgent {
  name: AgentName = 'email_verifier';
  description = 'MX + SMTP validation, catch-all detection, suppression check';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const campaignId = input.campaign_id as string | undefined;
    const contactIds = input.contact_ids as string[] | undefined;

    let contacts: OutreachContact[];
    if (contactIds?.length) {
      const result = await query<OutreachContact>(
        `SELECT * FROM outreach_contacts WHERE id = ANY($1) AND org_id = $2 AND email IS NOT NULL`,
        [contactIds, ORG_ID]
      );
      contacts = result.rows;
    } else if (campaignId) {
      const result = await query<OutreachContact>(
        `SELECT c.* FROM outreach_contacts c
         JOIN outreach_leads l ON l.id = c.lead_id
         WHERE l.campaign_id = $1 AND c.org_id = $2 AND c.email IS NOT NULL AND c.email_status = 'unknown'
         LIMIT 500`,
        [campaignId, ORG_ID]
      );
      contacts = result.rows;
    } else {
      return { success: false, error: 'Provide campaign_id or contact_ids' };
    }

    await this.log('info', `Verifying ${contacts.length} emails`);

    let valid = 0, invalid = 0, risky = 0, catchAll = 0;

    for (const contact of contacts) {
      if (!contact.email) continue;

      try {
        await this.updateStatus('running', `Verifying: ${contact.email}`);
        const result = await verifyEmail(contact.email);

        await query(
          `UPDATE outreach_contacts SET email_status = $1, email_verified_at = now() WHERE id = $2`,
          [result.status, contact.id]
        );

        if (result.status === 'valid') {
          valid++;
          await query(`UPDATE outreach_contacts SET status = 'verified' WHERE id = $1 AND status = 'new'`, [contact.id]);
        } else if (result.status === 'invalid') {
          invalid++;
        } else if (result.status === 'risky') {
          risky++;
        } else if (result.status === 'catch_all') {
          catchAll++;
        }
      } catch (err) {
        await this.log('warning', `Verification failed for ${contact.email}: ${(err as Error).message}`);
      }
    }

    await this.log('success', `Verified ${contacts.length} emails: ${valid} valid, ${invalid} invalid, ${risky} risky, ${catchAll} catch-all`);
    return { success: true, data: { valid, invalid, risky, catchAll, total: contacts.length } };
  }
}

export default new EmailVerifierAgent();
