import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

import { shutdown as shutdownDb } from './services/supabase.js';
import { logger, createModuleLogger } from './utils/logger.js';
import { sendScheduledEmails } from './jobs/send-emails.js';
import { pollReplies } from './jobs/poll-replies.js';
import { classifyReplies } from './jobs/classify-replies.js';
import { scoreLeads } from './jobs/lead-scorer.js';
import { generateTasks } from './jobs/task-generator.js';
import { runReEngagement } from './jobs/re-engagement.js';
import { dailyReset } from './jobs/daily-reset.js';
import { sendDailyDigest } from './jobs/daily-digest.js';
import { runHygiene } from './jobs/hygiene.js';
import { runDedupScan } from './jobs/dedup-scanner.js';
import { rollupAnalytics } from './jobs/analytics-rollup.js';
import { runHealthCheck } from './jobs/health-check.js';
import { runWarmFollowUp } from './jobs/warm-follow-up.js';

const log = createModuleLogger('main');

log.info('==============================================');
log.info('  RKV Consulting - Outreach Worker v1.0.0');
log.info('==============================================');
log.info(`Timezone: ${process.env.TZ || 'system default'}`);
log.info(`Node.js: ${process.version}`);
log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

// ─── Wrap job runner with error handling ─────────────────────────

function safeJob(name: string, fn: () => Promise<void>): () => void {
  return () => {
    fn().catch((error) => {
      log.error(`Job "${name}" threw unhandled error: ${error}`);
    });
  };
}

// ─── Register Cron Jobs ─────────────────────────────────────────

const TZ = 'America/New_York';

// Send emails: every 15 min, 8AM-6PM EST, Mon-Fri
cron.schedule('*/15 8-18 * * 1-5', safeJob('send-emails', sendScheduledEmails), {
  timezone: TZ,
});
log.info('Registered: send-emails (*/15 8-18 * * 1-5)');

// Poll replies: every 5 min
cron.schedule('*/5 * * * *', safeJob('poll-replies', pollReplies), {
  timezone: TZ,
});
log.info('Registered: poll-replies (*/5 * * * *)');

// Classify replies: every 5 min (offset by 2 min from poll)
cron.schedule('2-59/5 * * * *', safeJob('classify-replies', classifyReplies), {
  timezone: TZ,
});
log.info('Registered: classify-replies (2-59/5 * * * *)');

// Lead scorer: every 30 min
cron.schedule('*/30 * * * *', safeJob('lead-scorer', scoreLeads), {
  timezone: TZ,
});
log.info('Registered: lead-scorer (*/30 * * * *)');

// Task generator: every hour
cron.schedule('0 * * * *', safeJob('task-generator', generateTasks), {
  timezone: TZ,
});
log.info('Registered: task-generator (0 * * * *)');

// Re-engagement: daily at 10 AM EST
cron.schedule('0 10 * * *', safeJob('re-engagement', runReEngagement), {
  timezone: TZ,
});
log.info('Registered: re-engagement (0 10 * * *)');

// Daily reset: midnight EST
cron.schedule('0 0 * * *', safeJob('daily-reset', dailyReset), {
  timezone: TZ,
});
log.info('Registered: daily-reset (0 0 * * *)');

// Daily digest: 8 AM EST
cron.schedule('0 8 * * *', safeJob('daily-digest', sendDailyDigest), {
  timezone: TZ,
});
log.info('Registered: daily-digest (0 8 * * *)');

// Hygiene: daily at 3 AM EST
cron.schedule('0 3 * * *', safeJob('hygiene', runHygiene), {
  timezone: TZ,
});
log.info('Registered: hygiene (0 3 * * *)');

// Dedup scanner: weekly Sunday 2 AM EST
cron.schedule('0 2 * * 0', safeJob('dedup-scanner', runDedupScan), {
  timezone: TZ,
});
log.info('Registered: dedup-scanner (0 2 * * 0)');

// Analytics rollup: daily at 1 AM EST
cron.schedule('0 1 * * *', safeJob('analytics-rollup', rollupAnalytics), {
  timezone: TZ,
});
log.info('Registered: analytics-rollup (0 1 * * *)');

// Health check: daily at 6 AM EST
cron.schedule('0 6 * * *', safeJob('health-check', runHealthCheck), {
  timezone: TZ,
});
log.info('Registered: health-check (0 6 * * *)');

// Warm follow-up: daily at 11 AM EST, Mon-Fri
cron.schedule('0 11 * * 1-5', safeJob('warm-follow-up', runWarmFollowUp), {
  timezone: TZ,
});
log.info('Registered: warm-follow-up (0 11 * * 1-5)');

log.info('');
log.info('All 13 cron jobs registered. Outreach Worker is running.');
log.info('Press Ctrl+C to stop.');

// ─── Graceful Shutdown ──────────────────────────────────────────

process.on('SIGINT', async () => {
  log.info('Received SIGINT. Shutting down gracefully...');
  await shutdownDb();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.info('Received SIGTERM. Shutting down gracefully...');
  await shutdownDb();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error(`Unhandled rejection: ${reason}`);
});
