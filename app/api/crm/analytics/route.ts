import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STAGES = ['lead', 'analyzing', 'offer_sent', 'under_contract', 'due_diligence', 'closing', 'closed', 'dead'];

interface DealRow {
  id: string;
  status: string | null;
  source: string | null;
  asking_price: number | null;
  arv: number | null;
  created_at: string;
  updated_at: string;
  close_date: string | null;
  stage_entered_at: string | null;
}

interface HistoryRow {
  deal_id: string;
  from_stage: string | null;
  to_stage: string;
  entered_at: string;
  exited_at: string | null;
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all deals for this user
    const { data: deals, error: dealsErr } = await supabase
      .from('deals')
      .select('id, status, source, asking_price, arv, created_at, updated_at, close_date, stage_entered_at')
      .eq('user_id', user.id);

    if (dealsErr) {
      console.error('[Pipeline Analytics] DB error:', dealsErr.message);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Fetch stage history
    const { data: history } = await supabase
      .from('deal_stage_history')
      .select('deal_id, from_stage, to_stage, entered_at, exited_at')
      .eq('user_id', user.id);

    const allDeals = (deals || []) as DealRow[];
    const allHistory = (history || []) as HistoryRow[];

    // ── KPI Cards ──
    const totalDeals = allDeals.length;
    const closedDeals = allDeals.filter((d) => d.status === 'closed');
    const deadDeals = allDeals.filter((d) => d.status === 'dead');
    const totalCompleted = closedDeals.length + deadDeals.length;
    const winRate = totalCompleted > 0 ? Math.round((closedDeals.length / totalCompleted) * 100) : 0;

    const totalPipelineValue = allDeals
      .filter((d) => d.status !== 'dead' && d.status !== 'closed')
      .reduce((s, d) => s + (d.asking_price || 0), 0);

    const closedDaysArr = closedDeals.map((d) => {
      const created = new Date(d.created_at).getTime();
      const closed = d.close_date ? new Date(d.close_date).getTime() : new Date(d.updated_at).getTime();
      return Math.max(0, Math.floor((closed - created) / 86400000));
    });
    const avgDaysToClose = closedDaysArr.length > 0
      ? Math.round(closedDaysArr.reduce((a, b) => a + b, 0) / closedDaysArr.length)
      : 0;

    // Pipeline velocity: avg deal value × win rate × deals per month
    const months = Math.max(1, (Date.now() - Math.min(...allDeals.map((d) => new Date(d.created_at).getTime()))) / (30 * 86400000));
    const avgDealValue = allDeals.length > 0
      ? allDeals.reduce((s, d) => s + (d.asking_price || 0), 0) / allDeals.length
      : 0;
    const pipelineVelocity = Math.round(avgDealValue * (winRate / 100) * (totalDeals / months));

    // ── Conversion Funnel ──
    const funnel = STAGES.map((stage) => ({
      stage,
      count: allDeals.filter((d) => d.status === stage).length,
    }));

    // ── Stage Timing (from history) ──
    const stageTiming = STAGES.filter((s) => s !== 'dead').map((stage) => {
      const entries = allHistory.filter((h) => h.to_stage === stage && h.exited_at);
      const durations = entries.map((h) => {
        const entered = new Date(h.entered_at).getTime();
        const exited = new Date(h.exited_at!).getTime();
        return Math.max(0, Math.floor((exited - entered) / 86400000));
      });
      const avgDays = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
      return { stage, avgDays, count: entries.length };
    });

    // ── Source ROI ──
    const sources = new Set(allDeals.map((d) => d.source || 'Unknown'));
    const sourceMetrics = Array.from(sources).map((source) => {
      const sourceDeals = allDeals.filter((d) => (d.source || 'Unknown') === source);
      const sourceClosed = sourceDeals.filter((d) => d.status === 'closed');
      const sourceTotal = sourceDeals.filter((d) => d.status !== 'dead').length;
      return {
        source,
        totalDeals: sourceDeals.length,
        closedDeals: sourceClosed.length,
        closeRate: sourceTotal > 0 ? Math.round((sourceClosed.length / sourceTotal) * 100) : 0,
        totalValue: sourceClosed.reduce((s, d) => s + (d.asking_price || 0), 0),
      };
    });

    // ── Monthly Trends (last 12 months) ──
    const now = new Date();
    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      const newDeals = allDeals.filter((deal) => {
        const created = new Date(deal.created_at);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      }).length;

      const closed = closedDeals.filter((deal) => {
        const closeDate = deal.close_date ? new Date(deal.close_date) : new Date(deal.updated_at);
        return closeDate >= d && closeDate <= monthEnd;
      }).length;

      const dead = deadDeals.filter((deal) => {
        const deadDate = new Date(deal.updated_at);
        return deadDate >= d && deadDate <= monthEnd;
      }).length;

      return { month: monthKey, label, newDeals, closed, dead };
    });

    // ── Pipeline Value by Stage ──
    const valueByStage = STAGES.filter((s) => s !== 'dead').map((stage) => ({
      stage,
      value: allDeals
        .filter((d) => d.status === stage)
        .reduce((s, d) => s + (d.asking_price || 0), 0),
    }));

    return NextResponse.json({
      kpis: {
        totalDeals,
        totalPipelineValue,
        winRate,
        avgDaysToClose,
        pipelineVelocity,
        closedCount: closedDeals.length,
      },
      funnel,
      stageTiming,
      sourceMetrics,
      monthlyTrends,
      valueByStage,
    });
  } catch (error) {
    console.error('[Pipeline Analytics]', error);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
