'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Bot, Terminal, RefreshCw } from 'lucide-react';
import { AGENTS } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  agent_name: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function AgentsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const feedRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLogs() {
      const { data } = await supabase
        .from('agent_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setLogs(data || []);
      setLoading(false);
    }

    fetchLogs();

    // Real-time subscription
    const channel = supabase
      .channel('agent_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_activity_log' },
        (payload: { new: Record<string, unknown> }) => {
          setLogs((prev) => [payload.new as unknown as LogEntry, ...prev].slice(0, 100));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.agent_name === filter);

  const agentColor: Record<string, string> = {
    alpha: '#00D4AA',
    beta: '#3B82F6',
    gamma: '#F59E0B',
    delta: '#8A00FF',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Agents</h1>
          <p className="text-sm text-text-secondary">Autonomous agent activity feed</p>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AGENTS.map((agent, i) => {
          const count = logs.filter((l) => l.agent_name === agent.name).length;
          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className={cn(
                'glass-card p-4 cursor-pointer transition-colors',
                filter === agent.name && 'border-accent/30',
              )}
              onClick={() => setFilter(filter === agent.name ? 'all' : agent.name)}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: agentColor[agent.name] }}
                />
                <span className="text-sm font-semibold text-text-primary">{agent.label}</span>
              </div>
              <p className="text-xs text-text-muted">{agent.description}</p>
              <p className="mt-2 text-lg font-mono font-bold text-text-primary">{count}</p>
              <p className="text-[10px] text-text-muted">logged actions</p>
            </motion.div>
          );
        })}
      </div>

      {/* Terminal-style feed */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <Terminal size={14} className="text-accent" />
          <span className="text-xs font-mono font-medium text-text-primary">Activity Feed</span>
          <span className="text-[10px] text-text-muted">({filteredLogs.length} entries)</span>
        </div>
        <div
          ref={feedRef}
          className="h-[400px] overflow-y-auto bg-bg-primary/50 p-3 font-mono text-xs space-y-1"
        >
          {loading && <p className="text-text-muted">Loading agent logs...</p>}
          {!loading && filteredLogs.length === 0 && (
            <p className="text-text-muted py-8 text-center">No agent activity yet. Agents will log their actions here.</p>
          )}
          {filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-bg-elevated/30 px-1 rounded">
              <span className="text-text-muted shrink-0 w-28 text-[10px]">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </span>
              <span
                className="shrink-0 font-semibold uppercase text-[10px] w-12"
                style={{ color: agentColor[log.agent_name] || '#8B95A5' }}
              >
                {log.agent_name}
              </span>
              <span className="text-text-secondary">{log.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
