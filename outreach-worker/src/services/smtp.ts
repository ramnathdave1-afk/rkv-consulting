import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { SendingAccount } from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('smtp');

const transportCache = new Map<string, Transporter>();

/**
 * Create or retrieve a cached Nodemailer transport for a sending account.
 */
export function createTransport(account: SendingAccount): Transporter {
  const cached = transportCache.get(account.id);
  if (cached) return cached;

  let auth: Record<string, unknown>;

  // Use OAuth2 if we have a refresh token, otherwise basic SMTP auth
  const oauthToken = (account as any).oauth_refresh_token ?? (account as any).refresh_token;
  const password = (account as any).smtp_password_encrypted ?? (account as any).password;
  const smtpUser = (account as any).smtp_user ?? account.email;

  if (oauthToken) {
    auth = {
      type: 'OAuth2',
      user: account.email,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: oauthToken,
      accessToken: (account as any).access_token,
    };
  } else {
    auth = {
      user: smtpUser,
      pass: password,
    };
  }

  const transport = nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    auth: auth as any,
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
    rateDelta: 60000,
    rateLimit: 1,
  });

  transportCache.set(account.id, transport);
  log.info(`SMTP transport created for ${account.email}`);

  return transport;
}

/**
 * Send an email through a sending account.
 */
export async function sendEmail(
  account: SendingAccount,
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string,
  messageId: string,
  replyTo?: string
): Promise<{ success: boolean; messageId: string; error?: string }> {
  try {
    const transport = createTransport(account);

    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: account.display_name,
        address: account.email,
      },
      to,
      subject,
      html: htmlBody,
      text: textBody,
      messageId: `<${messageId}@${account.email.split('@')[1]}>`,
      headers: {
        'List-Unsubscribe': `<mailto:${account.email}?subject=unsubscribe>`,
        'X-Mailer': 'RKV-Outreach/1.0',
        'Precedence': 'bulk',
      },
    };

    if (replyTo) {
      mailOptions.inReplyTo = replyTo;
      mailOptions.references = replyTo;
    }

    const info = await transport.sendMail(mailOptions);
    log.info(`Email sent to ${to} via ${account.email}`, { messageId: info.messageId });

    return { success: true, messageId: info.messageId || messageId };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error(`Failed to send email to ${to} via ${account.email}: ${errMsg}`);

    // If auth error, clear cached transport
    if (errMsg.includes('auth') || errMsg.includes('token') || errMsg.includes('credentials')) {
      transportCache.delete(account.id);
    }

    return { success: false, messageId, error: errMsg };
  }
}

/**
 * Verify SMTP connection for a sending account.
 */
export async function verifyConnection(account: SendingAccount): Promise<boolean> {
  try {
    const transport = createTransport(account);
    await transport.verify();
    log.info(`SMTP connection verified for ${account.email}`);
    return true;
  } catch (error) {
    log.error(`SMTP verification failed for ${account.email}: ${error}`);
    transportCache.delete(account.id);
    return false;
  }
}

/**
 * Close all cached transports (for graceful shutdown).
 */
export function closeAllTransports(): void {
  for (const [id, transport] of transportCache.entries()) {
    transport.close();
    log.info(`Transport closed for account ${id}`);
  }
  transportCache.clear();
}
