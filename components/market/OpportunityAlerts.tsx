'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  TrendingDown,
  Home,
  Percent,
  BarChart3,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AlertType = 'price_drop' | 'new_listing' | 'rate_change' | 'market_shift';
type ImpactLevel = 'high' | 'medium' | 'low';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  market: string;
  impact: ImpactLevel;
  timestamp: string;
  actionUrl?: string;
}

interface OpportunityAlertsProps {
  alerts: Alert[];
}

/* ------------------------------------------------------------------ */
/*  Config maps                                                        */
/* ------------------------------------------------------------------ */

const typeConfig: Record<AlertType, { icon: LucideIcon; label: string; bg: string; text: string }> = {
  price_drop:   { icon: TrendingDown, label: 'Price Drops',    bg: 'bg-red/10',       text: 'text-red' },
  new_listing:  { icon: Home,         label: 'New Listings',   bg: 'bg-green/10',     text: 'text-green' },
  rate_change:  { icon: Percent,      label: 'Rate Changes',   bg: 'bg-gold/10',      text: 'text-gold' },
  market_shift: { icon: BarChart3,    label: 'Market Shifts',  bg: 'bg-[#0EA5E9]/10', text: 'text-[#0EA5E9]' },
};

const impactConfig: Record<ImpactLevel, { variant: 'danger' | 'default' | 'success'; label: string }> = {
  high:   { variant: 'danger',  label: 'High Impact' },
  medium: { variant: 'default', label: 'Medium' },
  low:    { variant: 'success', label: 'Low' },
};

type FilterKey = 'all' | AlertType;

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'price_drop',   label: 'Price Drops' },
  { key: 'new_listing',  label: 'New Listings' },
  { key: 'rate_change',  label: 'Rate Changes' },
  { key: 'market_shift', label: 'Market Shifts' },
];

/* ------------------------------------------------------------------ */
/*  AlertCard                                                          */
/* ------------------------------------------------------------------ */

function AlertCard({ alert }: { alert: Alert }) {
  const type = typeConfig[alert.type];
  const impact = impactConfig[alert.impact];
  const Icon = type.icon;

  const relativeTime = formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true });

  // Severity-based left border color
  const leftBorderColor = alert.impact === 'high' ? '#DC2626' : alert.impact === 'medium' ? '#F59E0B' : '#059669';

  return (
    <Card variant="default" padding="md" className="hover:border-gold/20 transition-all duration-200" style={{ borderLeft: `2px solid ${leftBorderColor}` }}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', type.bg)}>
          <Icon className={cn('h-5 w-5', type.text)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h4 className="text-sm font-semibold text-white leading-snug font-display">{alert.title}</h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={impact.variant} size="sm">
                {impact.label}
              </Badge>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed mb-3">{alert.description}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="info" size="sm">
                {alert.market}
              </Badge>
              <span className="flex items-center gap-1 text-[11px] text-muted-deep font-mono">
                <Clock className="h-3 w-3" />
                {relativeTime}
              </span>
            </div>

            {alert.actionUrl && (
              <a
                href={alert.actionUrl}
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium text-gold font-body uppercase tracking-wider',
                  'border border-gold/30 rounded-md px-3 py-1 hover:bg-gold/10 transition-colors duration-150',
                )}
              >
                View Details
                <ArrowRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ filter }: { filter: FilterKey }) {
  const label = filter === 'all' ? 'alerts' : typeConfig[filter].label.toLowerCase();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-border/50 mb-4" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
        <Bell className="h-7 w-7 text-muted" />
      </div>
      <p className="text-sm font-medium text-white font-display mb-1">No {label}</p>
      <p className="text-xs text-muted-deep max-w-xs">
        New opportunity alerts will appear here as market conditions change.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  OpportunityAlerts                                                  */
/* ------------------------------------------------------------------ */

export default function OpportunityAlerts({ alerts }: OpportunityAlertsProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    const sorted = [...alerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    if (activeFilter === 'all') return sorted;
    return sorted.filter((a) => a.type === activeFilter);
  }, [alerts, activeFilter]);

  // Count per type for tab badges
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: alerts.length };
    for (const a of alerts) {
      map[a.type] = (map[a.type] || 0) + 1;
    }
    return map;
  }, [alerts]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="label text-gold">OPPORTUNITY ALERTS //</h2>
          {alerts.length > 0 && (
            <Badge variant="default" dot size="sm">
              {alerts.length} active
            </Badge>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = counts[tab.key] || 0;

          return (
            <Button
              key={tab.key}
              variant={isActive ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'flex-shrink-0',
                !isActive && 'text-muted hover:text-white',
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0 text-[10px] font-bold',
                    isActive
                      ? 'bg-black/20 text-black'
                      : 'bg-border text-muted',
                  )}
                >
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
