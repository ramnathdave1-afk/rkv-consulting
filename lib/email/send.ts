import { Resend } from 'resend';
import { captureException, captureMessage } from '@/lib/monitoring/sentry';
import { getBrandForOrg, DEFAULT_BRAND, type Brand } from '@/lib/branding/get-brand';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@rkv-consulting.com';

interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
  /** Optional org context — when provided, the email is wrapped with that org's brand. */
  orgId?: string | null;
  /** Pre-resolved brand (skip DB lookup). Takes precedence over orgId. */
  brand?: Brand;
  template?: string;
}

/**
 * Send a transactional email. When `orgId` (or `brand`) is supplied, the body
 * is wrapped in that org's brand chrome (header logo + colored bar + footer
 * signature) and the From line uses the org's sender name + reply-to.
 *
 * Without an org, RKV defaults are used so existing callers keep working.
 */
export async function sendEmail({
  to,
  subject,
  html,
  orgId,
  brand: brandOverride,
  template: _template,
}: SendEmailOpts) {
  try {
    const brand: Brand = brandOverride
      ? brandOverride
      : orgId
        ? await getBrandForOrg(orgId)
        : DEFAULT_BRAND;

    const wrappedHtml = wrapEmailTemplate(html, brand);
    const fromAddress = brand.email_reply_to || FROM_EMAIL;
    const fromLine = `${brand.email_sender_name} <${fromAddress}>`;

    const { data, error } = await resend.emails.send({
      from: fromLine,
      to,
      subject,
      html: wrappedHtml,
      replyTo: fromAddress,
    });

    if (error) {
      captureMessage('Email send failed', 'error', { error: String(error), to });
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    captureException(err, { module: 'email', to });
    return { success: false, error: err };
  }
}

/**
 * Wrap an HTML body with branded header + footer. If the body already includes
 * a full <html> document (e.g., a layout() template) we return it unchanged so
 * we don't double-wrap.
 */
export function wrapEmailTemplate(body: string, brand: Brand): string {
  const looksLikeFullDoc = /<html[\s>]/i.test(body) || /<!doctype/i.test(body);
  if (looksLikeFullDoc) return body;

  const safeName = escapeHtml(brand.name);
  const logo = brand.logo_url
    ? `<img src="${escapeAttr(brand.logo_url)}" alt="${safeName}" style="max-height: 48px; display: block; margin: 0 auto;" />`
    : `<div style="font-size: 22px; font-weight: 700; color: #ffffff;">${safeName}</div>`;

  return `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;padding:24px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <tr><td style="background:${escapeAttr(brand.primary_color)};padding:24px;text-align:center;">
              ${logo}
            </td></tr>
            <tr><td style="padding:32px;color:#1a1a2e;font-size:14px;line-height:1.6;">
              ${body}
            </td></tr>
            <tr><td style="background:#f8f8fa;padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
              ${escapeHtml(brand.email_signature)}
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
  `;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export function stageTransitionEmail(
  siteName: string,
  fromStage: string,
  toStage: string,
  movedBy: string,
) {
  return {
    subject: `[RKV Consulting] ${siteName} moved to ${toStage.replace('_', ' ')}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; background: #06080C; color: #F0F2F5; padding: 32px; border-radius: 12px;">
        <h2 style="color: #00D4AA; margin: 0 0 16px;">Pipeline Update</h2>
        <p style="margin: 0 0 8px;"><strong>${siteName}</strong> has been moved:</p>
        <p style="margin: 0 0 24px; color: #8B95A5;">
          ${fromStage?.replace('_', ' ') || 'New'} → <span style="color: #00D4AA;">${toStage.replace('_', ' ')}</span>
        </p>
        <p style="margin: 0; font-size: 12px; color: #4A5568;">
          Moved by ${movedBy} · ${new Date().toLocaleDateString()}
        </p>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;" />
        <p style="margin: 0; font-size: 11px; color: #4A5568;">RKV Consulting by RKV Consulting LLC</p>
      </div>
    `,
  };
}
