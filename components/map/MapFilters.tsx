'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { PIPELINE_STAGES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface MapFilterValues {
  minCapacity: number | null;
  maxCapacity: number | null;
  minScore: number | null;
  stages: string[];
  maxDistance: number | null;
}

interface MapFiltersProps {
  filters: MapFilterValues;
  onChange: (filters: MapFilterValues) => void;
}

export function MapFilters({ filters, onChange }: MapFiltersProps) {
  const [expanded, setExpanded] = useState(true);

  function updateFilter<K extends keyof MapFilterValues>(key: K, value: MapFilterValues[K]) {
    onChange({ ...filters, [key]: value });
  }

  function toggleStage(stage: string) {
    const current = filters.stages;
    updateFilter(
      'stages',
      current.includes(stage) ? current.filter((s) => s !== stage) : [...current, stage],
    );
  }

  function clearAll() {
    onChange({ minCapacity: null, maxCapacity: null, minScore: null, stages: [], maxDistance: null });
  }

  const hasFilters = filters.minCapacity || filters.maxCapacity || filters.minScore || filters.stages.length > 0 || filters.maxDistance;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute left-4 top-4 z-10 w-64 rounded-xl border border-border bg-bg-secondary/95 backdrop-blur-md shadow-lg"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-accent" />
          <span className="text-sm font-medium text-text-primary">Filters</span>
          {hasFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-bg-primary">
              !
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {/* Capacity */}
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Capacity (MW)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minCapacity || ''}
                onChange={(e) => updateFilter('minCapacity', e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxCapacity || ''}
                onChange={(e) => updateFilter('maxCapacity', e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary"
              />
            </div>
          </div>

          {/* Score */}
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Min Score
            </label>
            <input
              type="number"
              placeholder="0-100"
              min={0}
              max={100}
              value={filters.minScore || ''}
              onChange={(e) => updateFilter('minScore', e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary"
            />
          </div>

          {/* Distance */}
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Max Distance to Substation (mi)
            </label>
            <input
              type="number"
              placeholder="Miles"
              value={filters.maxDistance || ''}
              onChange={(e) => updateFilter('maxDistance', e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary"
            />
          </div>

          {/* Pipeline stages */}
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Pipeline Stage
            </label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {PIPELINE_STAGES.map((stage) => (
                <button
                  key={stage.value}
                  onClick={() => toggleStage(stage.value)}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors',
                    filters.stages.includes(stage.value)
                      ? 'border-current'
                      : 'border-border text-text-muted hover:text-text-secondary',
                  )}
                  style={filters.stages.includes(stage.value) ? { color: stage.color, borderColor: stage.color, backgroundColor: `${stage.color}15` } : undefined}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-[10px] text-text-muted hover:text-danger transition-colors"
            >
              <X size={10} /> Clear all
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
