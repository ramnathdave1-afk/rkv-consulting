'use client';

import React from 'react';
import type { SiteMapData } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

interface DigitalTwinPopupProps {
  site: SiteMapData;
  onViewReport: () => void;
}

export function DigitalTwinPopup({ site, onViewReport }: DigitalTwinPopupProps) {
  return (
    <div className="bg-bg-secondary/95 backdrop-blur-md rounded-lg border border-border p-3 w-[280px]">
      {/* SVG Wireframe */}
      <div className="flex justify-center mb-2">
        <svg width="200" height="120" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Base platform */}
          <path
            d="M30 90 L100 60 L170 90 L100 120 Z"
            stroke="#00D4AA"
            strokeWidth="1"
            fill="none"
            strokeDasharray="400"
            strokeDashoffset="400"
            style={{ animation: 'draw-line 1.5s ease forwards' }}
          />
          {/* Front wall */}
          <path
            d="M30 90 L30 50 L100 20 L100 60 Z"
            stroke="#00D4AA"
            strokeWidth="1"
            fill="rgba(0,212,170,0.03)"
            strokeDasharray="400"
            strokeDashoffset="400"
            style={{ animation: 'draw-line 1.5s ease 0.3s forwards' }}
          />
          {/* Side wall */}
          <path
            d="M100 60 L100 20 L170 50 L170 90 Z"
            stroke="#00D4AA"
            strokeWidth="0.8"
            fill="rgba(0,212,170,0.02)"
            strokeDasharray="400"
            strokeDashoffset="400"
            style={{ animation: 'draw-line 1.5s ease 0.5s forwards' }}
          />
          {/* Roof */}
          <path
            d="M30 50 L100 20 L170 50"
            stroke="#00D4AA"
            strokeWidth="1.2"
            fill="none"
            strokeDasharray="200"
            strokeDashoffset="200"
            style={{ animation: 'draw-line 1s ease 0.8s forwards' }}
          />
          {/* Grid lines on front wall */}
          <line x1="50" y1="82" x2="50" y2="42" stroke="#00D4AA" strokeWidth="0.3" opacity="0.5" />
          <line x1="70" y1="74" x2="70" y2="34" stroke="#00D4AA" strokeWidth="0.3" opacity="0.5" />
          <line x1="40" y1="60" x2="100" y2="40" stroke="#00D4AA" strokeWidth="0.3" opacity="0.5" />
          <line x1="40" y1="75" x2="100" y2="50" stroke="#00D4AA" strokeWidth="0.3" opacity="0.5" />
          {/* Grid lines on side wall */}
          <line x1="120" y1="76" x2="120" y2="42" stroke="#00D4AA" strokeWidth="0.3" opacity="0.4" />
          <line x1="145" y1="84" x2="145" y2="48" stroke="#00D4AA" strokeWidth="0.3" opacity="0.4" />
          {/* Power symbol on front */}
          <circle cx="65" cy="62" r="6" stroke="#3B82F6" strokeWidth="0.8" fill="none" opacity="0.6" />
          <path d="M63 60 L66 58 L64 62 L67 60 L64 64" stroke="#3B82F6" strokeWidth="0.8" fill="none" opacity="0.6" />
        </svg>
      </div>

      {/* Site name */}
      <div className="text-center mb-2">
        <h3 className="text-[11px] font-semibold text-text-primary truncate">{site.name}</h3>
        <p className="text-[9px] text-text-muted font-mono">
          {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <MetricCell label="Target" value={site.target_capacity ? `${site.target_capacity} MW` : '—'} />
        <MetricCell label="Acreage" value={site.acreage ? `${site.acreage} ac` : '—'} />
        <MetricCell label="Score" value={site.composite_score ? `${site.composite_score.toFixed(0)}/100` : '—'} highlight />
        <MetricCell label="Substation" value={site.distance_to_substation_mi ? `${site.distance_to_substation_mi.toFixed(1)} mi` : '—'} />
      </div>

      {/* View Report button */}
      <button
        onClick={onViewReport}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent text-[10px] font-medium transition-colors"
      >
        <ExternalLink size={10} />
        Full Report
      </button>
    </div>
  );
}

function MetricCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-bg-primary/50 rounded px-2 py-1">
      <div className="text-[8px] text-text-muted uppercase tracking-wider">{label}</div>
      <div className={`text-[11px] font-mono font-medium ${highlight ? 'text-accent' : 'text-text-primary'}`}>
        {value}
      </div>
    </div>
  );
}
