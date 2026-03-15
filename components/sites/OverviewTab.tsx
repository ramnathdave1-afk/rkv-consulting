'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { MapPin, Zap, Shield, TrendingUp, Wifi } from 'lucide-react';
import { ScoreGauge } from '@/components/reports/ScoreGauge';
import { ScoreBreakdown } from '@/components/reports/ScoreBreakdown';
import { ScoreRadarChart } from '@/components/dashboard/ScoreRadarChart';
import { formatDistanceToNow } from 'date-fns';
import type { Site, SiteScore, Substation } from '@/lib/types';

interface OverviewTabProps {
  site: Site;
  score: SiteScore | null;
  substation: Substation | null;
}

interface HistoryEntry {
  id: string;
  from_stage: string;
  to_stage: string;
  notes: string | null;
  created_at: string;
}

const scoreCards = [
  { key: 'grid_score', label: 'Grid', icon: Zap, color: '#3B82F6' },
  { key: 'land_score', label: 'Land', icon: MapPin, color: '#22C55E' },
  { key: 'risk_score', label: 'Risk', icon: Shield, color: '#EF4444' },
  { key: 'market_score', label: 'Market', icon: TrendingUp, color: '#F59E0B' },
  { key: 'connectivity_score', label: 'Connectivity', icon: Wifi, color: '#8A00FF' },
];

export function OverviewTab({ site, score, substation }: OverviewTabProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('pipeline_history')
      .select('id, from_stage, to_stage, notes, created_at')
      .eq('site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }: { data: HistoryEntry[] | null }) => setHistory((data || []) as HistoryEntry[]));
  }, [site.id, supabase]);

  return (
    <div className="space-y-4">
      {/* Score Section */}
      {score && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="glass-card p-4 flex flex-col items-center justify-center">
            <ScoreGauge score={score.composite_score} size={120} label="Composite" />
          </div>
          <div className="glass-card p-4">
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Score Breakdown</p>
            <ScoreBreakdown score={score} />
          </div>
        </div>
      )}

      {/* Radar Chart */}
      {score && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card p-4"
        >
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">Dimension Analysis</p>
          <ScoreRadarChart score={score} />
        </motion.div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="glass-card p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Location</p>
          <p className="text-xs text-text-primary mt-1">{site.state}{site.county ? `, ${site.county}` : ''}</p>
          <p className="text-[10px] font-mono text-text-muted mt-0.5">{site.lat?.toFixed(4)}, {site.lng?.toFixed(4)}</p>
          {site.acreage && <p className="text-[10px] text-text-secondary mt-0.5">{site.acreage} acres</p>}
        </div>

        <div className="glass-card p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Grid Connection</p>
          {substation ? (
            <>
              <p className="text-xs text-text-primary mt-1">{substation.name}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{substation.capacity_mw}MW / {substation.available_mw}MW avail</p>
              <p className="text-[10px] text-text-secondary">{substation.voltage_kv}kV · {substation.utility}</p>
            </>
          ) : (
            <p className="text-[10px] text-text-muted mt-1">No substation linked</p>
          )}
        </div>

        <div className="glass-card p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Target Capacity</p>
          <p className="text-xl font-display font-bold text-text-primary mt-1">{site.target_capacity || '—'}<span className="text-[10px] text-text-muted ml-1">MW</span></p>
        </div>

        {score && scoreCards.map((sc) => {
          const value = score[sc.key as keyof SiteScore] as number;
          return (
            <div key={sc.key} className="glass-card p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <sc.icon size={11} style={{ color: sc.color }} />
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{sc.label}</p>
              </div>
              <p className="text-lg font-display font-bold" style={{ color: sc.color }}>{value}</p>
              <div className="mt-1.5 h-1 rounded-full bg-bg-elevated overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: sc.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      {history.length > 0 && (
        <div className="glass-card p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Pipeline Timeline</p>
          <div className="space-y-1.5">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-2 text-[10px]">
                <span className="text-text-muted w-24 shrink-0">{formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</span>
                <span className="font-mono text-text-secondary">{h.from_stage}</span>
                <span className="text-text-muted">→</span>
                <span className="font-mono text-accent">{h.to_stage}</span>
                {h.notes && <span className="text-text-muted truncate">· {h.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {site.notes && (
        <div className="glass-card p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Notes</p>
          <p className="text-xs text-text-secondary whitespace-pre-wrap">{site.notes}</p>
        </div>
      )}
    </div>
  );
}
