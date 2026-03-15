'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ScoreGauge } from '@/components/reports/ScoreGauge';
import { Badge } from '@/components/ui/Badge';
import { PIPELINE_STAGES, SCORE_DIMENSIONS } from '@/lib/constants';
import type { SiteRow } from './SiteDataTable';

interface ComparisonPanelProps {
  sites: SiteRow[];
  onClose: () => void;
}

export function ComparisonPanel({ sites, onClose }: ComparisonPanelProps) {
  if (sites.length < 2) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
            Comparing {sites.length} Sites
          </span>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary">
            <X size={12} />
          </button>
        </div>

        <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${sites.length}, 1fr)` }}>
          {sites.map((site) => {
            const stage = PIPELINE_STAGES.find((s) => s.value === site.pipeline_stage);
            return (
              <div key={site.id} className="p-3 border-r border-border/30 last:border-r-0 space-y-3">
                {/* Header */}
                <div>
                  <p className="text-xs font-semibold text-text-primary truncate">{site.name}</p>
                  <p className="text-[10px] text-text-muted">{site.state}{site.county ? `, ${site.county}` : ''}</p>
                  {stage && <Badge color={stage.color} size="sm" className="mt-1">{stage.label}</Badge>}
                </div>

                {/* Score */}
                <div className="flex justify-center">
                  <ScoreGauge score={site.composite_score ?? 0} size={80} strokeWidth={6} label="Score" />
                </div>

                {/* Metrics Grid */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-text-muted">Capacity</span>
                    <span className="font-mono text-text-primary">{site.target_mw ?? '—'} MW</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-text-muted">Acreage</span>
                    <span className="font-mono text-text-primary">{site.acreage ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-text-muted">Dist. to Sub</span>
                    <span className="font-mono text-text-primary">{site.distance_to_substation_mi?.toFixed(1) ?? '—'} mi</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-text-muted">Zoning</span>
                    <span className="text-text-primary">{site.zoning ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-text-muted">Risk Score</span>
                    <span className="font-mono text-text-primary">{site.risk_score ?? '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
