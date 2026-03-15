/**
 * Meridian Node Worker — Autonomous Agent & Ingestion Scheduler
 * Runs on Railway via node-cron.
 *
 * Agent Schedule:
 * - Alpha (Infrastructure Scanner): every 6 hours
 * - Beta (Site Discovery):          every 4 hours
 * - Gamma (Multi-Dimension Scorer): every 2 hours
 * - Delta (Market Intelligence):    twice daily (6am, 6pm UTC)
 *
 * Ingestion Schedule:
 * - Zeta (Data Ingestion):          weekly (Sunday 3am UTC)
 */

import cron from 'node-cron';
import { runAlpha } from './agents/alpha.js';
import { runBeta } from './agents/beta.js';
import { runGamma } from './agents/gamma.js';
import { runDelta } from './agents/delta.js';
import { runEpsilon } from './agents/epsilon.js';
import { runScheduledIngestion } from './ingestion/runner.js';

console.log('='.repeat(50));
console.log('  Meridian Node Worker — Starting');
console.log('  Agent & Ingestion Scheduler');
console.log('='.repeat(50));
console.log();

// Agent Alpha — every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('[CRON] Running Agent Alpha — Infrastructure Scanner');
  await runAlpha();
});

// Agent Beta — every 4 hours
cron.schedule('0 */4 * * *', async () => {
  console.log('[CRON] Running Agent Beta — Site Discovery');
  await runBeta();
});

// Agent Gamma — every 2 hours
cron.schedule('0 */2 * * *', async () => {
  console.log('[CRON] Running Agent Gamma — Multi-Dimension Scorer');
  await runGamma();
});

// Agent Delta — twice daily (6am, 6pm UTC)
cron.schedule('0 6,18 * * *', async () => {
  console.log('[CRON] Running Agent Delta — Market Intelligence');
  await runDelta();
});

// Agent Epsilon — daily (8am UTC)
cron.schedule('0 8 * * *', async () => {
  console.log('[CRON] Running Agent Epsilon — Feasibility Analyzer');
  await runEpsilon();
});

// Data Ingestion — weekly (Sunday 3am UTC)
cron.schedule('0 3 * * 0', async () => {
  console.log('[CRON] Running scheduled data ingestion');
  await runScheduledIngestion();
});

console.log('Agent schedules:');
console.log('  Alpha (Infrastructure Scanner):  every 6 hours');
console.log('  Beta (Site Discovery):           every 4 hours');
console.log('  Gamma (Multi-Dimension Scorer):  every 2 hours');
console.log('  Delta (Market Intelligence):     6am & 6pm UTC');
console.log('  Epsilon (Feasibility Analyzer):  daily 8am UTC');
console.log('  Zeta (Data Ingestion):           Sunday 3am UTC');
console.log();

// Run all agents once on startup
async function initialRun() {
  console.log('[STARTUP] Running initial agent sweep...');
  console.log();

  try {
    await runAlpha();
    console.log();
    await runBeta();
    console.log();
    await runGamma();
    console.log();
    await runDelta();
    console.log();
    console.log('[STARTUP] Initial sweep complete. Scheduler active.');
  } catch (err) {
    console.error('[STARTUP] Error during initial run:', err);
  }
}

initialRun();
