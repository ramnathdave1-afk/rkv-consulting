import { describe, it, expect } from 'vitest';
import {
  welcomeEmail,
  invitationEmail,
  passwordResetEmail,
  feasibilityCompleteEmail,
  weeklyDigestEmail,
} from '@/lib/email/templates';

describe('Email Templates', () => {
  it('generates welcome email with user name', () => {
    const { subject, html } = welcomeEmail('John');
    expect(subject).toBe('Welcome to Meridian Node');
    expect(html).toContain('Welcome, John!');
    expect(html).toContain('Open Dashboard');
  });

  it('generates invitation email with org details', () => {
    const { subject, html } = invitationEmail('Jane', 'Acme Corp', 'https://example.com/invite');
    expect(subject).toContain('Jane');
    expect(subject).toContain('Acme Corp');
    expect(html).toContain('Accept Invitation');
    expect(html).toContain('https://example.com/invite');
  });

  it('generates password reset email', () => {
    const { subject, html } = passwordResetEmail('https://example.com/reset');
    expect(subject).toContain('Reset');
    expect(html).toContain('Reset Password');
    expect(html).toContain('https://example.com/reset');
  });

  it('generates feasibility complete email with verdict colors', () => {
    const feasible = feasibilityCompleteEmail('Site A', 'feasible', '/report');
    expect(feasible.html).toContain('#00D4AA');
    expect(feasible.html).toContain('Site A');

    const infeasible = feasibilityCompleteEmail('Site B', 'infeasible', '/report');
    expect(infeasible.html).toContain('#EF4444');
  });

  it('generates weekly digest with stats', () => {
    const { subject, html } = weeklyDigestEmail({
      newSites: 5,
      analysesRun: 12,
      agentActions: 340,
      topSite: 'Phoenix Hub',
    });
    expect(subject).toContain('Weekly');
    expect(html).toContain('5');
    expect(html).toContain('12');
    expect(html).toContain('340');
    expect(html).toContain('Phoenix Hub');
  });
});
