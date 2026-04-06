/**
 * Email Templates — HTML templates for transactional emails.
 * PM-specific templates for RKV Consulting property management platform.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rkv-consulting.vercel.app';

export function layout(content: string) {
  return `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #06080C; color: #F0F2F5; padding: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background: rgba(0,212,170,0.1); padding: 6px 12px; border-radius: 8px; font-size: 14px; font-weight: 700; color: #00D4AA;">M</span>
        <span style="margin-left: 8px; font-size: 14px; font-weight: 700; color: #F0F2F5;">RKV Consulting</span>
      </div>
      ${content}
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 28px 0 16px;" />
      <p style="margin: 0; font-size: 11px; color: #4A5568; text-align: center;">
        RKV Consulting by RKV Consulting LLC · <a href="${BASE_URL}" style="color: #00D4AA; text-decoration: none;">rkvconsulting.com</a>
      </p>
    </div>
  `;
}

export function button(text: string, url: string) {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" style="display: inline-block; background: #00D4AA; color: #06080C; font-size: 13px; font-weight: 600; padding: 10px 24px; border-radius: 8px; text-decoration: none;">
        ${text}
      </a>
    </div>
  `;
}

function statCard(value: string, label: string, color: string) {
  return `
    <div style="flex: 1; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; text-align: center;">
      <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${color};">${value}</p>
      <p style="margin: 4px 0 0; font-size: 10px; color: #4A5568;">${label}</p>
    </div>
  `;
}

function badge(text: string, color: string) {
  return `<span style="display: inline-block; background: ${color}20; color: ${color}; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${text}</span>`;
}

function infoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding: 6px 0; font-size: 12px; color: #4A5568; width: 120px;">${label}</td>
      <td style="padding: 6px 0; font-size: 13px; color: #F0F2F5; font-weight: 500;">${value}</td>
    </tr>
  `;
}

/* ─── Generic / Auth Templates ─────────────────────────────────────── */

export function welcomeEmail(name: string) {
  return {
    subject: 'Welcome to RKV Consulting',
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Welcome, ${name}!</h2>
      <p style="margin: 0 0 12px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Your RKV Consulting account is ready. Let's get your property management powered by AI.
      </p>
      <p style="margin: 0 0 8px; font-size: 13px; color: #8B95A5;">Here's how to get started:</p>
      <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 13px; color: #8B95A5; line-height: 1.8;">
        <li>Add your properties and units</li>
        <li>Set up your AI leasing agent</li>
        <li>Connect your PM platform</li>
        <li>Import tenants and leases</li>
      </ul>
      ${button('Open Dashboard', `${BASE_URL}/dashboard`)}
    `),
  };
}

export function invitationEmail(inviterName: string, orgName: string, inviteUrl: string) {
  return {
    subject: `${inviterName} invited you to ${orgName} on RKV Consulting`,
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">You've been invited</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        <strong style="color: #F0F2F5;">${inviterName}</strong> has invited you to join <strong style="color: #F0F2F5;">${orgName}</strong> on RKV Consulting — an AI-powered property management platform.
      </p>
      ${button('Accept Invitation', inviteUrl)}
      <p style="margin: 0; font-size: 11px; color: #4A5568;">This invitation expires in 7 days.</p>
    `),
  };
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: 'Reset your RKV Consulting password',
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

/* ─── Weekly Digest (PM-focused) ───────────────────────────────────── */

