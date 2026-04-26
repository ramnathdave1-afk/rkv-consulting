import { promises as dns } from 'dns';
import * as net from 'net';
import { query, ORG_ID } from './db';

export interface VerificationResult {
  email: string;
  status: 'valid' | 'invalid' | 'risky' | 'catch_all';
  reason: string;
}

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'discard.email', 'temp-mail.org', 'fakeinbox.com', '10minutemail.com',
]);

export async function verifyEmail(email: string): Promise<VerificationResult> {
  const lower = email.toLowerCase().trim();

  // Basic format check
  if (!isValidFormat(lower)) {
    return { email: lower, status: 'invalid', reason: 'Invalid email format' };
  }

  const domain = lower.split('@')[1];

  // Check disposable
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { email: lower, status: 'invalid', reason: 'Disposable email domain' };
  }

  // Check suppression list
  const suppressed = await query(
    `SELECT id FROM outreach_suppression WHERE org_id = $1 AND email = $2`,
    [ORG_ID, lower]
  );
  if (suppressed.rows.length > 0) {
    return { email: lower, status: 'invalid', reason: 'On suppression list' };
  }

  // MX record check
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { email: lower, status: 'invalid', reason: 'No MX records found' };
    }

    // Sort by priority
    mxRecords.sort((a, b) => a.priority - b.priority);
    const mxHost = mxRecords[0].exchange;

    // SMTP verification
    const smtpResult = await smtpCheck(lower, mxHost);
    return smtpResult;
  } catch (err) {
    return { email: lower, status: 'risky', reason: `DNS lookup failed: ${(err as Error).message}` };
  }
}

export async function verifyBatch(emails: string[]): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  // Process in batches of 5 to avoid overwhelming DNS/SMTP
  for (let i = 0; i < emails.length; i += 5) {
    const batch = emails.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(verifyEmail));
    results.push(...batchResults);
  }
  return results;
}

function isValidFormat(email: string): boolean {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
}

function smtpCheck(email: string, mxHost: string): Promise<VerificationResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ email, status: 'risky', reason: 'SMTP timeout' });
    }, 10000);

    const socket = net.createConnection(25, mxHost);
    let step = 0;
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();

      if (step === 0 && buffer.includes('220')) {
        step = 1;
        socket.write('EHLO rkvconsulting.com\r\n');
        buffer = '';
      } else if (step === 1 && buffer.includes('250')) {
        step = 2;
        socket.write('MAIL FROM:<verify@rkvconsulting.com>\r\n');
        buffer = '';
      } else if (step === 2 && buffer.includes('250')) {
        step = 3;
        socket.write(`RCPT TO:<${email}>\r\n`);
        buffer = '';
      } else if (step === 3) {
        clearTimeout(timeout);
        socket.write('QUIT\r\n');
        socket.end();

        if (buffer.includes('250')) {
          resolve({ email, status: 'valid', reason: 'SMTP accepted' });
        } else if (buffer.includes('550') || buffer.includes('553') || buffer.includes('511')) {
          resolve({ email, status: 'invalid', reason: 'SMTP rejected: mailbox not found' });
        } else if (buffer.includes('252') || buffer.includes('451')) {
          resolve({ email, status: 'catch_all', reason: 'Catch-all domain detected' });
        } else {
          resolve({ email, status: 'risky', reason: `SMTP response: ${buffer.slice(0, 100)}` });
        }
      }
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve({ email, status: 'risky', reason: 'SMTP connection error' });
    });

    socket.on('timeout', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve({ email, status: 'risky', reason: 'SMTP timeout' });
    });

    socket.setTimeout(10000);
  });
}
