'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface TickerItem {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
}

interface TickerBarProps {
  items: TickerItem[];
}

const trendIcon = {
  up: <TrendingUp size={9} className="text-success" />,
  down: <TrendingDown size={9} className="text-danger" />,
  flat: <Minus size={9} className="text-text-muted" />,
};

export function TickerBar({ items }: TickerBarProps) {
  if (items.length === 0) return null;

  const renderItems = (key: string) =>
    items.map((item, i) => (
      <span key={`${key}-${i}`} className="inline-flex items-center gap-1.5 shrink-0">
        <span className="text-text-muted">{item.label}:</span>
        <span className="text-text-primary font-semibold">{item.value}</span>
        {item.unit && <span className="text-text-muted">{item.unit}</span>}
        {item.trend && trendIcon[item.trend]}
        {i < items.length - 1 && (
          <span className="text-text-muted/40 mx-2">&middot;</span>
        )}
      </span>
    ));

  return (
    <div className="h-8 bg-bg-secondary border-b border-border overflow-hidden flex items-center shrink-0">
      <div className="ticker-track flex items-center whitespace-nowrap font-mono text-[10px] gap-0">
        <div className="flex items-center px-4">{renderItems('a')}</div>
        <div className="flex items-center px-4">{renderItems('b')}</div>
      </div>
    </div>
  );
}
