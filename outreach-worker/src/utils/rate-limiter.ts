import { createModuleLogger } from './logger.js';

const log = createModuleLogger('rate-limiter');

interface SendRecord {
  lastSendAt: number;
  count: number;
}

const sendHistory = new Map<string, SendRecord>();

/** Minimum delay between sends: 60-90 seconds (randomized) */
function getMinDelay(): number {
  return 60_000 + Math.random() * 30_000;
}

/**
 * Check if a sending account is allowed to send right now.
 */
export function canSend(accountId: string): boolean {
  const record = sendHistory.get(accountId);
  if (!record) return true;

  const elapsed = Date.now() - record.lastSendAt;
  const minDelay = getMinDelay();

  if (elapsed < minDelay) {
    log.debug(`Account ${accountId} rate-limited. ${Math.ceil((minDelay - elapsed) / 1000)}s remaining.`);
    return false;
  }

  return true;
}

/**
 * Record that a send was made from this account.
 */
export function recordSend(accountId: string): void {
  const existing = sendHistory.get(accountId);
  sendHistory.set(accountId, {
    lastSendAt: Date.now(),
    count: (existing?.count || 0) + 1,
  });
}

/**
 * Get the number of seconds until the account can send again.
 * Returns 0 if the account can send now.
 */
export function secondsUntilCanSend(accountId: string): number {
  const record = sendHistory.get(accountId);
  if (!record) return 0;

  const elapsed = Date.now() - record.lastSendAt;
  const minDelay = 75_000; // Use midpoint for estimate
  const remaining = minDelay - elapsed;

  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Reset the rate limiter for an account (e.g., at start of day).
 */
export function resetAccount(accountId: string): void {
  sendHistory.delete(accountId);
}

/**
 * Reset all rate limiter state.
 */
export function resetAll(): void {
  sendHistory.clear();
}
