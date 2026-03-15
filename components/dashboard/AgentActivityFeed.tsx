'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Activity, ChevronDown, ChevronRight, Zap, Search, BarChart3, TrendingUp, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentLog {
  id: string;
  agent_name: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

const agentColors: Record<string, string> = {
  alpha: '#00D4AA',
  beta: '#3B82F6',
  gamma: '#F59E0B',
  delta: '#8A00FF',
  epsilon: '#A855F7',
  zeta: '#06B6D4',
};

const agentIcons: Record<string, typeof Zap> = {
  alpha: Zap,
  beta: Search,
  gamma: BarChart3,
  delta: TrendingUp,
  epsilon: Shield,
  zeta: Activity,
};

const agentLabels: Record<string, string> = {
  alpha: 'Infrastructure Scanner',
  beta: 'Site Discovery',
  gamma: 'Multi-Dimension Scorer',
  delta: 'Market Intelligence',
  epsilon: 'Feasibility Analyzer',
  zeta: 'Data Ingestion',
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function AgentActivityFeed() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    supabase
      .from('agent_activity_log')
      .select('id, agent_name, action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }: { data: AgentLog[] | null }) => {
        if (data) setLogs(data);
      });

    // Real-time subscription
    const channel = supabase
      .channel('agent-activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_activity_log' },
        (payload: { new: Record<string, unknown> }) => {
          const newLog = payload.new as unknown as AgentLog;
          setLogs((prev) => [newLog, ...prev].slice(0, 50));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const filteredLogs = filter ? logs.filter((l) => l.agent_name === filter) : logs;
  const agents = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'];

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-accent" />
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">Agent Activity Feed</h3>
          <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" title="Live" />
        </div>
      </div>

      {/* Agent filters */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
            !filter ? 'bg-accent/15 text-accent' : 'bg-bg-elevated text-text-muted hover:text-text-primary',
          )}
        >
          All
        </button>
        {agents.map((name) => (
          <button
            key={name}
            onClick={() => setFilter(filter === name ? null : name)}
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
              filter === name ? 'text-white' : 'bg-bg-elevated text-text-muted hover:text-text-primary',
            )}
            style={filter === name ? { backgroundColor: agentColors[name] } : {}}
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="max-h-64 overflow-y-auto space-y-0.5">
        <AnimatePresence initial={false}>
          {filteredLogs.map((log) => {
            const Icon = agentIcons[log.agent_name] || Activity;
            const color = agentColors[log.agent_name] || '#6B7280';
            const isExpanded = expandedId === log.id;
            const hasDetails = log.details && Object.keys(log.details).length > 0;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                    hasDetails && 'hover:bg-bg-elevated/50 cursor-pointer',
                    !hasDetails && 'cursor-default',
                  )}
                >
                  <div
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon size={10} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold" style={{ color }}>
                        {agentLabels[log.agent_name] || log.agent_name}
                      </span>
                      <span className="text-[9px] text-text-muted/60">{formatRelativeTime(log.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{log.action}</p>
                  </div>
                  {hasDetails && (
                    isExpanded ? <ChevronDown size={10} className="mt-1 text-text-muted shrink-0" /> : <ChevronRight size={10} className="mt-1 text-text-muted shrink-0" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && hasDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-9 mb-1"
                    >
                      <pre className="rounded-md bg-bg-elevated/50 px-2 py-1.5 text-[9px] text-text-muted overflow-x-auto max-h-24">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
