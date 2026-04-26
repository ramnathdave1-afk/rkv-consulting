import { query, queryOne, execute } from '../services/supabase.js';
import { classifyReply, analyzeReplyDeep } from '../services/claude.js';
import { alertHotLead } from '../services/slack.js';
import { createModuleLogger } from '../utils/logger.js';
import type { OutreachReply, OutreachLead, ReplyClassification } from '../types/index.js';

const log = createModuleLogger('classify-replies');

// Map classification to lead status
const CLASSIFICATION_STATUS_MAP: Record<ReplyClassification, string | null> = {
  interested: 'engaged',
  meeting_request: 'call_booked',
  question: 'engaged',
  not_now: 'replied',
  not_interested: 'closed_lost',
  unsubscribe: 'unsubscribed',
  out_of_office: null, // Keep current status
  wrong_person: 'dead',
  referral: 'replied',
  competitor: 'closed_lost',
  already_have_solution: 'closed_lost',
  spam: null,
  bounce: 'bounced',
};

// Map classification to lead stage
const CLASSIFICATION_STAGE_MAP: Record<ReplyClassification, string | null> = {
  interested: 'engaged',
  meeting_request: 'call_booked',
  question: 'engaged',
  not_now: 'outreach',
  not_interested: 'closed_lost',
  unsubscribe: 'closed_lost',
  out_of_office: null,
  wrong_person: 'closed_lost',
  referral: 'engaged',
  competitor: 'closed_lost',
  already_have_solution: 'closed_lost',
  spam: null,
  bounce: 'closed_lost',
};

/**
 * Classify unprocessed replies. Runs every 5 min (offset from poll-replies).
 */
