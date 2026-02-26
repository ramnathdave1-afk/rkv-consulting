'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  DollarSign,
  Wrench,
  Bot,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Activity {
  id: string;
  type: 'payment' | 'maintenance' | 'agent' | 'document';
  description: string;
  property?: string;
  timestamp: string | Date;
  icon?: LucideIcon;
}

interface ActivityFeedProps {
  activities: Activity[];
  maxHeight?: string;
  onViewAll?: () => void;
}

const typeConfig: Record<
  Activity['type'],
  { icon: LucideIcon; bg: string; text: string }
> = {
  payment: {
    icon: DollarSign,
    bg: 'bg-green/10',
    text: 'text-green',
  },
  maintenance: {
    icon: Wrench,
    bg: 'bg-gold/10',
    text: 'text-gold',
  },
  agent: {
    icon: Bot,
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
  },
  document: {
    icon: FileText,
    bg: 'bg-muted/10',
    text: 'text-muted',
  },
};

function RelativeTime({ timestamp }: { timestamp: string | Date }) {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return (
    <time
      dateTime={date.toISOString()}
      className="text-xs text-muted whitespace-nowrap"
    >
      {formatDistanceToNow(date, { addSuffix: true })}
    </time>
  );
}

export default function ActivityFeed({
  activities,
  maxHeight = '400px',
  onViewAll,
}: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">
          Recent Activity
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-border/50 mb-3">
            <FileText className="h-6 w-6 text-muted" />
          </div>
          <p className="text-sm text-muted">No recent activity</p>
          <p className="text-xs text-muted/60 mt-1">
            Activity from your properties will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-white mb-4">
        Recent Activity
      </h3>

      <div
        className="overflow-y-auto pr-1 -mr-1 space-y-1"
        style={{ maxHeight }}
      >
        {activities.map((activity, index) => {
          const config = typeConfig[activity.type];
          const IconComponent = activity.icon || config.icon;

          return (
            <div
              key={activity.id}
              className={cn(
                'flex items-start gap-3 rounded-lg px-3 py-3',
                'transition-colors duration-150',
                'hover:bg-border/20',
              )}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* Icon circle */}
              <div
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                  config.bg,
                )}
              >
                <IconComponent className={cn('h-4 w-4', config.text)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-snug">
                  {activity.description}
                </p>
                {activity.property && (
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {activity.property}
                  </p>
                )}
              </div>

              {/* Timestamp */}
              <RelativeTime timestamp={activity.timestamp} />
            </div>
          );
        })}
      </div>

      {/* View All link */}
      {onViewAll && (
        <div className="mt-4 pt-3 border-t border-border">
          <button
            onClick={onViewAll}
            className={cn(
              'w-full text-center text-sm font-medium text-gold',
              'hover:text-gold-light transition-colors duration-150',
              'cursor-pointer',
            )}
          >
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
}
