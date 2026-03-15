/**
 * Meridian Node Worker — Autonomous Agent Scheduler
 * Runs on Railway via node-cron.
 *
 * Schedule:
 * - Alpha (Grid Scanner): every 6 hours
 * - Beta (Parcel Analyzer): every 4 hours
 * - Gamma (Risk Scorer): every 2 hours
 * - Delta (Market Intel): twice daily (6am, 6pm UTC)
 */

import cron from 'node-cron';
import { runAlpha } from './agents/alpha.js';
import { runBeta } from './agents/beta.js';
import { runGamma } from './agents/gamma.js';
import { runDelta } from './agents/delta.js';

console.log('='.repeat(50));
console.log('  Meridian Node Worker — Starting');
console.log('  Autonomous Agent Scheduler');
console.log('='.repeat(50));
console.log();

// Agent Alpha — every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('[CRON] Running Agent Alpha — Grid Scanner');
  await runAlpha();
});

// Agent Beta — every 4 hours
cron.schedule('0 */4 * * *', async () => {
  console.log('[CRON] Running Agent Beta — Parcel Analyzer');
  await runBeta();
});

// Agent Gamma — every 2 hours
cron.schedule('0 */2 * * *', async () => {
  console.log('[CRON] Running Agent Gamma — Risk Scorer');
  await runGamma();
});

// Agent Delta — twice daily (6am, 6pm UTC)
cron.schedule('0 6,18 * * *', async () => {
  console.log('[CRON] Running Agent Delta — Market Intel');
  await runDelta();
});

console.log('Agent schedules:');
console.log('  Alpha (Grid Scanner):    every 6 hours');
console.log('  Beta (Parcel Analyzer):  every 4 hours');
console.log('  Gamma (Risk Scorer):     every 2 hours');
console.log('  Delta (Market Intel):    6am & 6pm UTC');
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
