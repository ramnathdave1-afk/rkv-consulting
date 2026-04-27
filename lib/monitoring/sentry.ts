/**
 * Sentry Error Tracking Wrapper.
 * Uses @sentry/nextjs when SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is set.
 */
import * as Sentry from '@sentry/nextjs';

interface SentryEvent {
  message: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id: string; email?: string; org_id?: string };
}

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export function captureException(error: Error, context?: Partial<SentryEvent>): void {
  if (!DSN) {
    console.error('[Sentry stub]', error.message, context);
    return;
  }
  Sentry.captureException(error, {
    level: context?.level,
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
  });
}

export function captureMessage(
  message: string,
  level: SentryEvent['level'] = 'info',
  context?: Partial<SentryEvent>,
): void {
  if (!DSN) {
    console.log(`[Sentry stub] [${level}]`, message);
    return;
  }
  Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
  });
}

export function setUser(user: { id: string; email?: string; org_id?: string }): void {
  if (!DSN) return;
  Sentry.setUser({ id: user.id, email: user.email, org_id: user.org_id });
}
