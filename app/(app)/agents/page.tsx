'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { MissionsTable } from '@/components/agents/MissionsTable';
import { ReviewInbox } from '@/components/agents/ReviewInbox';
import { AgentTerminal } from '@/components/agents/AgentTerminal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Target, Inbox, Terminal } from 'lucide-react';
import { AGENTS } from '@/lib/constants';

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
  const supabase = createClient();

  useEffect(() => {
    async function fetchLogs() {
      const { data } = await supabase
        .from('agent_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      setLogs(data || []);
      setLoading(false);
    }

    fetchLogs();

    const channel = supabase
      .channel('agent_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_activity_log' },
        (payload: { new: Record<string, unknown> }) => {
          setLogs((prev) => [payload.new as unknown as LogEntry, ...prev].slice(0, 200));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const agentCounts: Record<string, number> = {};
  logs.forEach((l) => { agentCounts[l.agent_name] = (agentCounts[l.agent_name] || 0) + 1; });

  const agentColors: Record<string, string> = { alpha: '#00D4AA', beta: '#3B82F6', gamma: '#F59E0B', delta: '#8A00FF' };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header with agent status chips */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-text-primary">Intelligence Hub</h1>
          <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">Agent Command & Control</p>
        </div>
        <div className="flex items-center gap-2">
          {AGENTS.map((agent) => (
            <div key={agent.name} className="flex items-center gap-1.5 glass-card px-2 py-1">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agentColors[agent.name] }} />
              <span className="text-[10px] font-semibold uppercase" style={{ color: agentColors[agent.name] }}>{agent.name}</span>
              <span className="text-[9px] font-mono text-text-muted">{agentCounts[agent.name] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="missions">
        <TabsList>
          <TabsTrigger value="missions" icon={<Target size={12} />}>Active Missions</TabsTrigger>
          <TabsTrigger value="inbox" icon={<Inbox size={12} />}>Review Inbox</TabsTrigger>
          <TabsTrigger value="terminal" icon={<Terminal size={12} />}>Terminal</TabsTrigger>
        </TabsList>

        <TabsContent value="missions">
          <MissionsTable agentCounts={agentCounts} />
        </TabsContent>

        <TabsContent value="inbox">
          <ReviewInbox findings={logs.slice(0, 50)} />
        </TabsContent>

        <TabsContent value="terminal">
          <AgentTerminal logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