export function weeklyDigestEmail(stats: {
  properties: number;
  occupancyRate: number;
  revenue: number;
  openWorkOrders: number;
  conversations: number;
  topProperty?: string;
}) {
  const fmtRevenue = stats.revenue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
  return {
    subject: 'Your Weekly RKV Consulting Digest',
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Weekly Digest</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5;">Here's your portfolio snapshot for the week:</p>
      <div style="display: flex; gap: 8px; margin: 16px 0;">
        ${statCard(String(stats.properties), 'Properties', '#3B82F6')}
        ${statCard(`${stats.occupancyRate}%`, 'Occupancy', '#00D4AA')}
        ${statCard(fmtRevenue, 'Revenue', '#8B5CF6')}
      </div>
      <div style="display: flex; gap: 8px; margin: 0 0 16px;">
        ${statCard(String(stats.openWorkOrders), 'Open Work Orders', '#F59E0B')}
        ${statCard(String(stats.conversations), 'AI Conversations', '#06B6D4')}
      </div>
      ${stats.topProperty ? `<p style="margin: 12px 0 0; font-size: 12px; color: #8B95A5;">Top performing property: <strong style="color: #F0F2F5;">${stats.topProperty}</strong></p>` : ''}
      ${button('Open Dashboard', `${BASE_URL}/dashboard`)}
    `),
  };
}

/* ─── Lease Renewal Templates ──────────────────────────────────────── */

export function leaseRenewalEmail(
  tenantName: string,
  propertyName: string,
  unitNumber: string,
  leaseEndDate: string,
  renewalUrl: string
) {
  const endDate = new Date(leaseEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return {
    subject: `Lease Renewal Notice - ${propertyName} Unit ${unitNumber}`,
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Lease Renewal Notice</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Hi ${tenantName},
      </p>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        We hope you've been enjoying your home at <strong style="color: #F0F2F5;">${propertyName}, Unit ${unitNumber}</strong>.
        We wanted to give you a heads-up that your current lease ends on <strong style="color: #F0F2F5;">${endDate}</strong>.
      </p>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin: 16px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          ${infoRow('Property', propertyName)}
          ${infoRow('Unit', unitNumber)}
          ${infoRow('Lease Ends', endDate)}
        </table>
      </div>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        We'd love to have you stay! Click below to review your renewal options.
      </p>
      ${button('View Renewal Options', renewalUrl)}
      <p style="margin: 0; font-size: 11px; color: #4A5568;">Have questions? Simply reply to this email or contact your property manager.</p>
    `),
  };
}

/* ─── Maintenance Templates ────────────────────────────────────────── */

export function maintenanceStatusEmail(
  tenantName: string,
  workOrderTitle: string,
  newStatus: string,
  propertyName: string,
  unitNumber: string
) {
  const statusColors: Record<string, string> = {
    open: '#3B82F6',
    assigned: '#8B5CF6',
    in_progress: '#F59E0B',
    completed: '#00D4AA',
    closed: '#6B7280',
    cancelled: '#EF4444',
  };
  const statusColor = statusColors[newStatus] || '#8B95A5';
  const statusLabel = newStatus.replace(/_/g, ' ');

  return {
    subject: `Maintenance Update: ${workOrderTitle}`,
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Maintenance Update</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Hi ${tenantName}, here's an update on your maintenance request:
      </p>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #F0F2F5;">${workOrderTitle}</p>
        <table style="width: 100%; border-collapse: collapse;">
          ${infoRow('Property', `${propertyName} - Unit ${unitNumber}`)}
          <tr>
            <td style="padding: 6px 0; font-size: 12px; color: #4A5568; width: 120px;">Status</td>
            <td style="padding: 6px 0;">${badge(statusLabel, statusColor)}</td>
          </tr>
        </table>
      </div>
      ${newStatus === 'completed'
        ? `<p style="margin: 0 0 8px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
            Your work order has been marked as complete. If the issue isn't fully resolved, please let us know.
          </p>`
        : `<p style="margin: 0 0 8px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
            We'll keep you updated as work progresses. No action is needed from you right now.
          </p>`
      }
      ${button('View Details', `${BASE_URL}/dashboard`)}
    `),
  };
}

export function maintenanceCreatedEmail(
  staffName: string,
  workOrderTitle: string,
  priority: string,
  propertyName: string,
  unitNumber: string,
  dashboardUrl: string
) {
  const priorityColors: Record<string, string> = {
    low: '#6B7280',
    medium: '#F59E0B',
    high: '#EF4444',
    emergency: '#DC2626',
  };
  const prioColor = priorityColors[priority] || '#F59E0B';

  return {
    subject: `New Work Order: ${workOrderTitle} [${priority.toUpperCase()}]`,
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">New Work Order</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Hi ${staffName}, a new maintenance request has been submitted:
      </p>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #F0F2F5;">${workOrderTitle}</p>
          ${badge(priority, prioColor)}
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          ${infoRow('Property', propertyName)}
          ${infoRow('Unit', unitNumber)}
        </table>
      </div>
      ${button('Open Work Order', dashboardUrl)}
    `),
  };
}

/* ─── Showing Templates ────────────────────────────────────────────── */

