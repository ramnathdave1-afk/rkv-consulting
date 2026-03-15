'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Zap, Cable, Flame, Droplets, Waves, AlertTriangle, Network, Wifi, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PIPELINE_STAGES } from '@/lib/constants';
import type { LayerTreeVisibility } from '@/lib/types';
import type { MapFilterValues } from '@/components/map/MapFilters';

interface LayerNode {
  id: keyof LayerTreeVisibility;
  label: string;
  color: string;
  icon: React.ElementType;
}

interface LayerFolder {
  label: string;
  children: LayerNode[];
}

const layerFolders: LayerFolder[] = [
  {
    label: 'Infrastructure',
    children: [
      { id: 'substations', label: 'Substations', color: '#3B82F6', icon: Zap },
      { id: 'gridLines', label: 'Grid Lines', color: '#F59E0B', icon: Cable },
      { id: 'congestionHeatmap', label: 'Congestion Heatmap', color: '#EF4444', icon: Flame },
    ],
  },
  {
    label: 'Environmental',
    children: [
      { id: 'wetlands', label: 'Wetlands', color: '#22C55E', icon: Droplets },
      { id: 'floodplains', label: 'Floodplains', color: '#06B6D4', icon: Waves },
    ],
  },
  {
    label: 'Risk',
    children: [
      { id: 'floodZones', label: 'Flood Zones', color: '#EF4444', icon: AlertTriangle },
    ],
  },
  {
    label: 'Connectivity',
    children: [
      { id: 'fiberRoutes', label: 'Fiber Routes', color: '#8A00FF', icon: Network },
      { id: 'fiberHubs', label: 'Fiber Hubs', color: '#8A00FF', icon: Wifi },
    ],
  },
];

interface LayerTreeProps {
  layers: LayerTreeVisibility;
  onChange: (layers: LayerTreeVisibility) => void;
  filterValues: MapFilterValues;
  onFilterChange: (filters: MapFilterValues) => void;
}

export function LayerTree({ layers, onChange, filterValues, onFilterChange }: LayerTreeProps) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    Infrastructure: true,
    Environmental: true,
    Risk: false,
    Connectivity: false,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleFolder = (label: string) => {
    setOpenFolders((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const toggleLayer = (id: keyof LayerTreeVisibility) => {
    onChange({ ...layers, [id]: !layers[id] });
  };

  const activeCount = Object.values(layers).filter(Boolean).length;

  const hasFilters = filterValues.minCapacity || filterValues.maxCapacity || filterValues.minScore || filterValues.stages.length > 0 || filterValues.maxDistance;

  function updateFilter<K extends keyof MapFilterValues>(key: K, value: MapFilterValues[K]) {
    onFilterChange({ ...filterValues, [key]: value });
  }

  function toggleStage(stage: string) {
    const current = filterValues.stages;
    updateFilter('stages', current.includes(stage) ? current.filter((s) => s !== stage) : [...current, stage]);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-[10px] font-semibold text-text-primary uppercase tracking-wider">Layers</span>
        <span className="text-[9px] font-mono text-accent">{activeCount} active</span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {layerFolders.map((folder) => (
          <div key={folder.label}>
            <button
              onClick={() => toggleFolder(folder.label)}
              className="flex items-center gap-1.5 w-full px-1.5 py-1 rounded hover:bg-bg-elevated/30 transition-colors"
            >
              {openFolders[folder.label] ? (
                <ChevronDown size={10} className="text-text-muted" />
              ) : (
                <ChevronRight size={10} className="text-text-muted" />
              )}
              <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
                {folder.label}
              </span>
            </button>

            {openFolders[folder.label] && (
              <div className="ml-3 space-y-0">
                {folder.children.map((node) => {
                  const Icon = node.icon;
                  return (
                    <label
                      key={node.id}
                      className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-bg-elevated/20 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={layers[node.id]}
                        onChange={() => toggleLayer(node.id)}
                        className="accent-accent h-2.5 w-2.5"
                      />
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                      <span className={cn('text-[10px]', layers[node.id] ? 'text-text-primary' : 'text-text-muted')}>
                        <Icon size={10} className="inline mr-1" style={{ color: node.color }} />
                        {node.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filters section */}
      <div className="border-t border-border shrink-0">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-1.5 w-full px-3 py-2 hover:bg-bg-elevated/30 transition-colors"
        >
          <Filter size={10} className="text-accent" />
          <span className="text-[10px] font-semibold text-text-primary uppercase tracking-wider flex-1 text-left">Filters</span>
          {hasFilters && (
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-bg-primary">!</span>
          )}
          {filtersOpen ? <ChevronDown size={10} className="text-text-muted" /> : <ChevronRight size={10} className="text-text-muted" />}
        </button>

        {filtersOpen && (
          <div className="px-3 pb-3 space-y-2.5">
            {/* Capacity */}
            <div>
              <label className="text-[9px] font-medium uppercase tracking-wider text-text-muted">Capacity (MW)</label>
              <div className="mt-0.5 flex gap-1.5">
                <input
                  type="number"
                  placeholder="Min"
                  value={filterValues.minCapacity || ''}
                  onChange={(e) => updateFilter('minCapacity', e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded border border-border bg-bg-primary px-1.5 py-0.5 text-[10px] text-text-primary font-mono"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filterValues.maxCapacity || ''}
                  onChange={(e) => updateFilter('maxCapacity', e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded border border-border bg-bg-primary px-1.5 py-0.5 text-[10px] text-text-primary font-mono"
                />
              </div>
            </div>

            {/* Score */}
            <div>
              <label className="text-[9px] font-medium uppercase tracking-wider text-text-muted">Min Score</label>
              <input
                type="number"
                placeholder="0-100"
                min={0}
                max={100}
                value={filterValues.minScore || ''}
                onChange={(e) => updateFilter('minScore', e.target.value ? Number(e.target.value) : null)}
                className="mt-0.5 w-full rounded border border-border bg-bg-primary px-1.5 py-0.5 text-[10px] text-text-primary font-mono"
              />
            </div>

            {/* Distance */}
            <div>
              <label className="text-[9px] font-medium uppercase tracking-wider text-text-muted">Max Distance (mi)</label>
              <input
                type="number"
                placeholder="Miles"
                value={filterValues.maxDistance || ''}
                onChange={(e) => updateFilter('maxDistance', e.target.value ? Number(e.target.value) : null)}
                className="mt-0.5 w-full rounded border border-border bg-bg-primary px-1.5 py-0.5 text-[10px] text-text-primary font-mono"
              />
            </div>

            {/* Pipeline Stages */}
            <div>
              <label className="text-[9px] font-medium uppercase tracking-wider text-text-muted">Pipeline Stage</label>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {PIPELINE_STAGES.map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => toggleStage(stage.value)}
                    className={cn(
                      'rounded-full px-1.5 py-0 text-[9px] font-medium border transition-colors',
                      filterValues.stages.includes(stage.value)
                        ? 'border-current'
                        : 'border-border text-text-muted hover:text-text-secondary',
                    )}
                    style={
                      filterValues.stages.includes(stage.value)
                        ? { color: stage.color, borderColor: stage.color, backgroundColor: `${stage.color}15` }
                        : undefined
                    }
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={() => onFilterChange({ minCapacity: null, maxCapacity: null, minScore: null, stages: [], maxDistance: null })}
                className="flex items-center gap-1 text-[9px] text-text-muted hover:text-danger transition-colors"
              >
                <X size={8} /> Clear all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
