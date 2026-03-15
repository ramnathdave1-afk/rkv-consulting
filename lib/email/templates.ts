/**
 * Email Templates — HTML templates for transactional emails.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://meridian-node.vercel.app';

function layout(content: string) {
  return `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #06080C; color: #F0F2F5; padding: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background: rgba(0,212,170,0.1); padding: 6px 12px; border-radius: 8px; font-size: 14px; font-weight: 700; color: #00D4AA;">M</span>
        <span style="margin-left: 8px; font-size: 14px; font-weight: 700; color: #F0F2F5;">Meridian Node</span>
      </div>
      ${content}
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 28px 0 16px;" />
      <p style="margin: 0; font-size: 11px; color: #4A5568; text-align: center;">
        Meridian Node by RKV Consulting LLC · <a href="${BASE_URL}" style="color: #00D4AA; text-decoration: none;">meridiannode.io</a>
      </p>
    </div>
  `;
}

function button(text: string, url: string) {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" style="display: inline-block; background: #00D4AA; color: #06080C; font-size: 13px; font-weight: 600; padding: 10px 24px; border-radius: 8px; text-decoration: none;">
        ${text}
      </a>
    </div>
  `;
}

export function welcomeEmail(name: string) {
  return {
    subject: 'Welcome to Meridian Node',
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Welcome, ${name}!</h2>
      <p style="margin: 0 0 12px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Your Meridian Node account is ready. Start exploring AI-powered land infrastructure intelligence.
      </p>
      <p style="margin: 0 0 8px; font-size: 13px; color: #8B95A5;">Here's what you can do:</p>
      <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 13px; color: #8B95A5; line-height: 1.8;">
        <li>Add sites and get instant five-dimension scores</li>
        <li>Run AI feasibility analyses</li>
        <li>Explore the 3D infrastructure map</li>
        <li>Track your pipeline with Kanban boards</li>
      </ul>
      ${button('Open Dashboard', `${BASE_URL}/dashboard`)}
    `),
  };
}

export function invitationEmail(inviterName: string, orgName: string, inviteUrl: string) {
  return {
    subject: `${inviterName} invited you to ${orgName} on Meridian Node`,
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">You've been invited</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        <strong style="color: #F0F2F5;">${inviterName}</strong> has invited you to join <strong style="color: #F0F2F5;">${orgName}</strong> on Meridian Node — an AI-powered land infrastructure intelligence platform.
      </p>
      ${button('Accept Invitation', inviteUrl)}
      <p style="margin: 0; font-size: 11px; color: #4A5568;">This invitation expires in 7 days.</p>
    `),
  };
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: 'Reset your Meridian Node password',
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Password Reset</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        We received a request to reset your password. Click below to choose a new one.
      </p>
      ${button('Reset Password', resetUrl)}
      <p style="margin: 0; font-size: 11px; color: #4A5568;">If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>
    `),
  };
}

export function feasibilityCompleteEmail(siteName: string, verdict: string, reportUrl: string) {
  const verdictColor = verdict === 'feasible' ? '#00D4AA' : verdict === 'conditional' ? '#F59E0B' : '#EF4444';
  return {
    subject: `Feasibility Analysis Complete: ${siteName}`,
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Analysis Complete</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        The feasibility analysis for <strong style="color: #F0F2F5;">${siteName}</strong> has been completed.
      </p>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
        <p style="margin: 0 0 4px; font-size: 11px; color: #4A5568; text-transform: uppercase; letter-spacing: 1px;">Verdict</p>
        <p style="margin: 0; font-size: 18px; font-weight: 700; color: ${verdictColor}; text-transform: capitalize;">${verdict}</p>
      </div>
      ${button('View Full Report', reportUrl)}
    `),
  };
}

export function weeklyDigestEmail(stats: {
  newSites: number;
  analysesRun: number;
  agentActions: number;
  topSite?: string;
}) {
  return {
    subject: 'Your Weekly Meridian Node Digest',
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Weekly Digest</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5;">Here's what happened this week:</p>
      <div style="display: flex; gap: 8px; margin: 16px 0;">
        <div style="flex: 1; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; text-align: center;">
          <p style="margin: 0; font-size: 20px; font-weight: 700; color: #3B82F6;">${stats.newSites}</p>
          <p style="margin: 4px 0 0; font-size: 10px; color: #4A5568;">New Sites</p>
        </div>
        <div style="flex: 1; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; text-align: center;">
          <p style="margin: 0; font-size: 20px; font-weight: 700; color: #00D4AA;">${stats.analysesRun}</p>
          <p style="margin: 4px 0 0; font-size: 10px; color: #4A5568;">Analyses</p>
        </div>
        <div style="flex: 1; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; text-align: center;">
          <p style="margin: 0; font-size: 20px; font-weight: 700; color: #F59E0B;">${stats.agentActions}</p>
          <p style="margin: 4px 0 0; font-size: 10px; color: #4A5568;">Agent Actions</p>
        </div>
      </div>
      ${stats.topSite ? `<p style="margin: 12px 0 0; font-size: 12px; color: #8B95A5;">Top scoring site: <strong style="color: #F0F2F5;">${stats.topSite}</strong></p>` : ''}
      ${button('Open Dashboard', `${BASE_URL}/dashboard`)}
    `),
  };
}