export async function classifyReplies(): Promise<void> {
  log.info('Classify-replies job started');

  try {
    // Query unclassified replies
    const { rows: replies } = await query(
      `SELECT * FROM outreach_replies
       WHERE is_classified = false
       ORDER BY received_at ASC
       LIMIT 20`
    );

    if (replies.length === 0) {
      log.info('No unclassified replies');
      return;
    }

    log.info(`Classifying ${replies.length} replies`);

    let classified = 0;
    let errors = 0;

    for (const reply of replies as OutreachReply[]) {
      try {
        // Get lead info
        const lead = await queryOne(
          'SELECT * FROM outreach_leads WHERE id = $1',
          [reply.lead_id]
        );

        if (!lead) {
          log.warn(`Lead not found for reply ${reply.id}`);
          continue;
        }

        // Get original email context
        let originalContext = '';
        if (reply.email_id) {
          const originalEmail = await queryOne(
            'SELECT subject, body_text FROM outreach_emails WHERE id = $1',
            [reply.email_id]
          );

          if (originalEmail) {
            originalContext = `Subject: ${originalEmail.subject}\n${originalEmail.body_text}`;
          }
        }

        // Step 1: Quick classification
        const classification = await classifyReply(
          reply.body_text,
          reply.subject,
          { company_name: lead.company_name, first_name: lead.first_name }
        );

        // Step 2: Deep analysis (for non-trivial classifications)
        const skipDeepAnalysis = ['out_of_office', 'bounce', 'spam', 'unsubscribe'];
        let deepAnalysis = null;

        if (!skipDeepAnalysis.includes(classification.classification)) {
          deepAnalysis = await analyzeReplyDeep(
            reply.body_text,
            originalContext,
            {
              company_name: lead.company_name,
              first_name: lead.first_name,
              unit_count: lead.unit_count,
            }
          );
        }

        // Step 3: Update the reply record
        const setClauses: string[] = [
          'classification = $1',
          'is_classified = $2',
        ];
        const params: unknown[] = [classification.classification, true];
        let paramIdx = 3;

        if (deepAnalysis) {
          setClauses.push(`sentiment_score = $${paramIdx++}`);
          params.push(deepAnalysis.sentiment_score);
          setClauses.push(`pain_points = $${paramIdx++}`);
          params.push(deepAnalysis.pain_points);
          setClauses.push(`objections = $${paramIdx++}`);
          params.push(deepAnalysis.objections);
          setClauses.push(`buying_signals = $${paramIdx++}`);
          params.push(deepAnalysis.buying_signals);
          setClauses.push(`urgency = $${paramIdx++}`);
          params.push(deepAnalysis.urgency);
          setClauses.push(`suggested_reply = $${paramIdx++}`);
          params.push(deepAnalysis.suggested_reply);
        }

        params.push(reply.id);

        try {
          await execute(
            `UPDATE outreach_replies SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
            params
          );
        } catch (updateErr) {
          const errMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
          log.error(`Failed to update reply ${reply.id}: ${errMsg}`);
          errors++;
          continue;
        }

        // Step 4: Update lead status based on classification
        const newStatus = CLASSIFICATION_STATUS_MAP[classification.classification];
        const newStage = CLASSIFICATION_STAGE_MAP[classification.classification];

        const leadSetClauses: string[] = ['updated_at = $1'];
        const leadParams: unknown[] = [new Date().toISOString()];
        let leadParamIdx = 2;

        if (newStatus) {
          leadSetClauses.push(`status = $${leadParamIdx++}`);
          leadParams.push(newStatus);
        }
        if (newStage) {
          leadSetClauses.push(`stage = $${leadParamIdx++}`);
          leadParams.push(newStage);
        }

        // Pause sequence for meaningful replies
        if (!['out_of_office', 'spam'].includes(classification.classification)) {
          leadSetClauses.push(`next_send_at = NULL`);
        }

        leadParams.push(reply.lead_id);

        await execute(
          `UPDATE outreach_leads SET ${leadSetClauses.join(', ')} WHERE id = $${leadParamIdx}`,
          leadParams
        );

        // ─── Feature 4: Out-of-Office smart handling ─────────────────
        if (classification.classification === 'out_of_office') {
          const body = reply.body_text || '';
          const returnDate = extractReturnDate(body);

          if (returnDate) {
            await execute(
              `UPDATE outreach_leads SET next_send_at = $1 WHERE id = $2`,
              [returnDate.toISOString(), reply.lead_id]
            );
            log.info(`OOO detected for lead ${reply.lead_id}, paused until ${returnDate.toISOString()}`);
          } else {
            // Default: pause 7 days
            const pauseUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await execute(
              `UPDATE outreach_leads SET next_send_at = $1 WHERE id = $2`,
              [pauseUntil.toISOString(), reply.lead_id]
            );
            log.info(`OOO detected for lead ${reply.lead_id}, paused 7 days (default)`);
          }
        }

        // ─── Feature 1c: Slack hot-lead alert ────────────────────────
        try {
          const urgency = deepAnalysis?.urgency;
          const isHot =
            classification.classification === 'interested' ||
            (typeof lead.score === 'number' && lead.score >= 70) ||
            urgency === 'high';
          if (isHot) {
            await alertHotLead(
              { ...lead, lead_score: lead.score },
              { ...reply, body_text: reply.body_text }
            );
          }
        } catch (slackErr) {
          log.warn(`Slack alert failed for reply ${reply.id}: ${slackErr instanceof Error ? slackErr.message : slackErr}`);
        }

        classified++;
        log.info(
          `Reply ${reply.id} classified as '${classification.classification}' ` +
          `(confidence: ${classification.confidence}) for lead ${lead.first_name} at ${lead.company_name}`
        );
      } catch (replyError) {
        const errMsg = replyError instanceof Error ? replyError.message : String(replyError);
        log.error(`Error classifying reply ${reply.id}: ${errMsg}`);
        errors++;
      }

      // Small delay between Claude API calls
      await new Promise((r) => setTimeout(r, 500));
    }

    log.info(`Classify-replies complete. Classified: ${classified}, Errors: ${errors}`);
  } catch (error) {
    log.error(`Classify-replies job failed: ${error}`);
  }
}

/**
 * Extract a return-date from an OOO reply body. Returns null if none found.
 */
function extractReturnDate(text: string): Date | null {
  // Look for common patterns: "back on [date]", "returning [date]", "until [date]"
  const patterns = [
    /(?:back|returning|return|until|through)\s+(?:on\s+)?(\w+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
    /(?:back|returning|return|until|through)\s+(?:on\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const d = new Date(match[1]);
      if (!isNaN(d.getTime()) && d > new Date()) return d;
    }
  }
  return null;
}
