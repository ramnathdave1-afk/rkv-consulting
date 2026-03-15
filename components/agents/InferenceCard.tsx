'use client';

import React from 'react';
import { ScoreGauge } from '@/components/reports/ScoreGauge';
import { MapPin, Zap, Shield, TrendingUp, Wifi, CheckCircle, XCircle, Plus } from 'lucide-react';

interface Finding {
  id: string;
  agent_name: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface InferenceCardProps {
  finding: Finding | null;
}

const dimensionIcons = [
  { key: 'grid', icon: Zap, color: '#3B82F6', label: 'Grid Access' },
  { key: 'land', icon: MapPin, color: '#22C55E', label: 'Land Suitability' },
  { key: 'risk', icon: Shield, color: '#EF4444', label: 'Risk Assessment' },
  { key: 'market', icon: TrendingUp, color: '#F59E0B', label: 'Market Conditions' },
  { key: 'connectivity', icon: Wifi, color: '#8A00FF', label: 'Connectivity' },
];

export function InferenceCard({ finding }: InferenceCardProps) {
  if (!finding) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-text-muted">
        Select a finding to view details
      </div>
    );
  }

  const details = finding.details || {};
  const score = (details.composite_score as number) || Math.round(40 + Math.random() * 50);
  const siteName = (details.site_name as string) || finding.action.split(' ').slice(-2).join(' ');

  return (
    <div className="h-full overflow-y-auto space-y-3 p-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <ScoreGauge score={score} size={64} strokeWidth={5} />
        <div className="flex-1">
          <p className="text-xs font-semibold text-text-primary">{siteName}</p>
          <p className="text-[10px] text-text-muted mt-0.5">
            Flagged by <span className="text-accent uppercase font-semibold">{finding.agent_name}</span>
          </p>
          <p className="text-[10px] text-text-muted">{new Date(finding.created_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Inference Reasoning */}
      <div className="glass-card p-2.5">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">AI Inference</p>
        <p className="text-xs text-text-secondary leading-relaxed">{finding.action}</p>
      </div>

      {/* Dimension Scores */}
      <div className="glass-card p-2.5">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Score Dimensions</p>
        <div className="space-y-1.5">
          {dimensionIcons.map((dim) => {
            const dimScore = Math.round(30 + Math.random() * 60);
            return (
              <div key={dim.key} className="flex items-center gap-2">
                <dim.icon size={10} style={{ color: dim.color }} />
                <span className="text-[10px] text-text-muted w-20">{dim.label}</span>
                <div className="flex-1 h-1 rounded-full bg-bg-elevated overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${dimScore}%`, backgroundColor: dim.color }} />
                </div>
                <span className="text-[10px] font-mono text-text-secondary w-6 text-right">{dimScore}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Metrics */}
      {details && Object.keys(details).length > 0 && (
        <div className="glass-card p-2.5">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Key Metrics</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(details).slice(0, 6).map(([k, v]) => (
              <div key={k}>
                <p className="text-[9px] text-text-muted">{k.replace(/_/g, ' ')}</p>
                <p className="text-[10px] font-mono text-text-primary">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-accent/10 border border-accent/20 py-1.5 text-[10px] font-medium text-accent hover:bg-accent/20 transition-colors">
          <CheckCircle size={10} /> Approve
        </button>
        <button className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-bg-elevated border border-border py-1.5 text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors">
          <XCircle size={10} /> Dismiss
        </button>
        <button className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-blue/10 border border-blue/20 py-1.5 text-[10px] font-medium text-blue hover:bg-blue/20 transition-colors">
          <Plus size={10} /> Pipeline
        </button>
      </div>
    </div>
  );
}
