'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { KPICard } from '@/components/dashboard/KPICard';
import { AgentStatusPanel } from '@/components/dashboard/AgentStatusPanel';
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed';
import { AgentActivityFeed } from '@/components/dashboard/AgentActivityFeed';
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
import { motion } from 'framer-motion';

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

function generateSparkline(current: number, variance: number = 0.15): number[] {
  const points: number[] = [];
  for (let i = 0; i < 12; i++) {
    const factor = 0.7 + (i / 12) * 0.3 + (Math.random() - 0.5) * variance;
    points.push(Math.round(current * factor));
  }
  points.push(current);
  return points;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchDashboard = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return;

    const orgId = profile.org_id;

    const [sitesRes, activityRes, agentLogsRes] = await Promise.all([
      supabase
        .from('sites')
        .select('id, target_capacity, pipeline_stage')
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

    const sites: Array<{ id: string; target_capacity: number | null; pipeline_stage: string }> = sitesRes.data || [];
    const activities = activityRes.data || [];
    const recentLogs: Array<{ agent_name: string; created_at: string }> = agentLogsRes.data || [];

    const siteIds = sites.map((s) => s.id);
    const { data: scores } = siteIds.length > 0
      ? await supabase.from('site_scores').select('composite_score').in('site_id', siteIds)
      : { data: [] as { composite_score: number }[] };

    const totalSites = sites.length;
    const aggregateMW = sites.reduce((sum, s) => sum + (s.target_capacity || 0), 0);
    const underContract = sites.filter((s) => s.pipeline_stage === 'under_contract' || s.pipeline_stage === 'closed').length;
    const avgScore = scores && scores.length > 0
      ? Math.round(scores.reduce((sum: number, s: { composite_score: number }) => sum + s.composite_score, 0) / scores.length)
      : 0;

    const agentCounts: Record<string, number> = {};
    recentLogs.forEach((l) => {
      agentCounts[l.agent_name] = (agentCounts[l.agent_name] || 0) + 1;
    });

    const agentStatuses = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].map((name) => ({
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
      pipelineValue: underContract * 2.5,
      pipelineCounts: sites.map((s) => ({ pipeline_stage: s.pipeline_stage })),
      agentStatuses,
      recentActivity: activities,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchDashboard();

    // Real-time subscription for live updates
    const channel = supabase
      .channel('dashboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sites' },
        () => { fetchDashboard(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_scores' },
        () => { fetchDashboard(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchDashboard]);

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
    { title: 'Total Sites', numericValue: data.totalSites, value: data.totalSites, icon: Building2, color: '#00D4AA', sparklineData: generateSparkline(data.totalSites) },
    { title: 'Aggregate Capacity', numericValue: data.aggregateMW, value: `${data.aggregateMW}`, icon: Zap, color: '#3B82F6', suffix: ' MW', sparklineData: generateSparkline(data.aggregateMW) },
    { title: 'Under Contract', numericValue: data.underContract, value: data.underContract, icon: FileCheck, color: '#F59E0B', sparklineData: generateSparkline(data.underContract, 0.3) },
    { title: 'Agent Activity (24h)', numericValue: data.agentActivity24h, value: data.agentActivity24h, icon: Bot, color: '#8A00FF', sparklineData: generateSparkline(data.agentActivity24h, 0.4) },
    { title: 'Avg Score', numericValue: data.avgScore, value: data.avgScore, icon: BarChart3, color: '#22C55E', subtitle: 'out of 100', sparklineData: generateSparkline(data.avgScore, 0.1) },
    { title: 'Pipeline Value', numericValue: data.pipelineValue, value: `$${data.pipelineValue}M`, icon: DollarSign, color: '#00D4AA', prefix: '$', suffix: 'M', sparklineData: generateSparkline(data.pipelineValue) },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary">Meridian Node overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, i) => (
          <KPICard key={kpi.title} {...kpi} index={i} />
        ))}
      </div>

      {/* Pipeline Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.36 }}
        className="glass-card p-4"
      >
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Pipeline Distribution</h3>
        <div className="flex gap-2 h-8">
          {PIPELINE_STAGES.map((stage) => {
            const count = data.pipelineCounts.filter((s) => s.pipeline_stage === stage.value).length;
            const pct = data.totalSites > 0 ? (count / data.totalSites) * 100 : 0;
            if (pct === 0) return null;
            return (
              <motion.div
                key={stage.value}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, 8)}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-md flex items-center justify-center text-[10px] font-semibold text-bg-primary"
                style={{ backgroundColor: stage.color }}
                title={`${stage.label}: ${count}`}
              >
                {count}
              </motion.div>
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
      </motion.div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgentStatusPanel agents={data.agentStatuses} />
        <AgentActivityFeed />
      </div>

      {/* Recent Activity */}
      <RecentActivityFeed activities={data.recentActivity} />
    </div>
  );
}
