/**
 * Outage alerts.
 *
 * Fires Slack + email + Sentry notifications when a component crosses the
 * "down for 3 consecutive checks" threshold. Each channel is best-effort and
 * silently no-ops when its env var is not configured.
 */
import { captureException } from '@/lib/monitoring/sentry';

interface AlertContext {
  component: string;
  error?: string;
  consecutive_failures?: number;
}

async function notifySlack({ component, error, consecutive_failures }: AlertContext) {
  const url = process.env.SLACK_ALERTS_WEBHOOK_URL;
  if (!url) return;
  const payload = {
    text: `:rotating_light: ALERT: ${component} is DOWN`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `*Component:* ${component}`,
            `*Consecutive failures:* ${consecutive_failures ?? 'n/a'}`,
            `*Error:* ${error ?? 'unknown'}`,
            `*Time:* ${new Date().toISOString()}`,
          ].join('\n'),
        },
      },
    ],
  };
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    // Don't let alert failures break the cron — just record to Sentry.
    captureException(err, { where: 'notifySlack', component });
  }
}

async function notifyEmail({ component, error, consecutive_failures }: AlertContext) {
  const to = process.env.ALERT_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!to || !apiKey) return;

  const subject = `[ALERT] ${component} is DOWN`;
  const html = `
    <h2 style="font-family: sans-serif; color: #b91c1c;">${component} is DOWN</h2>
    <p style="font-family: sans-serif;">Consecutive failures: <strong>${consecutive_failures ?? 'n/a'}</strong></p>
    <p style="font-family: sans-serif;">Error: <code>${error ?? 'unknown'}</code></p>
    <p style="font-family: sans-serif;">Time: ${new Date().toISOString()}</p>
    <p style="font-family: sans-serif;">
      <a href="https://rkv-consulting.com/status">View status page</a>
    </p>
  `;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL ?? 'alerts@rkv-consulting.com',
        to,
        subject,
        html,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    captureException(err, { where: 'notifyEmail', component });
  }
}

export async function fireDownAlert(
  component: string,
  error: string,
  consecutive_failures = 3,
): Promise<void> {
  const ctx: AlertContext = { component, error, consecutive_failures };

  // Sentry — always (safe no-op if DSN missing)
  captureException(new Error(`${component} is DOWN`), ctx as unknown as Record<string, unknown>);

  await Promise.allSettled([notifySlack(ctx), notifyEmail(ctx)]);
}

export async function fireRecoveryAlert(component: string): Promise<void> {
  const url = process.env.SLACK_ALERTS_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:white_check_mark: ${component} has RECOVERED`,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    captureException(err, { where: 'fireRecoveryAlert', component });
  }
}
