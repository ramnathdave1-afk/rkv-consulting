/**
 * Sentry Error Tracking Setup
 * Captures errors in both frontend and API routes.
 * Configure NEXT_PUBLIC_SENTRY_DSN and SENTRY_DSN env vars.
 */

interface SentryEvent {
  message: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id: string; email?: string; org_id?: string };
}

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export function captureException(error: Error, context?: Partial<SentryEvent>): void {
  if (!SENTRY_DSN) {
    console.error('[Sentry stub]', error.message, context);
    return;
  }

  // In production, this would use @sentry/nextjs SDK
  // For now, log to console and send to Sentry ingest API
  const event = {
    exception: {
      values: [{
        type: error.name,
        value: error.message,
        stacktrace: { frames: parseStack(error.stack) },
      }],
    },
    level: context?.level || 'error',
    tags: context?.tags || {},
    extra: context?.extra || {},
    user: context?.user,
    environment: process.env.NODE_ENV || 'development',
    platform: 'node',
  };

  sendToSentry(event).catch(console.error);
}

export function captureMessage(message: string, level: SentryEvent['level'] = 'info', context?: Partial<SentryEvent>): void {
  if (!SENTRY_DSN) {
    console.log(`[Sentry stub] [${level}]`, message);
    return;
  }

  const event = {
    message: { formatted: message },
    level,
    tags: context?.tags || {},
    extra: context?.extra || {},
    user: context?.user,
    environment: process.env.NODE_ENV || 'development',
    platform: 'node',
  };

  sendToSentry(event).catch(console.error);
}

export function setUser(user: { id: string; email?: string; org_id?: string }): void {
  // In production with @sentry/nextjs, this would call Sentry.setUser()
  if (!SENTRY_DSN) return;
  globalThis.__sentryUser = user;
}

async function sendToSentry(event: Record<string, unknown>): Promise<void> {
  if (!SENTRY_DSN) return;

  try {
    const url = new URL(SENTRY_DSN);
    const projectId = url.pathname.replace('/', '');
    const publicKey = url.username;
    const ingestUrl = `https://${url.host}/api/${projectId}/store/?sentry_key=${publicKey}&sentry_version=7`;

    await fetch(ingestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch {
    // Sentry reporting should never crash the app
  }
}

function parseStack(stack?: string): { filename: string; function: string; lineno: number }[] {
  if (!stack) return [];
  return stack.split('\n').slice(1, 10).map((line) => {
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+)/);
    return {
      filename: match?.[2] || 'unknown',
      function: match?.[1] || 'anonymous',
      lineno: Number(match?.[3]) || 0,
    };
  });
}

declare global {
  // eslint-disable-next-line no-var
  var __sentryUser: { id: string; email?: string; org_id?: string } | undefined;
}
