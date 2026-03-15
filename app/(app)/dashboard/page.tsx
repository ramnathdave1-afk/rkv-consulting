'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { KPICard } from '@/components/dashboard/KPICard';
import { AgentStatusPanel } from '@/components/dashboard/AgentStatusPanel';
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Building2,
  Zap,
  FileCheck,
  Bot,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import { PIPELINE_STAGES } from '@/lib/constants';

interface DashboardData {
  totalSites: number;
  aggregateMW: number;
  underContract: number;
  agentActivity24h: number;
  avgScore: number;
  pipelineValue: number;
  pipelineCounts: Array<{ pipeline_stage: string }>;
  agentStatuses: Array<{ name: string; status: 'running' | 'idle' | 'completed'; last_run: string | null; actions_24h: number }>;
  recentActivity: Array<{ id: string; agent_name: string | null; action: string; details: Record<string, unknown> | null; created_at: string }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const orgId = profile.org_id;

      // Parallel queries
      const [sitesRes, activityRes, agentLogsRes] = await Promise.all([
        supabase
          .from('ghost_sites')
          .select('id, target_mw, pipeline_stage')
          .eq('org_id', orgId),
        supabase
          .from('agent_activity_log')
          .select('id, agent_name, action, details, created_at')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('agent_activity_log')
          .select('agent_name, created_at')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const sites: Array<{ id: string; target_mw: number | null; pipeline_stage: string }> = sitesRes.data || [];
      const activities = activityRes.data || [];
      const recentLogs: Array<{ agent_name: string; created_at: string }> = agentLogsRes.data || [];

      // Fetch scores
      const siteIds = sites.map((s) => s.id);
      const { data: scores } = siteIds.length > 0
        ? await supabase.from('site_scores').select('composite_score').in('site_id', siteIds)
        : { data: [] as { composite_score: number }[] };

      const totalSites = sites.length;
      const aggregateMW = sites.reduce((sum, s) => sum + (s.target_mw || 0), 0);
      const underContract = sites.filter((s) => s.pipeline_stage === 'under_contract' || s.pipeline_stage === 'closed').length;
      const avgScore = scores && scores.length > 0
        ? Math.round(scores.reduce((sum: number, s: { composite_score: number }) => sum + s.composite_score, 0) / scores.length)
        : 0;

      // Agent status counts
      const agentCounts: Record<string, number> = {};
      recentLogs.forEach((l) => {
        agentCounts[l.agent_name] = (agentCounts[l.agent_name] || 0) + 1;
      });

      const agentStatuses = ['alpha', 'beta', 'gamma', 'delta'].map((name) => ({
        name,
        status: 'idle' as const,
        last_run: null,
        actions_24h: agentCounts[name] || 0,
      }));

      setData({
        totalSites,
        aggregateMW,
        underContract,
        agentActivity24h: recentLogs.length,
        avgScore,
        pipelineValue: underContract * 2.5, // Simplified
        pipelineCounts: sites.map((s) => ({ pipeline_stage: s.pipeline_stage })),
        agentStatuses,
        recentActivity: activities,
      });
      setLoading(false);
    }

    fetchDashboard();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { title: 'Total Sites', value: data.totalSites, icon: Building2, color: '#00D4AA' },
    { title: 'Aggregate MW', value: `${data.aggregateMW}MW`, icon: Zap, color: '#3B82F6' },
    { title: 'Under Contract', value: data.underContract, icon: FileCheck, color: '#F59E0B' },
    { title: 'Agent Activity (24h)', value: data.agentActivity24h, icon: Bot, color: '#8A00FF' },
    { title: 'Avg Score', value: data.avgScore, icon: BarChart3, color: '#22C55E', subtitle: 'out of 100' },
    { title: 'Pipeline Value', value: `$${data.pipelineValue}M`, icon: DollarSign, color: '#00D4AA' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">Meridian Node overview</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, i) => (
          <KPICard key={kpi.title} {...kpi} index={i} />
        ))}
      </div>

      {/* Pipeline Distribution */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Pipeline Distribution</h3>
        <div className="flex gap-2 h-8">
          {PIPELINE_STAGES.map((stage) => {
            const count = data.pipelineCounts.filter((s) => s.pipeline_stage === stage.value).length;
            const pct = data.totalSites > 0 ? (count / data.totalSites) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={stage.value}
                className="rounded-md flex items-center justify-center text-[10px] font-semibold text-bg-primary transition-all"
                style={{ backgroundColor: stage.color, width: `${Math.max(pct, 8)}%` }}
                title={`${stage.label}: ${count}`}
              >
                {count}
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.value} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="text-[10px] text-text-muted">{stage.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgentStatusPanel agents={data.agentStatuses} />
        <RecentActivityFeed activities={data.recentActivity} />
      </div>
    </div>
  );
}
