import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@rkvconsulting.com';

export async function sendEmail({
  to,
  subject,
  html,
  template,
}: {
  to: string;
  subject: string;
  html: string;
  template?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: `RKV Consulting <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send:', error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[Email] Exception:', err);
    return { success: false, error: err };
  }
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
