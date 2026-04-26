import { query, queryOne } from '../services/supabase.js';
import { sendEmail } from '../services/smtp.js';
import { createModuleLogger } from '../utils/logger.js';
import type { SendingAccount } from '../types/index.js';

const log = createModuleLogger('daily-digest');

/**
 * Compile and send a daily digest email. Runs at 8 AM EST.
 */
export async function sendDailyDigest(): Promise<void> {
  log.info('Daily-digest job started');

  const digestEmail = process.env.DIGEST_EMAIL;
  if (!digestEmail) {
    log.warn('DIGEST_EMAIL not configured. Skipping digest.');
    return;
  }

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterdayStr = yesterday.toISOString();
    const todayStr = today.toISOString();

    // ─── Today's Focus (Feature 2) ──────────────────────────────

    // Hot leads waiting for a human response (unclassified replies or
    // classified 'interested' / high score / high urgency, still open).
    const { rows: focusHotLeads } = await query(
      `SELECT r.id AS reply_id, r.body_text, r.received_at, r.urgency,
              r.classification AS reply_classification,
              l.id, l.first_name, l.last_name, l.company_name, l.score
       FROM outreach_replies r
       JOIN outreach_leads l ON l.id = r.lead_id
       WHERE (
               r.classification = 'interested'
               OR l.score >= 70
               OR r.urgency = 'high'
             )
         AND l.status NOT IN ('call_booked', 'demo_completed', 'pilot',
                              'closed_won', 'closed_lost', 'unsubscribed',
                              'bounced', 'dead', 'unverified_dead', 'archived',
                              'do_not_contact')
       ORDER BY r.received_at DESC
       LIMIT 5`
    );

    // Tasks due today
    const { rows: focusTasksToday } = await query(
      `SELECT t.id, t.title, t.type, t.priority, t.due_date,
              l.first_name, l.last_name, l.company_name
       FROM outreach_tasks t
       LEFT JOIN outreach_leads l ON l.id = t.lead_id
       WHERE t.status = 'pending'
         AND t.due_date::date = CURRENT_DATE
       ORDER BY CASE t.priority
                  WHEN 'urgent' THEN 0
                  WHEN 'high' THEN 1
                  WHEN 'medium' THEN 2
                  WHEN 'low' THEN 3
                  ELSE 4
                END ASC,
                t.due_date ASC`
    );

    // Demos / calls scheduled today (best-effort: tasks of type follow_up_call
    // due today OR leads with status call_booked updated today).
    const { rows: focusDemosToday } = await query(
      `SELECT l.id, l.first_name, l.last_name, l.company_name, l.updated_at
       FROM outreach_leads l
       WHERE l.status = 'call_booked'
         AND l.updated_at::date = CURRENT_DATE
       ORDER BY l.updated_at ASC
       LIMIT 10`
    );

    // Warm leads going cold — replied positively 3+ days ago but haven't
    // advanced to call_booked / demo_completed.
    const { rows: focusWarmCold } = await query(
      `SELECT DISTINCT l.id, l.first_name, l.last_name, l.company_name,
              l.score, r.received_at AS last_reply_at
       FROM outreach_leads l
       JOIN outreach_replies r ON r.lead_id = l.id
       WHERE r.classification = 'interested'
         AND l.stage NOT IN ('call_booked', 'demo_completed', 'pilot',
                             'negotiation', 'closed_won', 'closed_lost')
         AND r.received_at < NOW() - INTERVAL '3 days'
         AND r.received_at > NOW() - INTERVAL '14 days'
       ORDER BY r.received_at ASC
       LIMIT 5`
    );

    // ─── Gather stats ───────────────────────────────────────────

    // Emails sent yesterday
    const sentResult = await queryOne(
      'SELECT COUNT(*) as count FROM outreach_emails WHERE sent_at >= $1 AND sent_at < $2',
      [yesterdayStr, todayStr]
    );

    // Replies received yesterday
    const replyResult = await queryOne(
      'SELECT COUNT(*) as count FROM outreach_replies WHERE received_at >= $1 AND received_at < $2',
      [yesterdayStr, todayStr]
    );

    // Opens yesterday
    const openResult = await queryOne(
      'SELECT COUNT(*) as count FROM outreach_emails WHERE opened_at >= $1 AND opened_at < $2',
      [yesterdayStr, todayStr]
    );

    // Bounces yesterday
    const bounceResult = await queryOne(
      `SELECT COUNT(*) as count FROM outreach_emails
       WHERE status = 'bounced' AND sent_at >= $1 AND sent_at < $2`,
      [yesterdayStr, todayStr]
    );

    const sent = parseInt(sentResult?.count || '0', 10);
    const replies = parseInt(replyResult?.count || '0', 10);
    const opens = parseInt(openResult?.count || '0', 10);
    const bounces = parseInt(bounceResult?.count || '0', 10);
    const openRate = sent > 0 ? ((opens / sent) * 100).toFixed(1) : '0.0';
    const replyRate = sent > 0 ? ((replies / sent) * 100).toFixed(1) : '0.0';
    const bounceRate = sent > 0 ? ((bounces / sent) * 100).toFixed(1) : '0.0';

    // ─── Hot leads needing response ─────────────────────────────

    const { rows: hotLeads } = await query(
      `SELECT first_name, last_name, company_name, score, temperature, status
       FROM outreach_leads
       WHERE temperature = 'hot' AND status IN ('replied', 'engaged')
       ORDER BY score DESC
       LIMIT 10`
    );

    // ─── Tasks due today ────────────────────────────────────────

    const { rows: tasksDue } = await query(
      `SELECT title, type, priority, due_date
       FROM outreach_tasks
       WHERE status = 'pending' AND due_date <= $1
       ORDER BY priority ASC
       LIMIT 15`,
      [new Date().toISOString()]
    );

    // ─── Pipeline snapshot ──────────────────────────────────────

    const stages = ['prospecting', 'outreach', 'engaged', 'call_booked', 'demo_completed', 'pilot', 'negotiation'];
    const pipeline: Record<string, number> = {};

    for (const stage of stages) {
      const result = await queryOne(
        'SELECT COUNT(*) as count FROM outreach_leads WHERE stage = $1',
        [stage]
      );
      pipeline[stage] = parseInt(result?.count || '0', 10);
    }

    // ─── Attention items ────────────────────────────────────────

    const attentionItems: string[] = [];

    if (parseFloat(bounceRate) > 5) {
      attentionItems.push(`High bounce rate: ${bounceRate}% (target: <5%)`);
    }

    // Accounts with low health
    const { rows: unhealthyAccounts } = await query(
      `SELECT email, health_score FROM outreach_sending_accounts
       WHERE health_score < 70 AND is_active = true`
    );

    if (unhealthyAccounts.length > 0) {
      for (const acc of unhealthyAccounts) {
        attentionItems.push(`Account ${acc.email} health: ${acc.health_score}/100`);
      }
    }

    // Dead leads count
    const deadResult = await queryOne(
      "SELECT COUNT(*) as count FROM outreach_leads WHERE status = 'dead'"
    );
    const deadCount = parseInt(deadResult?.count || '0', 10);

    if (deadCount > 50) {
      attentionItems.push(`${deadCount} leads in dead status - consider cleanup`);
    }

    // ─── Build HTML ─────────────────────────────────────────────

    const html = buildDigestHtml({
      date: yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      sent,
      replies,
      opens,
      bounces,
      openRate,
      replyRate,
      bounceRate,
      hotLeads: (hotLeads || []) as any[],
      tasksDue: (tasksDue || []) as any[],
      pipeline,
      attentionItems,
      focusHotLeads: (focusHotLeads || []) as any[],
      focusTasksToday: (focusTasksToday || []) as any[],
      focusDemosToday: (focusDemosToday || []) as any[],
      focusWarmCold: (focusWarmCold || []) as any[],
    });

    const textBody = buildDigestText({
      date: yesterday.toLocaleDateString(),
      sent,
      replies,
      openRate,
      replyRate,
      hotLeads: (hotLeads || []) as any[],
      tasksDue: (tasksDue || []) as any[],
      focusHotLeads: (focusHotLeads || []) as any[],
      focusTasksToday: (focusTasksToday || []) as any[],
      focusDemosToday: (focusDemosToday || []) as any[],
      focusWarmCold: (focusWarmCold || []) as any[],
    });

    // ─── Send the digest ────────────────────────────────────────

    // Get any active sending account to send from
    const sendingAccount = await queryOne(
      'SELECT * FROM outreach_sending_accounts WHERE is_active = true LIMIT 1'
    );

    if (!sendingAccount) {
      log.warn('No sending account available for digest. Logging to console instead.');
      log.info(`DIGEST:\n${textBody}`);
      return;
    }

    const result = await sendEmail(
      sendingAccount as SendingAccount,
      digestEmail,
      `Outreach Digest - ${yesterday.toLocaleDateString()}`,
      html,
      textBody,
      `digest-${yesterday.toISOString().split('T')[0]}-${crypto.randomUUID()}`
    );

    if (result.success) {
      log.info(`Daily digest sent to ${digestEmail}`);
    } else {
      log.error(`Failed to send digest: ${result.error}`);
    }
  } catch (error) {
    log.error(`Daily-digest job failed: ${error}`);
  }
}

