import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('slack');

export async function sendSlackAlert(message: {
  text: string;
  blocks?: any[];
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    log.debug('No SLACK_WEBHOOK_URL configured, skipping');
    return;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!res.ok) log.warn(`Slack webhook returned ${res.status}`);
  } catch (err) {
    log.error(`Slack webhook failed: ${err instanceof Error ? err.message : err}`);
  }
}

export async function alertHotLead(lead: any, reply: any): Promise<void> {
  const text = `🔥 HOT LEAD: ${lead.first_name || ''} ${lead.last_name || ''} at ${lead.company_name || 'Unknown'} replied`;
  await sendSlackAlert({
    text,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🔥 HOT LEAD REPLIED' } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Company:*\n${lead.company_name || 'Unknown'}` },
          { type: 'mrkdwn', text: `*Contact:*\n${lead.first_name || ''} ${lead.last_name || ''}` },
          { type: 'mrkdwn', text: `*Units:*\n${lead.unit_count || 'unknown'}` },
          { type: 'mrkdwn', text: `*Score:*\n${lead.lead_score || 0}/100` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Reply:*\n>${(reply.body_text || '').slice(0, 300)}${(reply.body_text || '').length > 300 ? '…' : ''}` },
      },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: '📧 View in CRM' }, url: `https://rkv-outreach.vercel.app/replies` },
          { type: 'button', text: { type: 'plain_text', text: '👤 Lead Profile' }, url: `https://rkv-outreach.vercel.app/leads/${lead.id}` },
        ],
      },
    ],
  });
}
