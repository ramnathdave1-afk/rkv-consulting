import { BaseAgent } from '../base-agent';
import { query, ORG_ID } from '../db';
import { getCostSummary } from '../cost-tracker';
import { getAllAccounts } from '../gmail-sender';
import type { AgentName, AgentRunResult, AgentInput } from '../types';

class CampaignOrchestrator extends BaseAgent {
  name: AgentName = 'campaign_orchestrator';
  description = 'Coordinates all agents, generates weekly reports, health checks, auto-tunes';

  async run(input: AgentInput): Promise<AgentRunResult> {
    const action = (input.action as string) || 'health_check';

    switch (action) {
      case 'health_check':
        return this.healthCheck();
      case 'weekly_report':
        return this.weeklyReport();
      case 'reset_daily':
        return this.resetDailyCounts();
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  private async healthCheck(): Promise<AgentRunResult> {
    await this.updateStatus('running', 'Running health check');

    // Check agent statuses
    const agents = await query<{ agent_name: string; status: string; last_run_at: string; last_error: string }>(
      `SELECT agent_name, status, last_run_at, last_error FROM outreach_agent_status WHERE org_id = $1`,
      [ORG_ID]
    );

    const errors = agents.rows.filter(a => a.status === 'error');

    // Check Gmail accounts
    const accounts = await getAllAccounts();
    const unhealthy = accounts.filter(a => a.bounce_rate > 5 || a.status === 'blacklisted');

    // Check costs
    const costs = await getCostSummary();

    // Log to system terminal
    const healthStatus = {
      agents: { total: agents.rows.length, errors: errors.length, errorNames: errors.map(e => e.agent_name) },
      gmail: { total: accounts.length, active: accounts.filter(a => a.status === 'active').length, warming: accounts.filter(a => a.status === 'warming').length, unhealthy: unhealthy.length },
      costs: { today: costs.today.toFixed(2), week: costs.thisWeek.toFixed(2), month: costs.thisMonth.toFixed(2) },
    };

    const level = errors.length > 0 || unhealthy.length > 0 ? 'warning' : 'info';
    await this.log(level,
      `Health: ${agents.rows.length} agents (${errors.length} errors), ` +
      `${accounts.length} Gmail accounts (${unhealthy.length} unhealthy), ` +
      `Cost today: $${costs.today.toFixed(2)}`,
      healthStatus
    );

    return { success: true, data: healthStatus };
  }

  private async weeklyReport(): Promise<AgentRunResult> {
    await this.updateStatus('running', 'Generating weekly report');

    // Gather stats for the week
    const [sends, replies, meetings, deals, costs] = await Promise.all([
      query<{ total: string; opened: string; clicked: string; bounced: string }>(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status IN ('opened','clicked','replied')) as opened,
           COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
           COUNT(*) FILTER (WHERE status = 'bounced') as bounced
         FROM outreach_sends
         WHERE org_id = $1 AND sent_at >= date_trunc('week', CURRENT_DATE)`,
        [ORG_ID]
      ),
      query<{ total: string; interested: string; objection: string; not_interested: string }>(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE classification = 'interested') as interested,
           COUNT(*) FILTER (WHERE classification = 'objection') as objection,
           COUNT(*) FILTER (WHERE classification = 'not_interested') as not_interested
         FROM outreach_replies
         WHERE org_id = $1 AND created_at >= date_trunc('week', CURRENT_DATE)`,
        [ORG_ID]
      ),
      query<{ total: string }>(
        `SELECT COUNT(*) as total FROM outreach_meetings
         WHERE org_id = $1 AND created_at >= date_trunc('week', CURRENT_DATE)`,
        [ORG_ID]
      ),
      query<{ total_value: string }>(
        `SELECT COALESCE(SUM(value_monthly), 0) as total_value FROM outreach_deals
         WHERE org_id = $1 AND stage = 'closed_won'`,
        [ORG_ID]
      ),
      getCostSummary(),
    ]);

    const totalSent = parseInt(sends.rows[0].total);
    const totalOpened = parseInt(sends.rows[0].opened);
    const openRate = totalSent > 0 ? (totalOpened / totalSent * 100) : 0;
    const totalReplies = parseInt(replies.rows[0].total);
    const replyRate = totalSent > 0 ? (totalReplies / totalSent * 100) : 0;

    // Subject line performance
    const subjectPerf = await query<{ subject_variant: string; sent: string; opened: string }>(
      `SELECT subject_variant, COUNT(*) as sent,
              COUNT(*) FILTER (WHERE status IN ('opened','clicked','replied')) as opened
       FROM outreach_sends
       WHERE org_id = $1 AND sent_at >= date_trunc('week', CURRENT_DATE)
         AND subject_variant IS NOT NULL
       GROUP BY subject_variant`,
      [ORG_ID]
    );

    const reportData = {
      emails_sent: totalSent,
      open_rate: openRate,
      reply_rate: replyRate,
      replies_total: totalReplies,
      interested: parseInt(replies.rows[0].interested),
      objections: parseInt(replies.rows[0].objection),
      meetings_booked: parseInt(meetings.rows[0].total),
      pipeline_value: parseFloat(deals.rows[0].total_value),
      cost_week: costs.thisWeek,
      cost_by_agent: costs.byAgent,
      subject_line_performance: subjectPerf.rows.map(s => ({
        variant: s.subject_variant,
        sent: parseInt(s.sent),
        opened: parseInt(s.opened),
        open_rate: parseInt(s.sent) > 0 ? (parseInt(s.opened) / parseInt(s.sent) * 100).toFixed(1) : '0',
      })),
    };

    // Sonnet analysis
    const { content: analysis } = await this.callSonnet(
      [{ role: 'user', content: `Analyze this week's cold outreach performance and provide actionable recommendations.\n\n${JSON.stringify(reportData, null, 2)}\n\nProvide:\n1. What's working well\n2. What's not working\n3. Specific adjustments to make next week (subject lines, send times, email angles, ICP weights)` }],
      'You are a B2B sales analytics expert. Provide concise, data-driven analysis with specific recommendations.',
      { maxTokens: 1024 }
    );

    // Save weekly report
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    await query(
      `INSERT INTO outreach_weekly_reports
       (org_id, week_start, week_end, emails_sent, open_rate, reply_rate,
        meetings_booked, pipeline_value, cost_total, report_data, ai_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT DO NOTHING`,
      [
        ORG_ID, weekStart, weekEnd, totalSent, openRate, replyRate,
        parseInt(meetings.rows[0].total), parseFloat(deals.rows[0].total_value),
        costs.thisWeek, JSON.stringify(reportData), analysis,
      ]
    );

    await this.log('success', `Weekly report generated: ${totalSent} sent, ${openRate.toFixed(1)}% open, ${replyRate.toFixed(1)}% reply, ${meetings.rows[0].total} meetings`);

    return { success: true, data: { ...reportData, analysis } };
  }

  private async resetDailyCounts(): Promise<AgentRunResult> {
    const { resetDailyCounts } = await import('../cost-tracker');
    await resetDailyCounts();
    await this.log('info', 'Daily counts reset for all agents and domains');
    return { success: true, data: { reset: true } };
  }
}

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return d.toISOString().split('T')[0];
}

function getWeekEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 7); // Sunday
  return d.toISOString().split('T')[0];
}

export default new CampaignOrchestrator();
