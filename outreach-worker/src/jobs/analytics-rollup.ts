import { query, queryOne, execute } from '../services/supabase.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('analytics-rollup');

/**
 * Analytics rollup job. Runs daily at 1 AM EST.
 * Aggregates daily stats from outreach_emails into outreach_analytics_daily.
 */
export async function rollupAnalytics(): Promise<void> {
  log.info('Analytics-rollup job started');

  try {
    // Calculate for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateStr = yesterday.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString();
    const todayStr = today.toISOString();

    // Check if already rolled up
    const existing = await queryOne(
      `SELECT id FROM outreach_analytics_daily
       WHERE date = $1 AND sequence_id IS NULL AND sending_account_id IS NULL
       LIMIT 1`,
      [dateStr]
    );

    if (existing) {
      log.info(`Analytics already rolled up for ${dateStr}. Skipping.`);
      return;
    }

    // ─── Overall daily stats ────────────────────────────────────

    const emailsSentResult = await queryOne(
      'SELECT COUNT(*) as count FROM outreach_emails WHERE sent_at >= $1 AND sent_at < $2',
      [yesterdayStr, todayStr]
    );

    const emailsDeliveredResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE status IN ('sent', 'delivered', 'opened', 'clicked', 'replied')
         AND sent_at >= $1 AND sent_at < $2`,
      [yesterdayStr, todayStr]
    );

    const emailsOpenedResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE opened_at IS NOT NULL AND sent_at >= $1 AND sent_at < $2`,
      [yesterdayStr, todayStr]
    );

    const emailsClickedResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE clicked_at IS NOT NULL AND sent_at >= $1 AND sent_at < $2`,
      [yesterdayStr, todayStr]
    );

    const emailsRepliedResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE status = 'replied' AND sent_at >= $1 AND sent_at < $2`,
      [yesterdayStr, todayStr]
    );

    const emailsBouncedResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE status = 'bounced' AND sent_at >= $1 AND sent_at < $2`,
      [yesterdayStr, todayStr]
    );

    const newLeadsResult = await queryOne(
      'SELECT COUNT(*) as count FROM outreach_leads WHERE created_at >= $1 AND created_at < $2',
      [yesterdayStr, todayStr]
    );

    const leadsEngagedResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_leads
       WHERE status IN ('replied', 'engaged', 'call_booked')
         AND updated_at >= $1 AND updated_at < $2`,
      [yesterdayStr, todayStr]
    );

    const callsBookedResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_leads
       WHERE stage = 'call_booked' AND updated_at >= $1 AND updated_at < $2`,
      [yesterdayStr, todayStr]
    );

    const sent = parseInt(emailsSentResult?.count || '0', 10);
    const delivered = parseInt(emailsDeliveredResult?.count || '0', 10);
    const opened = parseInt(emailsOpenedResult?.count || '0', 10);
    const clicked = parseInt(emailsClickedResult?.count || '0', 10);
    const replied = parseInt(emailsRepliedResult?.count || '0', 10);
    const bounced = parseInt(emailsBouncedResult?.count || '0', 10);

    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;
    const replyRate = sent > 0 ? (replied / sent) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;

    // Insert overall stats
    try {
      await execute(
        `INSERT INTO outreach_analytics_daily
         (date, emails_sent, emails_delivered, emails_opened, emails_clicked, emails_replied, emails_bounced,
          open_rate, click_rate, reply_rate, bounce_rate, new_leads, leads_engaged, calls_booked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          dateStr,
          sent,
          delivered,
          opened,
          clicked,
          replied,
          bounced,
          Math.round(openRate * 100) / 100,
          Math.round(clickRate * 100) / 100,
          Math.round(replyRate * 100) / 100,
          Math.round(bounceRate * 100) / 100,
          parseInt(newLeadsResult?.count || '0', 10),
          parseInt(leadsEngagedResult?.count || '0', 10),
          parseInt(callsBookedResult?.count || '0', 10),
        ]
      );

      log.info(
        `Rolled up analytics for ${dateStr}: ` +
        `sent=${sent}, opened=${opened}(${openRate.toFixed(1)}%), ` +
        `replied=${replied}(${replyRate.toFixed(1)}%), bounced=${bounced}`
      );
    } catch (insertErr) {
      const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
      log.error(`Failed to insert daily analytics: ${errMsg}`);
    }

    // ─── Per-sequence stats ─────────────────────────────────────

    await rollupPerSequence(yesterdayStr, todayStr, dateStr);

    // ─── Per-account stats ──────────────────────────────────────

    await rollupPerAccount(yesterdayStr, todayStr, dateStr);

    log.info('Analytics-rollup complete');
  } catch (error) {
    log.error(`Analytics-rollup job failed: ${error}`);
  }
}

