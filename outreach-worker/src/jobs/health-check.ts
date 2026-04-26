import { query, queryOne, execute } from '../services/supabase.js';
import { createModuleLogger } from '../utils/logger.js';
import type { SendingAccount } from '../types/index.js';

const log = createModuleLogger('health-check');

// Thresholds
const BOUNCE_RATE_THRESHOLD = 0.05; // 5%
const MIN_OPEN_RATE = 0.15; // 15%
const SPAM_COMPLAINT_THRESHOLD = 0.001; // 0.1%

/**
 * Sending account health check. Runs daily at 6 AM EST.
 * Calculates health score for each account based on bounce rate,
 * open rate, and spam complaints. Flags unhealthy accounts.
 */
export async function runHealthCheck(): Promise<void> {
  log.info('Health-check job started');

  try {
    const { rows: accounts } = await query(
      'SELECT * FROM outreach_sending_accounts WHERE is_active = true'
    );

    if (accounts.length === 0) {
      log.info('No active sending accounts to check');
      return;
    }

    let healthyCount = 0;
    let warningCount = 0;
    let unhealthyCount = 0;

    for (const account of accounts as SendingAccount[]) {
      try {
        const healthScore = await calculateAccountHealth(account);

        // Update account health score
        try {
          await execute(
            `UPDATE outreach_sending_accounts
             SET health_score = $1, updated_at = $2
             WHERE id = $3`,
            [healthScore, new Date().toISOString(), account.id]
          );
        } catch (updateErr) {
          const errMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
          log.error(`Failed to update account ${account.email}: ${errMsg}`);
          continue;
        }

        if (healthScore >= 80) {
          healthyCount++;
          log.debug(`Account ${account.email}: healthy (${healthScore})`);
        } else if (healthScore >= 50) {
          warningCount++;
          log.warn(`Account ${account.email}: warning (${healthScore})`);
        } else {
          unhealthyCount++;
          log.error(`Account ${account.email}: UNHEALTHY (${healthScore})`);

          // Auto-disable critically unhealthy accounts
          if (healthScore < 30) {
            await execute(
              'UPDATE outreach_sending_accounts SET is_active = false WHERE id = $1',
              [account.id]
            );

            log.error(`Account ${account.email} auto-disabled due to critically low health score (${healthScore})`);

            await execute(
              `INSERT INTO outreach_hygiene_log (action, details)
               VALUES ($1, $2)`,
              [
                'account_auto_disabled',
                JSON.stringify({
                  account_id: account.id,
                  email: account.email,
                  health_score: healthScore,
                }),
              ]
            );
          }
        }
      } catch (accountError) {
        log.error(`Error checking account ${account.email}: ${accountError}`);
      }
    }

    log.info(
      `Health-check complete. Healthy: ${healthyCount}, Warning: ${warningCount}, Unhealthy: ${unhealthyCount}`
    );
  } catch (error) {
    log.error(`Health-check job failed: ${error}`);
  }
}

/**
 * Calculate health score (0-100) for a sending account.
 */
async function calculateAccountHealth(account: SendingAccount): Promise<number> {
  // Look at last 30 days of activity
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceStr = thirtyDaysAgo.toISOString();

  // Total emails sent
  const totalSentResult = await queryOne(
    `SELECT COUNT(*) as count FROM outreach_emails
     WHERE sending_account_id = $1 AND sent_at >= $2`,
    [account.id, sinceStr]
  );

  const sent = parseInt(totalSentResult?.count || '0', 10);
  if (sent === 0) {
    // No activity, return neutral score
    return 75;
  }

  // Bounces
  const totalBouncedResult = await queryOne(
    `SELECT COUNT(*) as count FROM outreach_emails
     WHERE sending_account_id = $1 AND status = 'bounced' AND sent_at >= $2`,
    [account.id, sinceStr]
  );

  // Opens
  const totalOpenedResult = await queryOne(
    `SELECT COUNT(*) as count FROM outreach_emails
     WHERE sending_account_id = $1 AND opened_at IS NOT NULL AND sent_at >= $2`,
    [account.id, sinceStr]
  );

  // Replies (positive signal)
  const totalRepliedResult = await queryOne(
    `SELECT COUNT(*) as count FROM outreach_emails
     WHERE sending_account_id = $1 AND status = 'replied' AND sent_at >= $2`,
    [account.id, sinceStr]
  );

  const bounced = parseInt(totalBouncedResult?.count || '0', 10);
  const opened = parseInt(totalOpenedResult?.count || '0', 10);
  const replied = parseInt(totalRepliedResult?.count || '0', 10);

  const bounceRate = bounced / sent;
  const openRate = opened / sent;
  const replyRate = replied / sent;

  let score = 100;

  // Bounce rate penalty (max -40 points)
  if (bounceRate > BOUNCE_RATE_THRESHOLD) {
    const excess = bounceRate - BOUNCE_RATE_THRESHOLD;
    score -= Math.min(40, Math.round(excess * 400));
  }

  // Low open rate penalty (max -30 points)
  if (openRate < MIN_OPEN_RATE) {
    const deficit = MIN_OPEN_RATE - openRate;
    score -= Math.min(30, Math.round(deficit * 200));
  }

  // Reply rate bonus (up to +10 points)
  if (replyRate > 0.02) {
    score += Math.min(10, Math.round(replyRate * 200));
  }

  // Volume bonus (consistent sending)
  if (sent > 100) {
    score += 5;
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  log.debug(
    `Account ${account.email} health breakdown: ` +
    `sent=${sent}, bounceRate=${(bounceRate * 100).toFixed(1)}%, ` +
    `openRate=${(openRate * 100).toFixed(1)}%, replyRate=${(replyRate * 100).toFixed(1)}%, ` +
    `score=${score}`
  );

  return score;
}
