import { query, queryOne, execute } from '../services/supabase.js';
import { calculateLeadScore } from '../services/scoring.js';
import { createModuleLogger } from '../utils/logger.js';
import type { OutreachLead, OutreachEmail, OutreachReply } from '../types/index.js';

const log = createModuleLogger('lead-scorer');

/**
 * Recalculate scores for leads with recent activity. Runs every 30 min.
 */
export async function scoreLeads(): Promise<void> {
  log.info('Lead-scorer job started');

  try {
    // Find leads updated in the last hour (recent activity)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { rows: leads } = await query(
      `SELECT * FROM outreach_leads
       WHERE updated_at >= $1
         AND status NOT IN ('archived', 'do_not_contact')
       LIMIT 200`,
      [oneHourAgo.toISOString()]
    );

    if (leads.length === 0) {
      log.info('No leads with recent activity to score');
      return;
    }

    log.info(`Scoring ${leads.length} leads with recent activity`);

    let updated = 0;
    let errors = 0;

    for (const lead of leads as OutreachLead[]) {
      try {
        // Fetch emails for this lead
        const { rows: emails } = await query(
          'SELECT * FROM outreach_emails WHERE lead_id = $1',
          [lead.id]
        );

        // Fetch replies for this lead
        const { rows: replies } = await query(
          'SELECT * FROM outreach_replies WHERE lead_id = $1',
          [lead.id]
        );

        const result = calculateLeadScore(
          lead,
          emails as OutreachEmail[],
          replies as OutreachReply[]
        );

        // Only update if score changed
        if (result.score !== lead.score || result.temperature !== lead.temperature) {
          try {
            await execute(
              `UPDATE outreach_leads
               SET score = $1, temperature = $2, updated_at = $3
               WHERE id = $4`,
              [result.score, result.temperature, new Date().toISOString(), lead.id]
            );
          } catch (updateErr) {
            const errMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
            log.error(`Failed to update lead ${lead.id}: ${errMsg}`);
            errors++;
            continue;
          }

          updated++;
          log.debug(
            `Lead ${lead.id} score: ${lead.score} -> ${result.score} (${result.temperature})`
          );
        }
      } catch (leadError) {
        log.error(`Error scoring lead ${lead.id}: ${leadError}`);
        errors++;
      }
    }

    log.info(`Lead-scorer complete. Updated: ${updated}, Errors: ${errors}`);
  } catch (error) {
    log.error(`Lead-scorer job failed: ${error}`);
  }
}
