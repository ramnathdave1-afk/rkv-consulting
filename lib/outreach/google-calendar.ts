const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';

interface CalendarCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

let cachedCredentials: CalendarCredentials | null = null;

async function getCredentials(): Promise<CalendarCredentials> {
  if (cachedCredentials && cachedCredentials.expires_at > Date.now() + 300_000) {
    return cachedCredentials;
  }

  // Use the primary Gmail account's OAuth credentials for calendar
  const { query, ORG_ID } = await import('./db');
  const result = await query<{ oauth_credentials: CalendarCredentials }>(
    `SELECT oauth_credentials FROM outreach_domains
     WHERE org_id = $1 AND status IN ('active','warming')
     ORDER BY email_address ASC LIMIT 1`,
    [ORG_ID]
  );

  if (!result.rows[0]?.oauth_credentials) {
    throw new Error('No Gmail account with OAuth credentials found for Calendar access');
  }

  const creds = result.rows[0].oauth_credentials;

  // Refresh if needed
  if (creds.expires_at < Date.now() + 300_000) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: creds.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) throw new Error('Failed to refresh Google Calendar token');
    const data = await response.json();

    cachedCredentials = {
      access_token: data.access_token,
      refresh_token: creds.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    return cachedCredentials;
  }

  cachedCredentials = creds;
  return creds;
}

export interface CalendarEvent {
  id: string;
  htmlLink: string;
  hangoutLink: string | null;
  start: string;
  end: string;
}

export async function createEvent(
  summary: string,
  description: string,
  startTime: string,
  durationMinutes: number = 30,
  attendeeEmail?: string
): Promise<CalendarEvent> {
  const creds = await getCredentials();
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const event: Record<string, unknown> = {
    summary,
    description,
    start: { dateTime: start.toISOString(), timeZone: 'America/New_York' },
    end: { dateTime: end.toISOString(), timeZone: 'America/New_York' },
    conferenceData: {
      createRequest: {
        requestId: `outreach-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  if (attendeeEmail) {
    event.attendees = [{ email: attendeeEmail }];
  }

  const response = await fetch(
    `${CALENDAR_API_URL}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Calendar error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    htmlLink: data.htmlLink,
    hangoutLink: data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri || null,
    start: data.start.dateTime,
    end: data.end.dateTime,
  };
}

export async function getAvailableSlots(
  date: string,
  slotDurationMinutes: number = 30,
  startHour: number = 9,
  endHour: number = 17
): Promise<string[]> {
  const creds = await getCredentials();
  const dayStart = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00-04:00`);
  const dayEnd = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00-04:00`);

  // Get existing events
  const response = await fetch(
    `${CALENDAR_API_URL}/calendars/primary/events?timeMin=${dayStart.toISOString()}&timeMax=${dayEnd.toISOString()}&singleEvents=true&orderBy=startTime`,
    {
      headers: { Authorization: `Bearer ${creds.access_token}` },
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  const busySlots = (data.items || []).map((e: { start: { dateTime: string }; end: { dateTime: string } }) => ({
    start: new Date(e.start.dateTime).getTime(),
    end: new Date(e.end.dateTime).getTime(),
  }));

  // Generate available slots
  const slots: string[] = [];
  let current = dayStart.getTime();
  const slotMs = slotDurationMinutes * 60 * 1000;

  while (current + slotMs <= dayEnd.getTime()) {
    const slotEnd = current + slotMs;
    const isBusy = busySlots.some(
      (b: { start: number; end: number }) => current < b.end && slotEnd > b.start
    );
    if (!isBusy) {
      slots.push(new Date(current).toISOString());
    }
    current += 30 * 60 * 1000; // Move by 30 min increments
  }

  return slots;
}

export async function cancelEvent(eventId: string): Promise<void> {
  const creds = await getCredentials();
  await fetch(
    `${CALENDAR_API_URL}/calendars/primary/events/${eventId}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creds.access_token}` },
    }
  );
}
