'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Radio } from 'lucide-react';

interface FeedEntry {
  id: string;
  agent_name: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

const agentColors: Record<string, string> = { alpha: '#00D4AA', beta: '#3B82F6', gamma: '#F59E0B', delta: '#8A00FF' };

export function DiscoveryFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('agent_activity_log')
      .select('id, agent_name, action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }: { data: FeedEntry[] | null }) => setEntries((data || []) as FeedEntry[]));

    const channel = supabase
      .channel('discovery_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_activity_log' },
        (payload: { new: Record<string, unknown> }) => {
          setEntries((prev) => [payload.new as unknown as FeedEntry, ...prev].slice(0, 50));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  return (
    <div className="absolute top-3 left-3 z-10 w-72">
      <div className="glass rounded-lg overflow-hidden" style={{ maxHeight: 384 }}>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border">
          <Radio size={10} className="text-accent animate-pulse" />
          <span className="text-[10px] font-semibold text-text-primary uppercase tracking-wider">Live Discovery</span>
          <span className="text-[9px] text-text-muted ml-auto">{entries.length}</span>
        </div>
        <div ref={feedRef} className="overflow-y-auto p-1.5 space-y-0.5" style={{ maxHeight: 340 }}>
          {entries.length === 0 && (
            <p className="text-[10px] text-text-muted text-center py-4">Waiting for agent activity...</p>
          )}
          {entries.map((entry) => {
            const ts = new Date(entry.created_at);
            const timeStr = ts.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const coords = entry.details?.lat && entry.details?.lng
              ? `${(entry.details.lat as number).toFixed(2)}, ${(entry.details.lng as number).toFixed(2)}`
              : null;

            return (
              <div key={entry.id} className="flex items-start gap-1.5 px-1.5 py-0.5 rounded hover:bg-bg-elevated/20 transition-colors">
                <span className="text-[9px] font-mono text-text-muted shrink-0 w-14 mt-0.5">{timeStr}</span>
                <span
                  className="text-[9px] font-bold uppercase shrink-0 w-10 mt-0.5"
                  style={{ color: agentColors[entry.agent_name] || '#8B95A5' }}
                >
                  {entry.agent_name}
                </span>
                <span className="text-[10px] text-text-secondary leading-tight">
                  {entry.action}
                  {coords && (
                    <span className="text-accent font-mono text-[9px] ml-1">[{coords}]</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
