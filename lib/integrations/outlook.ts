/**
 * Microsoft Outlook / Graph API Integration Stub
 * OAuth 2.0 via MSAL for reading/writing PM company email.
 */

const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';

const SCOPES = ['Mail.Read', 'Mail.Send', 'Mail.ReadWrite', 'offline_access'];

export interface OutlookCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface OutlookEmail {
  id: string;
  conversation_id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  received_at: string;
  is_read: boolean;
}

export function getOutlookAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error('MICROSOFT_CLIENT_ID not configured');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
  });

  return `${MS_AUTH_URL}/authorize?${params.toString()}`;
}

export async function exchangeOutlookCode(code: string, redirectUri: string): Promise<OutlookCredentials> {
  const response = await fetch(`${MS_AUTH_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) throw new Error(`Outlook OAuth error: ${await response.text()}`);
  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshOutlookToken(refreshToken: string): Promise<OutlookCredentials> {
  const response = await fetch(`${MS_AUTH_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) throw new Error('Failed to refresh Outlook token');
  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function listMessages(
  credentials: OutlookCredentials,
  folder: string = 'inbox',
  top: number = 20
): Promise<OutlookEmail[]> {
  const response = await fetch(
    `${GRAPH_API_URL}/me/mailFolders/${folder}/messages?$top=${top}&$orderby=receivedDateTime desc`,
    { headers: { Authorization: `Bearer ${credentials.access_token}` } }
  );

  if (!response.ok) throw new Error(`Graph API error: ${response.status}`);
  const data = await response.json();

  return (data.value || []).map((msg: Record<string, unknown>) => ({
    id: msg.id as string,
    conversation_id: msg.conversationId as string,
    from: (msg.from as { emailAddress: { address: string } })?.emailAddress?.address || '',
    to: ((msg.toRecipients as { emailAddress: { address: string } }[]) || []).map((r) => r.emailAddress.address),
    subject: msg.subject as string,
    body: (msg.body as { content: string })?.content || '',
    received_at: msg.receivedDateTime as string,
    is_read: msg.isRead as boolean,
  }));
}

export async function sendEmail(
  credentials: OutlookCredentials,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const response = await fetch(`${GRAPH_API_URL}/me/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    }),
  });

  if (!response.ok) throw new Error(`Outlook send error: ${response.status}`);
}