async function rollupPerSequence(
  yesterdayStr: string,
  todayStr: string,
  dateStr: string
): Promise<void> {
  // Get distinct sequence IDs from yesterday's emails
  const { rows: emails } = await query(
    `SELECT DISTINCT sequence_id FROM outreach_emails
     WHERE sent_at >= $1 AND sent_at < $2 AND sequence_id IS NOT NULL`,
    [yesterdayStr, todayStr]
  );

  if (emails.length === 0) return;

  const sequenceIds = emails.map((e) => e.sequence_id).filter(Boolean);

  for (const seqId of sequenceIds) {
    const sentResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE sequence_id = $1 AND sent_at >= $2 AND sent_at < $3`,
      [seqId, yesterdayStr, todayStr]
    );

    const openedResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE sequence_id = $1 AND opened_at IS NOT NULL AND sent_at >= $2 AND sent_at < $3`,
      [seqId, yesterdayStr, todayStr]
    );

    const repliedResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE sequence_id = $1 AND status = 'replied' AND sent_at >= $2 AND sent_at < $3`,
      [seqId, yesterdayStr, todayStr]
    );

    const s = parseInt(sentResult?.count || '0', 10);
    const o = parseInt(openedResult?.count || '0', 10);
    const r = parseInt(repliedResult?.count || '0', 10);

    await execute(
      `INSERT INTO outreach_analytics_daily
       (date, sequence_id, emails_sent, emails_delivered, emails_opened, emails_clicked, emails_replied, emails_bounced,
        open_rate, click_rate, reply_rate, bounce_rate, new_leads, leads_engaged, calls_booked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        dateStr,
        seqId,
        s,
        s,
        o,
        0,
        r,
        0,
        s > 0 ? Math.round((o / s) * 10000) / 100 : 0,
        0,
        s > 0 ? Math.round((r / s) * 10000) / 100 : 0,
        0,
        0,
        0,
        0,
      ]
    );
  }
}

async function rollupPerAccount(
  yesterdayStr: string,
  todayStr: string,
  dateStr: string
): Promise<void> {
  const { rows: emails } = await query(
    `SELECT DISTINCT sending_account_id FROM outreach_emails
     WHERE sent_at >= $1 AND sent_at < $2`,
    [yesterdayStr, todayStr]
  );

  if (emails.length === 0) return;

  const accountIds = emails.map((e) => e.sending_account_id).filter(Boolean);

  for (const accId of accountIds) {
    const sentResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE sending_account_id = $1 AND sent_at >= $2 AND sent_at < $3`,
      [accId, yesterdayStr, todayStr]
    );

    const bouncedResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE sending_account_id = $1 AND status = 'bounced' AND sent_at >= $2 AND sent_at < $3`,
      [accId, yesterdayStr, todayStr]
    );

    const s = parseInt(sentResult?.count || '0', 10);
    const b = parseInt(bouncedResult?.count || '0', 10);

    await execute(
      `INSERT INTO outreach_analytics_daily
       (date, sending_account_id, emails_sent, emails_delivered, emails_opened, emails_clicked, emails_replied, emails_bounced,
        open_rate, click_rate, reply_rate, bounce_rate, new_leads, leads_engaged, calls_booked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        dateStr,
        accId,
        s,
        s - b,
        0,
        0,
        0,
        b,
        0,
        0,
        0,
        s > 0 ? Math.round((b / s) * 10000) / 100 : 0,
        0,
        0,
        0,
      ]
    );
  }
}
