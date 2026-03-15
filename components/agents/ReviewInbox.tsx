'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { InferenceCard } from './InferenceCard';

interface Finding {
  id: string;
  agent_name: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface ReviewInboxProps {
  findings: Finding[];
}

const agentColors: Record<string, string> = { alpha: '#00D4AA', beta: '#3B82F6', gamma: '#F59E0B', delta: '#8A00FF' };

export function ReviewInbox({ findings }: ReviewInboxProps) {
  const [selectedId, setSelectedId] = useState<string | null>(findings[0]?.id || null);
  const selected = findings.find((f) => f.id === selectedId) || null;

  return (
    <div className="grid grid-cols-[300px_1fr] h-[500px] glass-card overflow-hidden">
      {/* Left: Finding list */}
      <div className="border-r border-border overflow-y-auto">
        <div className="px-2.5 py-2 border-b border-border">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">{findings.length} findings</p>
        </div>
        {findings.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-text-muted">No new findings</div>
        )}
        {findings.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedId(f.id)}
            className={cn(
              'w-full text-left px-2.5 py-2 border-b border-border/30 transition-colors',
              selectedId === f.id ? 'bg-accent/5' : 'hover:bg-bg-elevated/30',
            )}
          >
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agentColors[f.agent_name] || '#4A5568' }} />
              <span className="text-[10px] font-semibold uppercase" style={{ color: agentColors[f.agent_name] }}>{f.agent_name}</span>
              <span className="text-[9px] text-text-muted ml-auto">{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{f.action}</p>
          </button>
        ))}
      </div>

      {/* Right: Inference Card */}
      <InferenceCard finding={selected} />
    </div>
  );
}