// ─── HTML Builder ────────────────────────────────────────────────

function buildDigestHtml(data: {
  date: string;
  sent: number;
  replies: number;
  opens: number;
  bounces: number;
  openRate: string;
  replyRate: string;
  bounceRate: string;
  hotLeads: Array<{ first_name: string; last_name: string; company_name: string; score: number }>;
  tasksDue: Array<{ title: string; type: string; priority: string }>;
  pipeline: Record<string, number>;
  attentionItems: string[];
  focusHotLeads: Array<{ id: string; first_name: string; last_name: string; company_name: string; score: number; body_text: string }>;
  focusTasksToday: Array<{ title: string; priority: string; first_name?: string; last_name?: string; company_name?: string }>;
  focusDemosToday: Array<{ first_name: string; last_name: string; company_name: string; updated_at: string }>;
  focusWarmCold: Array<{ first_name: string; last_name: string; company_name: string; last_reply_at: string }>;
}): string {
  const hotLeadRows = data.hotLeads
    .map(
      (l) =>
        `<tr><td style="padding:4px 8px">${l.first_name} ${l.last_name}</td><td style="padding:4px 8px">${l.company_name}</td><td style="padding:4px 8px;text-align:center">${l.score}</td></tr>`
    )
    .join('');

  const taskRows = data.tasksDue
    .map(
      (t) =>
        `<tr><td style="padding:4px 8px">${t.title}</td><td style="padding:4px 8px">${t.priority}</td></tr>`
    )
    .join('');

  const pipelineRows = Object.entries(data.pipeline)
    .map(
      ([stage, count]) =>
        `<tr><td style="padding:4px 8px;text-transform:capitalize">${stage.replace('_', ' ')}</td><td style="padding:4px 8px;text-align:center">${count}</td></tr>`
    )
    .join('');

  const attentionHtml =
    data.attentionItems.length > 0
      ? `<h3 style="color:#d32f2f">Attention Items</h3><ul>${data.attentionItems.map((i) => `<li>${i}</li>`).join('')}</ul>`
      : '';

  // ─── Today's Focus block ────────────────────────────────────
  const escape = (s: string) =>
    (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const focusHotLeadsHtml = data.focusHotLeads.length > 0
    ? `<p><strong>Hot leads waiting for you (respond within 2 hours):</strong></p><ol style="padding-left:20px">${data.focusHotLeads
        .map((l, i) => {
          const snippet = escape((l.body_text || '').slice(0, 140));
          return `<li style="margin-bottom:6px">${escape(l.first_name || '')} ${escape(l.last_name || '')}, ${escape(l.company_name || 'Unknown')} — Score: ${l.score || 0} — "${snippet}${(l.body_text || '').length > 140 ? '…' : ''}"</li>`;
        })
        .join('')}</ol>`
    : `<p style="color:#777">No hot leads waiting. Nice work.</p>`;

  const focusTasksHtml = data.focusTasksToday.length > 0
    ? `<p><strong>Tasks due today:</strong></p><ol style="padding-left:20px">${data.focusTasksToday
        .map((t) => {
          const who = t.first_name || t.company_name
            ? ` — ${escape(t.first_name || '')} ${escape(t.last_name || '')}${t.company_name ? ` (${escape(t.company_name)})` : ''}`
            : '';
          return `<li style="margin-bottom:4px">[${escape(t.priority || '')}] ${escape(t.title)}${who}</li>`;
        })
        .join('')}</ol>`
    : `<p style="color:#777">No tasks due today.</p>`;

  const focusDemosHtml = data.focusDemosToday.length > 0
    ? `<p><strong>Demos / calls today:</strong></p><ol style="padding-left:20px">${data.focusDemosToday
        .map((d) => {
          const t = d.updated_at ? new Date(d.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
          return `<li style="margin-bottom:4px">${t} — ${escape(d.first_name || '')} ${escape(d.last_name || '')}, ${escape(d.company_name || '')}</li>`;
        })
        .join('')}</ol>`
    : '';

  const focusWarmColdHtml = data.focusWarmCold.length > 0
    ? `<p><strong>Warm leads growing cold (no advance in 3+ days):</strong></p><ol style="padding-left:20px">${data.focusWarmCold
        .map((l) => {
          const days = l.last_reply_at ? Math.floor((Date.now() - new Date(l.last_reply_at).getTime()) / 86400000) : 0;
          return `<li style="margin-bottom:4px">${escape(l.first_name || '')} ${escape(l.last_name || '')}, ${escape(l.company_name || '')} — replied ${days} day${days === 1 ? '' : 's'} ago, hasn't booked</li>`;
        })
        .join('')}</ol>`
    : '';

  const focusBlock = `
  <div style="background:#fff8e1;border-left:4px solid #f9a825;padding:16px 20px;margin-bottom:24px;border-radius:4px">
    <h3 style="margin-top:0">🎯 Today's Focus</h3>
    ${focusHotLeadsHtml}
    ${focusTasksHtml}
    ${focusDemosHtml}
    ${focusWarmColdHtml}
  </div>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h2>Outreach Daily Digest</h2>
  <p style="color:#666">${data.date}</p>

  ${focusBlock}

  <h3>Yesterday's Numbers</h3>
  <table style="border-collapse:collapse;width:100%">
    <tr><td style="padding:4px 8px">Emails Sent</td><td style="padding:4px 8px;font-weight:bold">${data.sent}</td></tr>
    <tr><td style="padding:4px 8px">Replies</td><td style="padding:4px 8px;font-weight:bold">${data.replies}</td></tr>
    <tr><td style="padding:4px 8px">Open Rate</td><td style="padding:4px 8px;font-weight:bold">${data.openRate}%</td></tr>
    <tr><td style="padding:4px 8px">Reply Rate</td><td style="padding:4px 8px;font-weight:bold">${data.replyRate}%</td></tr>
    <tr><td style="padding:4px 8px">Bounce Rate</td><td style="padding:4px 8px;font-weight:bold">${data.bounceRate}%</td></tr>
  </table>

  ${data.hotLeads.length > 0 ? `
  <h3>Hot Leads Needing Response</h3>
  <table style="border-collapse:collapse;width:100%">
    <tr style="background:#f5f5f5"><th style="padding:4px 8px;text-align:left">Name</th><th style="padding:4px 8px;text-align:left">Company</th><th style="padding:4px 8px">Score</th></tr>
    ${hotLeadRows}
  </table>` : ''}

  ${data.tasksDue.length > 0 ? `
  <h3>Tasks Due Today (${data.tasksDue.length})</h3>
  <table style="border-collapse:collapse;width:100%">
    <tr style="background:#f5f5f5"><th style="padding:4px 8px;text-align:left">Task</th><th style="padding:4px 8px;text-align:left">Priority</th></tr>
    ${taskRows}
  </table>` : ''}

  <h3>Pipeline Snapshot</h3>
  <table style="border-collapse:collapse;width:100%">
    <tr style="background:#f5f5f5"><th style="padding:4px 8px;text-align:left">Stage</th><th style="padding:4px 8px">Count</th></tr>
    ${pipelineRows}
  </table>

  ${attentionHtml}

  <hr style="margin-top:20px;border:none;border-top:1px solid #ddd">
  <p style="color:#999;font-size:12px">RKV Consulting Outreach Worker</p>
