import { query, ORG_ID } from './db';

export interface CostSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  byAgent: { agent_name: string; cost: number; runs: number }[];
  byModel: { model: string; cost: number; tokens: number }[];
}

export async function getDailyCost(): Promise<number> {
  const result = await query<{ total: string }>(
    `SELECT COALESCE(SUM(cost_usd), 0) as total
     FROM outreach_agent_runs
     WHERE org_id = $1 AND started_at >= CURRENT_DATE`,
    [ORG_ID]
  );
  return parseFloat(result.rows[0].total);
}

export async function getWeeklyCost(): Promise<number> {
  const result = await query<{ total: string }>(
    `SELECT COALESCE(SUM(cost_usd), 0) as total
     FROM outreach_agent_runs
     WHERE org_id = $1 AND started_at >= date_trunc('week', CURRENT_DATE)`,
    [ORG_ID]
  );
  return parseFloat(result.rows[0].total);
}

export async function getMonthlyCost(): Promise<number> {
  const result = await query<{ total: string }>(
    `SELECT COALESCE(SUM(cost_usd), 0) as total
     FROM outreach_agent_runs
     WHERE org_id = $1 AND started_at >= date_trunc('month', CURRENT_DATE)`,
    [ORG_ID]
  );
  return parseFloat(result.rows[0].total);
}

export async function getCostSummary(): Promise<CostSummary> {
  const [daily, weekly, monthly, byAgent] = await Promise.all([
    getDailyCost(),
    getWeeklyCost(),
    getMonthlyCost(),
    query<{ agent_name: string; cost: string; runs: string }>(
      `SELECT agent_name, COALESCE(SUM(cost_usd), 0) as cost, COUNT(*) as runs
       FROM outreach_agent_runs
       WHERE org_id = $1 AND started_at >= date_trunc('month', CURRENT_DATE)
       GROUP BY agent_name ORDER BY cost DESC`,
      [ORG_ID]
    ),
  ]);

  return {
    today: daily,
    thisWeek: weekly,
    thisMonth: monthly,
    byAgent: byAgent.rows.map((r) => ({
      agent_name: r.agent_name,
      cost: parseFloat(r.cost),
      runs: parseInt(r.runs),
    })),
    byModel: [], // Populated from agent_runs metadata if needed
  };
}

export async function resetDailyCounts(): Promise<void> {
  await query(
    `UPDATE outreach_agent_status SET runs_today = 0, tokens_today = 0, cost_today = 0 WHERE org_id = $1`,
    [ORG_ID]
  );
  await query(
    `UPDATE outreach_domains SET current_daily_count = 0, last_reset_at = now() WHERE org_id = $1`,
    [ORG_ID]
  );
}
