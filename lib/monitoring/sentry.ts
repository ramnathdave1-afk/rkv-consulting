/**
 * Sentry Error Tracking Wrapper.
 * Uses @sentry/nextjs when SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is set.
 * No-op when DSN is missing — safe to call from anywhere.
 */
import * as Sentry from '@sentry/nextjs';

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>,
): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

export function setUser(user: { id: string; email?: string; org_id?: string }): void {
  Sentry.setUser({ id: user.id, email: user.email, org_id: user.org_id });
}

export function clearUser(): void {
  Sentry.setUser(null);
}
