import { describe, it, expect } from 'vitest';
import {
  welcomeEmail,
  invitationEmail,
  passwordResetEmail,
  weeklyDigestEmail,
  leaseRenewalEmail,
  maintenanceStatusEmail,
  maintenanceCreatedEmail,
  showingReminderEmail,
  showingFollowUpEmail,
  vendorDispatchEmail,
  ownerReportEmail,
} from '@/lib/email/templates';

describe('Email Templates', () => {
  it('generates welcome email with PM-focused content', () => {
    const { subject, html } = welcomeEmail('John');
    expect(subject).toBe('Welcome to Meridian Node');
    expect(html).toContain('Welcome, John!');
    expect(html).toContain('Add your properties and units');
    expect(html).toContain('AI leasing agent');
    expect(html).toContain('Connect your PM platform');
    expect(html).toContain('Open Dashboard');
  });

  it('generates invitation email with org details', () => {
    const { subject, html } = invitationEmail('Jane', 'Acme Corp', 'https://example.com/invite');
    expect(subject).toContain('Jane');
    expect(subject).toContain('Acme Corp');
    expect(html).toContain('Accept Invitation');
    expect(html).toContain('https://example.com/invite');
    expect(html).toContain('property management');
  });

  it('generates password reset email', () => {
    const { subject, html } = passwordResetEmail('https://example.com/reset');
    expect(subject).toContain('Reset');
    expect(html).toContain('Reset Password');
    expect(html).toContain('https://example.com/reset');
  });

  it('generates weekly digest with PM stats', () => {
    const { subject, html } = weeklyDigestEmail({
      properties: 12,
      occupancyRate: 94,
      revenue: 48500,
      openWorkOrders: 7,
      conversations: 23,
      topProperty: 'Sunset Apartments',
    });
    expect(subject).toContain('Weekly');
    expect(html).toContain('12');
    expect(html).toContain('94%');
    expect(html).toContain('$48,500');
    expect(html).toContain('7');
    expect(html).toContain('23');
    expect(html).toContain('Sunset Apartments');
  });

  it('generates lease renewal email with tenant details', () => {
    const { subject, html } = leaseRenewalEmail('Sarah', 'Oakwood Manor', '204', '2026-06-30', 'https://example.com/renew');
    expect(subject).toContain('Lease Renewal');
    expect(subject).toContain('Oakwood Manor');
    expect(html).toContain('Sarah');
    expect(html).toContain('Unit 204');
    expect(html).toContain('June 30, 2026');
    expect(html).toContain('View Renewal Options');
  });

  it('generates maintenance status email with colored status', () => {
    const { subject, html } = maintenanceStatusEmail('Mike', 'Leaky faucet', 'in_progress', 'Riverside Apts', '101');
    expect(subject).toContain('Maintenance Update');
    expect(html).toContain('Mike');
    expect(html).toContain('Leaky faucet');
    expect(html).toContain('in progress');
    expect(html).toContain('#F59E0B');

    const completed = maintenanceStatusEmail('Mike', 'Leaky faucet', 'completed', 'Riverside Apts', '101');
    expect(completed.html).toContain('marked as complete');
  });

  it('generates maintenance created email with priority badge', () => {
    const { subject, html } = maintenanceCreatedEmail('Admin Team', 'Broken window', 'high', 'Elm Street', '305', '/dashboard');
    expect(subject).toContain('New Work Order');
    expect(subject).toContain('HIGH');
    expect(html).toContain('Broken window');
    expect(html).toContain('#EF4444');
  });

  it('generates showing reminder email with address', () => {
    const { subject, html } = showingReminderEmail('Alex', 'Pine Ridge', '2B', 'Mon, Mar 25', '2:00 PM', '123 Main St, Austin, TX 78701');
    expect(subject).toContain('Showing Reminder');
    expect(html).toContain('Alex');
    expect(html).toContain('2:00 PM');
    expect(html).toContain('123 Main St');
    expect(html).toContain('photo ID');
  });

  it('generates showing follow-up email with apply CTA', () => {
    const { subject, html } = showingFollowUpEmail('Alex', 'Pine Ridge', '2B', 'https://example.com/apply');
    expect(subject).toContain('Thanks for Visiting');
    expect(html).toContain('Apply Now');
    expect(html).toContain('https://example.com/apply');
  });

  it('generates vendor dispatch email with all details', () => {
    const { subject, html } = vendorDispatchEmail(
      'Bob Plumbing', 'Burst pipe', 'Lakeside', '101',
      '456 Lake Dr, Dallas, TX', 'emergency', 'Water leaking from ceiling', '555-1234'
    );
    expect(subject).toContain('EMERGENCY');
    expect(html).toContain('Bob Plumbing');
    expect(html).toContain('Burst pipe');
    expect(html).toContain('555-1234');
    expect(html).toContain('EMERGENCY');
  });

  it('generates owner report email with financial metrics', () => {
    const { subject, html } = ownerReportEmail(
      'Mr. Owner', 'Sunset Apts', 'March 2026',
      25000, 8000, 17000, 96, 'https://example.com/report'
    );
    expect(subject).toContain('Owner Report');
    expect(subject).toContain('March 2026');
    expect(html).toContain('$25,000');
    expect(html).toContain('$8,000');
    expect(html).toContain('$17,000');
    expect(html).toContain('96%');
    expect(html).toContain('View Full Report');
  });
});
