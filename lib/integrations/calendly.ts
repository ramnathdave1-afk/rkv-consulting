/**
 * Calendly Integration Stub
 * Embedded showing booking for prospects.
 */

const CALENDLY_API_URL = 'https://api.calendly.com';

export interface CalendlyConfig {
  api_key: string;
  scheduling_url: string;
  event_type_uri: string;
}

export interface CalendlyEvent {
  uri: string;
  name: string;
  status: 'active' | 'cancelled';
  start_time: string;
  end_time: string;
  invitee_name: string;
  invitee_email: string;
  location: string | null;
}

export async function getEventTypes(apiKey: string, userUri: string): Promise<{ uri: string; name: string; slug: string; duration: number }[]> {
  const response = await fetch(
    `${CALENDLY_API_URL}/event_types?user=${encodeURIComponent(userUri)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (!response.ok) throw new Error(`Calendly API error: ${response.status}`);
  const data = await response.json();

  return (data.collection || []).map((et: Record<string, unknown>) => ({
    uri: et.uri as string,
    name: et.name as string,
    slug: et.slug as string,
    duration: et.duration as number,
  }));
}

export async function getScheduledEvents(
  apiKey: string,
  userUri: string,
  minStartTime?: string,
  maxStartTime?: string
): Promise<CalendlyEvent[]> {
  const params = new URLSearchParams({ user: userUri });
  if (minStartTime) params.append('min_start_time', minStartTime);
  if (maxStartTime) params.append('max_start_time', maxStartTime);

  const response = await fetch(
    `${CALENDLY_API_URL}/scheduled_events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (!response.ok) throw new Error(`Calendly API error: ${response.status}`);
  const data = await response.json();

  return (data.collection || []).map((evt: Record<string, unknown>) => ({
    uri: evt.uri as string,
    name: evt.name as string,
    status: evt.status as string,
    start_time: evt.start_time as string,
    end_time: evt.end_time as string,
    invitee_name: '',
    invitee_email: '',
    location: (evt.location as { location?: string })?.location || null,
  }));
}

export function getEmbedUrl(schedulingUrl: string, prefillData?: {
  name?: string;
  email?: string;
  customAnswers?: Record<string, string>;
}): string {
  const params = new URLSearchParams();
  if (prefillData?.name) params.append('name', prefillData.name);
  if (prefillData?.email) params.append('email', prefillData.email);

  const query = params.toString();
  return query ? `${schedulingUrl}?${query}` : schedulingUrl;
}
