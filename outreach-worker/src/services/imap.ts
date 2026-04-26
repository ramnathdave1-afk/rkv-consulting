import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import type { SendingAccount } from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('imap');

interface ParsedReply {
  from: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyTo?: string;
  messageId?: string;
  date: Date;
}

/**
 * Create an IMAP connection for a sending account.
 */
function createImapConnection(account: SendingAccount): Imap {
  const config: Imap.Config = {
    user: account.email,
    password: '',
    host: account.imap_host,
    port: account.imap_port,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 10000,
    connTimeout: 10000,
  };

  if (account.auth_type === 'oauth2') {
    config.xoauth2 = buildXOAuth2Token(account.email, account.access_token || '');
  } else {
    config.password = account.password || '';
  }

  return new Imap(config);
}

/**
 * Build an XOAuth2 token string for IMAP authentication.
 */
function buildXOAuth2Token(user: string, accessToken: string): string {
  const authString = `user=${user}\x01auth=Bearer ${accessToken}\x01\x01`;
  return Buffer.from(authString).toString('base64');
}

/**
 * Connect to IMAP and fetch new emails since a given date.
 */
export async function fetchNewEmails(
  account: SendingAccount,
  since: Date
): Promise<ParsedReply[]> {
  return new Promise((resolve, reject) => {
    const imap = createImapConnection(account);
    const results: ParsedReply[] = [];
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { imap.end(); } catch { /* ignore */ }
        reject(new Error(`IMAP timeout for ${account.email}`));
      }
    }, 30000);

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err) => {
        if (err) {
          clearTimeout(timeout);
          resolved = true;
          imap.end();
          return reject(err);
        }

        const searchDate = since.toISOString().split('T')[0];
        imap.search(['UNSEEN', ['SINCE', searchDate]], (searchErr, uids) => {
          if (searchErr) {
            clearTimeout(timeout);
            resolved = true;
            imap.end();
            return reject(searchErr);
          }

          if (!uids || uids.length === 0) {
            clearTimeout(timeout);
            resolved = true;
            imap.end();
            return resolve([]);
          }

          log.info(`Found ${uids.length} new emails for ${account.email}`);

          const fetch = imap.fetch(uids, {
            bodies: '',
            struct: true,
          });

          let pending = 0;

          fetch.on('message', (msg) => {
            pending++;
            let rawBuffer = Buffer.alloc(0);

            msg.on('body', (stream) => {
              const chunks: Buffer[] = [];
              stream.on('data', (chunk: Buffer) => chunks.push(chunk));
              stream.on('end', () => {
                rawBuffer = Buffer.concat(chunks);
              });
            });

            msg.once('end', async () => {
              try {
                const parsed = await parseRawEmail(rawBuffer);
                if (parsed) results.push(parsed);
              } catch (parseErr) {
                log.warn(`Failed to parse email for ${account.email}: ${parseErr}`);
              }
              pending--;
              if (pending === 0) {
                clearTimeout(timeout);
                resolved = true;
                imap.end();
                resolve(results);
              }
            });
          });

          fetch.once('error', (fetchErr) => {
            log.error(`IMAP fetch error for ${account.email}: ${fetchErr}`);
            if (!resolved) {
              clearTimeout(timeout);
              resolved = true;
              imap.end();
              reject(fetchErr);
            }
          });

          fetch.once('end', () => {
            // If no messages were processed
            if (pending === 0 && !resolved) {
              clearTimeout(timeout);
              resolved = true;
              imap.end();
              resolve(results);
            }
          });
        });
      });
    });

    imap.once('error', (imapErr: Error) => {
      log.error(`IMAP connection error for ${account.email}: ${imapErr.message}`);
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        reject(imapErr);
      }
    });

    imap.connect();
  });
}

/**
 * Parse a raw email buffer into a structured reply object.
 */
async function parseRawEmail(raw: Buffer): Promise<ParsedReply | null> {
  try {
    const parsed: ParsedMail = await simpleParser(raw);

    const from =
      parsed.from?.value?.[0]?.address || parsed.from?.text || '';

    if (!from) return null;

    return {
      from,
      subject: parsed.subject || '',
      bodyText: parsed.text || '',
      bodyHtml: parsed.html || undefined,
      inReplyTo: parsed.inReplyTo,
      messageId: parsed.messageId,
      date: parsed.date || new Date(),
    };
  } catch (error) {
    log.error(`Email parse error: ${error}`);
    return null;
  }
}

/**
 * Extract the reply text, stripping quoted content.
 */
export function extractReplyText(bodyText: string): string {
  const lines = bodyText.split('\n');
  const replyLines: string[] = [];

  for (const line of lines) {
    // Stop at common quote markers
    if (
      line.startsWith('>') ||
      line.startsWith('On ') && line.includes(' wrote:') ||
      line.startsWith('---') ||
      line.startsWith('From:') ||
      line.match(/^-{2,}\s*Original Message\s*-{2,}/i) ||
      line.match(/^_{2,}/)
    ) {
      break;
    }
    replyLines.push(line);
  }

  return replyLines.join('\n').trim();
}
