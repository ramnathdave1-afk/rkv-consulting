/**
 * Gmail Integration Stub
 * OAuth 2.0 flow for reading/writing PM company email inboxes.
 * Used by the AI Leasing Agent to handle email inquiries.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

export interface GmailCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface EmailMessage {
  id: string;
  thread_id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  labels: string[];
}

export function getGmailAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not configured');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGmailCode(code: string, redirectUri: string): Promise<GmailCredentials> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gmail OAuth error: ${err}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshGmailToken(refreshToken: string): Promise<GmailCredentials> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) throw new Error('Failed to refresh Gmail token');
  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function listMessages(
  credentials: GmailCredentials,
  query: string = 'is:unread',
  maxResults: number = 20
): Promise<EmailMessage[]> {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${credentials.access_token}` } }
  );

  if (!response.ok) throw new Error(`Gmail API error: ${response.status}`);
  const data = await response.json();

  if (!data.messages) return [];

  // Fetch full message details
  const messages: EmailMessage[] = [];
  for (const msg of data.messages.slice(0, maxResults)) {
    const detail = await fetch(
      `${GMAIL_API_URL}/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${credentials.access_token}` } }
    );
    if (detail.ok) {
      const d = await detail.json();
      const headers = d.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      messages.push({
        id: d.id,
        thread_id: d.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        body: extractBody(d.payload),
        date: getHeader('Date'),
        labels: d.labelIds || [],
      });
    }
  }

  return messages;
}

export async function sendEmail(
  credentials: GmailCredentials,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string }> {
  const raw = btoa(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
  ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await fetch(`${GMAIL_API_URL}/users/me/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) throw new Error(`Gmail send error: ${response.status}`);
  const data = await response.json();
  return { id: data.id };
}

function extractBody(payload: { body?: { data?: string }; parts?: { mimeType: string; body: { data?: string } }[] }): string {
  if (payload.body?.data) {
    return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  }
  const textPart = payload.parts?.find((p) => p.mimeType === 'text/plain');
  if (textPart?.body?.data) {
    return atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  }
  return '';
}
