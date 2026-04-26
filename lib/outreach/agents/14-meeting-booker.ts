import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { createEvent } from '../google-calendar';
import { getAvailableAccount, sendTrackedEmail } from '../gmail-sender';
import type { AgentName, AgentRunResult, AgentInput } from '../types';

class MeetingBooker extends BaseAgent {
  name: AgentName = 'meeting_booker';
  description = 'Creates Google Calendar events with Meet links and sends confirmations';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const contactId = input.contact_id as string;
    const scheduledAt = input.scheduled_at as string;
    const duration = (input.duration as number) || 30;

    if (!contactId || !scheduledAt) {
      return { success: false, error: 'Provide contact_id and scheduled_at' };
    }

    // Get contact and lead info
    const contactResult = await query<{
      id: string; first_name: string; last_name: string; email: string;
      lead_id: string; company_name: string; unit_count: number | null;
    }>(
      `SELECT c.*, l.company_name, l.unit_count
       FROM outreach_contacts c JOIN outreach_leads l ON l.id = c.lead_id
       WHERE c.id = $1 AND c.org_id = $2`,
      [contactId, ORG_ID]
    );

    const contact = contactResult.rows[0];
    if (!contact) return { success: false, error: 'Contact not found' };

    await this.updateStatus('running', `Booking meeting with ${contact.first_name} at ${contact.company_name}`);

    // Create calendar event
    const event = await createEvent(
      `RKV Consulting x ${contact.company_name} — AI Property Management Demo`,
      `Meeting with ${contact.first_name} ${contact.last_name || ''} from ${contact.company_name} (${contact.unit_count || '?'} units).\n\nDiscuss: AI leasing agent, voice AI, maintenance automation, pricing.`,
      scheduledAt,
      duration,
      contact.email
    );

    // Save meeting
    const meetingResult = await query<{ id: string }>(
      `INSERT INTO outreach_meetings
       (org_id, contact_id, lead_id, calendar_event_id, google_meet_link, scheduled_at, duration_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
       RETURNING id`,
      [ORG_ID, contact.id, contact.lead_id, event.id, event.hangoutLink, scheduledAt, duration]
    );

    // Update contact status
    await query(
      `UPDATE outreach_contacts SET status = 'meeting_booked' WHERE id = $1`,
      [contact.id]
    );
    await query(
      `UPDATE outreach_leads SET status = 'meeting_booked' WHERE id = $1`,
      [contact.lead_id]
    );

    // Generate pre-meeting briefing from research report
    const reportResult = await query<{ report_summary: string; pitch_strategy: string; primary_hook: string }>(
      `SELECT report_summary, pitch_strategy, primary_hook FROM outreach_research_reports WHERE lead_id = $1 LIMIT 1`,
      [contact.lead_id]
    );
    const report = reportResult.rows[0];

    if (report) {
      await query(
        `UPDATE outreach_meetings SET briefing_text = $1 WHERE id = $2`,
        [
          `PRE-MEETING BRIEF:\n\nCompany: ${contact.company_name} (${contact.unit_count || '?'} units)\nContact: ${contact.first_name} ${contact.last_name || ''}\n\n${report.pitch_strategy || ''}\n\nPrimary Hook: ${report.primary_hook || 'N/A'}\n\n${report.report_summary || ''}`,
          meetingResult.rows[0].id,
        ]
      );
    }

    // Send confirmation email
    const account = await getAvailableAccount();
    if (account && contact.email) {
      const meetTime = new Date(scheduledAt);
      const formattedTime = meetTime.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      }) + ' at ' + meetTime.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
      }) + ' ET';

      const confirmationHtml = `
        <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;">
          <p>${contact.first_name},</p>
          <p>Great — you're confirmed for <strong>${formattedTime}</strong>.</p>
          ${event.hangoutLink ? `<p>Join here: <a href="${event.hangoutLink}">${event.hangoutLink}</a></p>` : '<p>A calendar invite has been sent to your email.</p>'}
          <p>I'll walk you through how 5 AI agents can handle leasing, voice, maintenance, finance, and acquisitions for ${contact.company_name}. Takes about ${duration} minutes.</p>
          <p>See you then,<br>Dave</p>
        </div>
      `;

      const sendResult = await query<{ id: string }>(
        `INSERT INTO outreach_sends (org_id, contact_id, lead_id, channel, subject, body, status)
         VALUES ($1, $2, $3, 'email', $4, $5, 'queued') RETURNING id`,
        [ORG_ID, contact.id, contact.lead_id, `Confirmed: ${formattedTime}`, confirmationHtml]
      );

      await sendTrackedEmail(account, contact.email, `Confirmed: ${formattedTime}`, confirmationHtml, sendResult.rows[0].id);
      await query(`UPDATE outreach_sends SET status = 'sent', sent_at = now() WHERE id = $1`, [sendResult.rows[0].id]);
    }

    // Update campaign
    const campaignResult = await query<{ id: string }>(
      `SELECT campaign_id as id FROM outreach_leads WHERE id = $1`, [contact.lead_id]
    );
    if (campaignResult.rows[0]?.id) {
      await query(`UPDATE outreach_campaigns SET meetings_booked = meetings_booked + 1 WHERE id = $1`, [campaignResult.rows[0].id]);
    }

    await this.log('success', `Meeting booked: ${contact.first_name} at ${contact.company_name}, ${scheduledAt}`, {
      meetingId: meetingResult.rows[0].id, meetLink: event.hangoutLink,
    });

    return {
      success: true,
      data: {
        meetingId: meetingResult.rows[0].id,
        calendarEventId: event.id,
        meetLink: event.hangoutLink,
        scheduledAt,
      },
    };
  }
}

export default new MeetingBooker();
