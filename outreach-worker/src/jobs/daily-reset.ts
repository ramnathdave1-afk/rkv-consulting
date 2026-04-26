import { query, execute } from '../services/supabase.js';
import { resetAll } from '../utils/rate-limiter.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('daily-reset');

/**
 * Reset daily sending counters. Runs at midnight EST.
 */
export async function dailyReset(): Promise<void> {
  log.info('Daily-reset job started');

  try {
    // Reset sent_today on all sending accounts
    const { rows: data, rowCount } = await query(
      `UPDATE outreach_sending_accounts
       SET sent_today = 0
       WHERE sent_today != 0
       RETURNING id, email, sent_today`
    );

    log.info(`Reset sent_today for ${rowCount} sending accounts`);

    // Reset in-memory rate limiter
    resetAll();
    log.info('In-memory rate limiter reset');

    // Update any overdue tasks
    const { rows: overdueTasks, rowCount: overdueCount } = await query(
      `UPDATE outreach_tasks
       SET status = 'overdue'
       WHERE status = 'pending' AND due_date < $1
       RETURNING id`,
      [new Date().toISOString()]
    );

    log.info(`Marked ${overdueCount} tasks as overdue`);

    log.info('Daily-reset complete');
  } catch (error) {
    log.error(`Daily-reset job failed: ${error}`);
  }
}
