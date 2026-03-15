'use client';

import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LayerVisibility {
  substations: boolean;
  gridLines: boolean;
  fiberRoutes: boolean;
  wetlands: boolean;
  floodplains: boolean;
}

interface LayerControlProps {
  layers: LayerVisibility;
  onChange: (layers: LayerVisibility) => void;
}

const layerItems: { key: keyof LayerVisibility; label: string; color: string }[] = [
  { key: 'substations', label: 'Substations', color: '#3B82F6' },
  { key: 'gridLines', label: 'Grid Lines', color: '#F59E0B' },
  { key: 'fiberRoutes', label: 'Fiber Routes', color: '#8A00FF' },
  { key: 'wetlands', label: 'Wetlands', color: '#22C55E' },
  { key: 'floodplains', label: 'Floodplains', color: '#06B6D4' },
];

export function LayerControl({ layers, onChange }: LayerControlProps) {
  const [collapsed, setCollapsed] = useState(false);
  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className="absolute top-3 right-3 z-10">
      <div className="glass-card overflow-hidden" style={{ minWidth: collapsed ? 'auto' : 160 }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-left hover:bg-bg-elevated/30 transition-colors"
        >
          <Layers size={12} className="text-accent" />
          <span className="text-[10px] font-medium text-text-primary flex-1">Layers</span>
          {activeCount > 0 && (
            <span className="text-[9px] font-mono text-accent">{activeCount}</span>
          )}
          {collapsed ? <ChevronRight size={10} className="text-text-muted" /> : <ChevronDown size={10} className="text-text-muted" />}
        </button>

        {!collapsed && (
          <div className="border-t border-border px-2 py-1.5 space-y-0.5">
            {layerItems.map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-bg-elevated/20 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={layers[item.key]}
                  onChange={() => onChange({ ...layers, [item.key]: !layers[item.key] })}
                  className="accent-accent h-2.5 w-2.5"
                />
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className={cn('text-[10px]', layers[item.key] ? 'text-text-primary' : 'text-text-muted')}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
