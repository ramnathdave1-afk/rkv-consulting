'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface Mission {
  id: string;
  agent: string;
  region: string;
  params: Record<string, unknown>;
  status: 'active' | 'paused' | 'completed';
  matches: number;
  created_at: string;
}

// Generate synthetic missions from agent activity
function generateMissions(agentCounts: Record<string, number>): Mission[] {
  const missions: Mission[] = [
    { id: 'M-001', agent: 'alpha', region: 'Virginia', params: { min_mw: 50, voltage_kv: 230 }, status: 'active', matches: agentCounts.alpha || 0, created_at: '2025-01-15' },
    { id: 'M-002', agent: 'beta', region: 'Pennsylvania', params: { min_acres: 40, max_distance_mi: 10 }, status: 'active', matches: agentCounts.beta || 0, created_at: '2025-01-20' },
    { id: 'M-003', agent: 'gamma', region: 'Ohio', params: { scoring_model: 'v2', threshold: 60 }, status: 'active', matches: agentCounts.gamma || 0, created_at: '2025-02-01' },
    { id: 'M-004', agent: 'delta', region: 'All PJM', params: { metrics: ['power_cost', 'land_cost', 'incentives'] }, status: 'active', matches: agentCounts.delta || 0, created_at: '2025-02-10' },
    { id: 'M-005', agent: 'alpha', region: 'West Virginia', params: { min_mw: 100, voltage_kv: 500 }, status: 'paused', matches: 0, created_at: '2025-01-10' },
  ];
  return missions;
}

interface MissionsTableProps {
  agentCounts: Record<string, number>;
}

const agentColors: Record<string, string> = { alpha: '#00D4AA', beta: '#3B82F6', gamma: '#F59E0B', delta: '#8A00FF' };
const statusColors: Record<string, string> = { active: '#22C55E', paused: '#F59E0B', completed: '#4A5568' };

export function MissionsTable({ agentCounts }: MissionsTableProps) {
  const missions = generateMissions(agentCounts);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{missions.length} configured missions</p>
        <button className="flex items-center gap-1 rounded-lg bg-accent/10 border border-accent/20 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/20 transition-colors">
          <Plus size={10} />
          New Mission
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
              <th className="py-1.5 px-2 text-left w-6"></th>
              <th className="py-1.5 px-2 text-left">Mission</th>
              <th className="py-1.5 px-2 text-left">Agent</th>
              <th className="py-1.5 px-2 text-left">Region</th>
              <th className="py-1.5 px-2 text-right">Matches</th>
              <th className="py-1.5 px-2 text-left">Status</th>
              <th className="py-1.5 px-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {missions.map((m) => (
              <React.Fragment key={m.id}>
                <tr
                  className="border-b border-border/30 hover:bg-bg-elevated/20 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                >
                  <td className="py-1.5 px-2 text-text-muted">
                    {expanded === m.id ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-text-primary">{m.id}</td>
                  <td className="py-1.5 px-2">
                    <span className="font-semibold uppercase text-[10px]" style={{ color: agentColors[m.agent] }}>{m.agent}</span>
                  </td>
                  <td className="py-1.5 px-2 text-text-secondary">{m.region}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-accent">{m.matches}</td>
                  <td className="py-1.5 px-2">
                    <Badge color={statusColors[m.status]} size="sm">{m.status}</Badge>
                  </td>
                  <td className="py-1.5 px-2 text-text-muted font-mono text-[10px]">{m.created_at}</td>
                </tr>
                {expanded === m.id && (
                  <tr className="bg-bg-elevated/10">
                    <td colSpan={7} className="px-8 py-2">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Parameters</p>
                      <pre className="text-[10px] font-mono text-text-secondary">{JSON.stringify(m.params, null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
