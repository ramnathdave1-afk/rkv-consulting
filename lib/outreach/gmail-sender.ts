import { query, ORG_ID } from './db';
import { refreshGmailToken, sendEmail as gmailSend, type GmailCredentials } from '../integrations/gmail';
import { injectTrackingPixel, rewriteLinks } from './tracking';
import { withRetry } from './retry';
import type { OutreachDomain } from './types';

const WARMUP_LIMITS: Record<string, number> = {
  week1: 5,
  week2: 10,
  week3: 15,
  week4: 20,
  week5: 25,
  ready: 25,
};

export interface SendResult {
  messageId: string;
  threadId?: string;
  sendingAccount: string;
}

export async function getAvailableAccount(): Promise<OutreachDomain | null> {
  const result = await query<OutreachDomain>(
    `SELECT * FROM outreach_domains
     WHERE org_id = $1
       AND status IN ('active', 'warming')
       AND current_daily_count < daily_limit
       AND bounce_rate < 5
     ORDER BY current_daily_count ASC, RANDOM()
     LIMIT 1`,
    [ORG_ID]
  );
  return result.rows[0] || null;
}

export async function getAllAccounts(): Promise<OutreachDomain[]> {
  const result = await query<OutreachDomain>(
    `SELECT * FROM outreach_domains WHERE org_id = $1 ORDER BY email_address`,
    [ORG_ID]
  );
  return result.rows;
}

async function getCredentials(domain: OutreachDomain): Promise<GmailCredentials> {
  if (!domain.oauth_credentials) {
    throw new Error(`No OAuth credentials for ${domain.email_address}`);
  }

  const creds = domain.oauth_credentials as unknown as GmailCredentials;

  // Refresh if expired (with 5 min buffer)
  if (creds.expires_at < Date.now() + 300_000) {
    const refreshed = await refreshGmailToken(creds.refresh_token);
    // Save refreshed tokens
    await query(
      `UPDATE outreach_domains SET oauth_credentials = $1 WHERE id = $2`,
      [JSON.stringify(refreshed), domain.id]
    );
    return refreshed;
  }

  return creds;
}

export async function sendTrackedEmail(
  domain: OutreachDomain,
  to: string,
  subject: string,
  htmlBody: string,
  sendId: string,
  opts?: { replyToMessageId?: string; threadId?: string }
): Promise<SendResult> {
  const creds = await getCredentials(domain);
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  // CAN-SPAM: bail if recipient has unsubscribed.
  const suppressed = await query<{ id: string }>(
    `SELECT id FROM outreach_unsubscribes WHERE org_id = $1 AND lower(email) = lower($2) LIMIT 1`,
    [ORG_ID, to]
  );
  if (suppressed.rows.length > 0) {
    throw new Error(`Recipient ${to} has unsubscribed`);
  }

  const unsubscribeUrl = `${baseUrl}/api/outreach/unsubscribe?email=${encodeURIComponent(to)}&token=${encodeURIComponent(sendId)}`;
  const physicalAddress =
    process.env.OUTREACH_PHYSICAL_ADDRESS ||
    'RKV Consulting, 123 Main St, Phoenix, AZ 85001';
  const unsubscribeMailto =
    process.env.OUTREACH_UNSUBSCRIBE_MAILTO ||
    `unsubscribe@${domain.email_address.split('@')[1] || 'rkv-consulting.com'}`;

  // Inject tracking
  let trackedHtml = injectTrackingPixel(htmlBody, sendId, baseUrl);
  trackedHtml = rewriteLinks(trackedHtml, sendId, baseUrl);

  // CAN-SPAM-compliant footer: company name, physical address, unsubscribe link.
  trackedHtml += `
    <br><br>
    <div style="font-size:13px;color:#666;border-top:1px solid #eee;padding-top:12px;margin-top:12px;">
      <strong>${domain.display_name || 'Dave Ramnath'}</strong><br>
      RKV Consulting<br>
      <a href="https://rkv-consulting.com" style="color:#2563eb;">rkv-consulting.com</a>
    </div>
    <div style="font-size:11px;color:#999;margin-top:16px;">
      ${physicalAddress}<br>
      Don't want these emails? <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a>.
    </div>
  `;

  // Build raw email with proper headers
  const headers = [
    `To: ${to}`,
    `From: ${domain.display_name || 'Dave'} <${domain.email_address}>`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `List-Unsubscribe: <${unsubscribeUrl}>, <mailto:${unsubscribeMailto}?subject=unsubscribe>`,
    'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
  ];

  if (opts?.replyToMessageId) {
    headers.push(`In-Reply-To: ${opts.replyToMessageId}`);
    headers.push(`References: ${opts.replyToMessageId}`);
  }

  const rawEmail = headers.join('\r\n') + '\r\n\r\n' + trackedHtml;
  const encoded = Buffer.from(rawEmail)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const data = await withRetry(async () => {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encoded,
        threadId: opts?.threadId || undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gmail send error (${response.status}): ${err}`);
    }

    return response.json();
  });

  // Increment daily count
  await query(
    `UPDATE outreach_domains SET current_daily_count = current_daily_count + 1 WHERE id = $1`,
    [domain.id]
  );

  return {
    messageId: data.id,
    threadId: data.threadId,
    sendingAccount: domain.email_address,
  };
}

export async function advanceWarmup(domainId: string): Promise<void> {
  const result = await query<OutreachDomain>(
    `SELECT * FROM outreach_domains WHERE id = $1`,
    [domainId]
  );
  const domain = result.rows[0];
  if (!domain) return;

  const newDay = domain.warmup_day + 1;
  let newStage = domain.warmup_stage;
  let newLimit = domain.daily_limit;

  if (newDay >= 35) {
    newStage = 'ready';
    newLimit = 25;
  } else if (newDay >= 28) {
    newStage = 'week5';
    newLimit = WARMUP_LIMITS.week5;
  } else if (newDay >= 21) {
    newStage = 'week4';
    newLimit = WARMUP_LIMITS.week4;
  } else if (newDay >= 14) {
    newStage = 'week3';
    newLimit = WARMUP_LIMITS.week3;
  } else if (newDay >= 7) {
    newStage = 'week2';
    newLimit = WARMUP_LIMITS.week2;
  }

  const newStatus = newStage === 'ready' ? 'active' : 'warming';

  await query(
    `UPDATE outreach_domains
     SET warmup_day = $1, warmup_stage = $2, daily_limit = $3, status = $4
     WHERE id = $5`,
    [newDay, newStage, newLimit, newStatus, domainId]
  );
}

export function randomDelay(minMs: number = 30000, maxMs: number = 90000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export function isWithinSendWindow(recipientTimezone?: string): boolean {
  const tz = recipientTimezone || 'America/New_York';
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(now));
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
    });
    const day = dayFormatter.format(now);

    // No Sundays, 7am-6pm only
    if (day === 'Sun') return false;
    return hour >= 7 && hour < 18;
  } catch {
    return true; // Default to allowing send if timezone parsing fails
  }
}