export function showingReminderEmail(
  prospectName: string,
  propertyName: string,
  unitNumber: string,
  showingDate: string,
  showingTime: string,
  address: string
) {
  return {
    subject: `Showing Reminder: ${propertyName} Unit ${unitNumber} - Tomorrow`,
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Showing Reminder</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Hi ${prospectName}, just a friendly reminder about your upcoming showing tomorrow!
      </p>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin: 16px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          ${infoRow('Property', `${propertyName} - Unit ${unitNumber}`)}
          ${infoRow('Date', showingDate)}
          ${infoRow('Time', showingTime)}
          ${infoRow('Address', address)}
        </table>
      </div>
      <p style="margin: 0 0 8px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Please arrive a few minutes early. Bring a valid photo ID. If you need to reschedule, please let us know as soon as possible.
      </p>
      <p style="margin: 0; font-size: 11px; color: #4A5568;">Need to cancel or reschedule? Simply reply to this email.</p>
    `),
  };
}

export function showingFollowUpEmail(
  prospectName: string,
  propertyName: string,
  unitNumber: string,
  applicationUrl: string
) {
  return {
    subject: `Thanks for Visiting ${propertyName} - Ready to Apply?`,
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Thanks for Visiting!</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Hi ${prospectName}, we hope you enjoyed your tour of <strong style="color: #F0F2F5;">${propertyName}, Unit ${unitNumber}</strong>!
      </p>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        If you're interested in making this your new home, the next step is to submit an application.
        Units in this area go fast, so we recommend applying soon to secure your spot.
      </p>
      ${button('Apply Now', applicationUrl)}
      <p style="margin: 0 0 8px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Have questions about the unit, lease terms, or the application process? Just reply to this email and we'll be happy to help.
      </p>
      <p style="margin: 0; font-size: 11px; color: #4A5568;">We look forward to hearing from you!</p>
    `),
  };
}

/* ─── Vendor Dispatch Template ─────────────────────────────────────── */

export function vendorDispatchEmail(
  vendorName: string,
  workOrderTitle: string,
  propertyName: string,
  unitNumber: string,
  address: string,
  priority: string,
  description: string,
  tenantPhone: string | null
) {
  const priorityColors: Record<string, string> = {
    low: '#6B7280',
    medium: '#F59E0B',
    high: '#EF4444',
    emergency: '#DC2626',
  };
  const prioColor = priorityColors[priority] || '#F59E0B';

  return {
    subject: `Work Order Dispatch: ${workOrderTitle} at ${propertyName} [${priority.toUpperCase()}]`,
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Work Order Dispatch</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Hi ${vendorName}, you've been assigned a new work order:
      </p>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #F0F2F5;">${workOrderTitle}</p>
          ${badge(priority, prioColor)}
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          ${infoRow('Property', `${propertyName} - Unit ${unitNumber}`)}
          ${infoRow('Address', address)}
          ${tenantPhone ? infoRow('Tenant Phone', tenantPhone) : ''}
        </table>
      </div>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 6px; font-size: 11px; color: #4A5568; text-transform: uppercase; letter-spacing: 1px;">Description</p>
        <p style="margin: 0; font-size: 13px; color: #8B95A5; line-height: 1.6;">${description}</p>
      </div>
      <p style="margin: 0 0 8px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        ${priority === 'emergency' ? 'This is an <strong style="color: #EF4444;">EMERGENCY</strong> request. Please respond immediately.' : 'Please coordinate with the tenant to schedule a convenient time for the repair.'}
      </p>
      <p style="margin: 0; font-size: 11px; color: #4A5568;">Reply to this email with updates or questions about this work order.</p>
    `),
  };
}

/* ─── Owner Report Template ────────────────────────────────────────── */

export function ownerReportEmail(
  ownerName: string,
  propertyName: string,
  period: string,
  revenue: number,
  expenses: number,
  noi: number,
  occupancyRate: number,
  reportUrl: string
) {
  const fmtCurrency = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
  const noiColor = noi >= 0 ? '#00D4AA' : '#EF4444';

  return {
    subject: `Owner Report: ${propertyName} - ${period}`,
    html: layout(`
      <h2 style="color: #00D4AA; margin: 0 0 12px; font-size: 20px;">Owner Report</h2>
      <p style="margin: 0 0 16px; font-size: 13px; color: #8B95A5; line-height: 1.6;">
        Hi ${ownerName}, here's your financial summary for <strong style="color: #F0F2F5;">${propertyName}</strong> for <strong style="color: #F0F2F5;">${period}</strong>.
      </p>
      <div style="display: flex; gap: 8px; margin: 16px 0;">
        ${statCard(fmtCurrency(revenue), 'Revenue', '#00D4AA')}
        ${statCard(fmtCurrency(expenses), 'Expenses', '#F59E0B')}
      </div>
      <div style="display: flex; gap: 8px; margin: 0 0 16px;">
        ${statCard(fmtCurrency(noi), 'Net Operating Income', noiColor)}
        ${statCard(`${occupancyRate}%`, 'Occupancy', '#3B82F6')}
      </div>
      ${button('View Full Report', reportUrl)}
      <p style="margin: 0; font-size: 11px; color: #4A5568;">This report was auto-generated. For questions, contact your property manager.</p>
    `),
  };
}
