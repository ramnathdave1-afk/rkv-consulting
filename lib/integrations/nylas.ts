/**
 * Nylas Universal Calendar API Stub
 * Unified calendar abstraction across Google and Microsoft.
 * Simplifies multi-tenant calendar management.
 */

const NYLAS_API_URL = 'https://api.us.nylas.com/v3';

export interface NylasConfig {
  api_key: string;
  grant_id: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: number;
  end_time: number;
  participants: { name: string; email: string; status: string }[];
  calendar_id: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface FreeBusySlot {
  start_time: number;
  end_time: number;
  status: 'busy' | 'free';
}

export async function listCalendars(config: NylasConfig): Promise<{ id: string; name: string; is_primary: boolean }[]> {
  const response = await fetch(`${NYLAS_API_URL}/grants/${config.grant_id}/calendars`, {
    headers: { Authorization: `Bearer ${config.api_key}` },
  });

  if (!response.ok) throw new Error(`Nylas API error: ${response.status}`);
  const data = await response.json();

  return (data.data || []).map((cal: Record<string, unknown>) => ({
    id: cal.id as string,
    name: cal.name as string,
    is_primary: cal.is_primary as boolean,
  }));
}

export async function listEvents(
  config: NylasConfig,
  calendarId: string,
  startTime: number,
  endTime: number
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    calendar_id: calendarId,
    start: String(startTime),
    end: String(endTime),
  });

  const response = await fetch(
    `${NYLAS_API_URL}/grants/${config.grant_id}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${config.api_key}` } }
  );

  if (!response.ok) throw new Error(`Nylas events error: ${response.status}`);
  const data = await response.json();

  return (data.data || []).map((evt: Record<string, unknown>) => ({
    id: evt.id as string,
    title: evt.title as string,
    description: evt.description as string | null,
    location: evt.location as string | null,
    start_time: (evt.when as { start_time: number })?.start_time || 0,
    end_time: (evt.when as { end_time: number })?.end_time || 0,
    participants: evt.participants || [],
    calendar_id: evt.calendar_id as string,
    status: evt.status as CalendarEvent['status'],
  }));
}

export async function createEvent(
  config: NylasConfig,
  calendarId: string,
  event: {
    title: string;
    description?: string;
    location?: string;
    start_time: number;
    end_time: number;
    participants: { name: string; email: string }[];
  }
): Promise<CalendarEvent> {
  const response = await fetch(`${NYLAS_API_URL}/grants/${config.grant_id}/events?calendar_id=${calendarId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: event.title,
      description: event.description,
      location: event.location,
      when: { start_time: event.start_time, end_time: event.end_time },
      participants: event.participants.map((p) => ({ ...p, status: 'noreply' })),
    }),
  });

  if (!response.ok) throw new Error(`Nylas create event error: ${response.status}`);
  const data = await response.json();
  return data.data;
}

export async function getFreeBusy(
  config: NylasConfig,
  emails: string[],
  startTime: number,
  endTime: number
): Promise<Record<string, FreeBusySlot[]>> {
  const response = await fetch(`${NYLAS_API_URL}/grants/${config.grant_id}/calendars/free-busy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      start_time: startTime,
      end_time: endTime,
      emails,
    }),
  });

  if (!response.ok) throw new Error(`Nylas free/busy error: ${response.status}`);
  const data = await response.json();

  const result: Record<string, FreeBusySlot[]> = {};
  for (const item of (data.data || [])) {
    result[item.email] = (item.time_slots || []).map((s: Record<string, unknown>) => ({
      start_time: s.start_time as number,
      end_time: s.end_time as number,
      status: s.status as string,
    }));
  }
  return result;
}