</body>
</html>`;
}

function buildDigestText(data: {
  date: string;
  sent: number;
  replies: number;
  openRate: string;
  replyRate: string;
  hotLeads: Array<{ first_name: string; last_name: string; company_name: string; score: number }>;
  tasksDue: Array<{ title: string }>;
  focusHotLeads: Array<{ first_name: string; last_name: string; company_name: string; score: number; body_text: string }>;
  focusTasksToday: Array<{ title: string; priority: string; first_name?: string; last_name?: string; company_name?: string }>;
  focusDemosToday: Array<{ first_name: string; last_name: string; company_name: string; updated_at: string }>;
  focusWarmCold: Array<{ first_name: string; last_name: string; company_name: string; last_reply_at: string }>;
}): string {
  let text = `TODAY'S FOCUS\n\n`;

  text += `HOT LEADS WAITING FOR YOU (respond within 2 hours):\n`;
  if (data.focusHotLeads.length === 0) {
    text += `  (none)\n`;
  } else {
    data.focusHotLeads.forEach((l, i) => {
      const snippet = (l.body_text || '').slice(0, 120).replace(/\n/g, ' ');
      text += `  ${i + 1}. ${l.first_name || ''} ${l.last_name || ''}, ${l.company_name || 'Unknown'} — Score: ${l.score || 0} — "${snippet}${(l.body_text || '').length > 120 ? '…' : ''}"\n`;
    });
  }
  text += `\n`;

  text += `TASKS DUE TODAY:\n`;
  if (data.focusTasksToday.length === 0) {
    text += `  (none)\n`;
  } else {
    data.focusTasksToday.forEach((t, i) => {
      const who = t.first_name || t.company_name
        ? ` — ${t.first_name || ''} ${t.last_name || ''}${t.company_name ? ` (${t.company_name})` : ''}`
        : '';
      text += `  ${i + 1}. [${t.priority || ''}] ${t.title}${who}\n`;
    });
  }
  text += `\n`;

  text += `DEMOS SCHEDULED TODAY:\n`;
  if (data.focusDemosToday.length === 0) {
    text += `  (none)\n`;
  } else {
    data.focusDemosToday.forEach((d, i) => {
      const tm = d.updated_at ? new Date(d.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
      text += `  ${i + 1}. ${tm} — ${d.first_name || ''} ${d.last_name || ''}, ${d.company_name || ''}\n`;
    });
  }
  text += `\n`;

  text += `WARM LEADS GROWING COLD (no response in 3+ days):\n`;
  if (data.focusWarmCold.length === 0) {
    text += `  (none)\n`;
  } else {
    data.focusWarmCold.forEach((l, i) => {
      const days = l.last_reply_at ? Math.floor((Date.now() - new Date(l.last_reply_at).getTime()) / 86400000) : 0;
      text += `  ${i + 1}. ${l.first_name || ''} ${l.last_name || ''}, ${l.company_name || ''} — replied ${days} day${days === 1 ? '' : 's'} ago, hasn't booked\n`;
    });
  }
  text += `\n----\n\n`;

  text += `OUTREACH DAILY DIGEST - ${data.date}\n\n`;
  text += `Sent: ${data.sent} | Replies: ${data.replies} | Open Rate: ${data.openRate}% | Reply Rate: ${data.replyRate}%\n\n`;

  if (data.hotLeads.length > 0) {
    text += `HOT LEADS:\n`;
    for (const l of data.hotLeads) {
      text += `  - ${l.first_name} ${l.last_name} at ${l.company_name} (Score: ${l.score})\n`;
    }
    text += '\n';
  }

  if (data.tasksDue.length > 0) {
    text += `TASKS DUE TODAY (${data.tasksDue.length}):\n`;
    for (const t of data.tasksDue) {
      text += `  - ${t.title}\n`;
    }
  }

  return text;
}
