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
  { icon: LucideIcon; color: string }
> = {
  payment: { icon: DollarSign, color: 'text-green' },
  maintenance: { icon: Wrench, color: 'text-gold' },
  agent: { icon: Bot, color: 'text-violet' },
  document: { icon: FileText, color: 'text-muted' },
};

function RelativeTime({ timestamp }: { timestamp: string | Date }) {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return (
    <time dateTime={date.toISOString()} className="font-mono text-[10px] text-muted-deep whitespace-nowrap">
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
      <div className="rounded-lg p-5" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
        <h3 className="label text-gold mb-4">Activity Log</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="font-body text-[11px] text-muted-deep">No activity recorded</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-5" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
      <h3 className="label text-gold mb-4">Activity Log</h3>

      <div className="overflow-y-auto pr-1 -mr-1 space-y-px" style={{ maxHeight }}>
        {activities.map((activity, index) => {
          const config = typeConfig[activity.type];
          const IconComponent = activity.icon || config.icon;

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded px-2 py-2.5 hover:bg-white/[0.02] transition-colors animate-stagger-fade"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Vertical line connector */}
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <IconComponent className={cn('h-3.5 w-3.5', config.color)} strokeWidth={1.5} />
                {index < activities.length - 1 && (
                  <div className="w-px flex-1 bg-border/30 min-h-[16px]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white leading-snug">{activity.description}</p>
                {activity.property && (
                  <p className="font-body text-[10px] text-muted-deep mt-0.5 truncate">{activity.property}</p>
                )}
              </div>

              <RelativeTime timestamp={activity.timestamp} />
            </div>
          );
        })}
      </div>

      {onViewAll && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <button
            onClick={onViewAll}
            className="w-full text-center font-body text-[11px] text-gold hover:text-gold-light transition-colors cursor-pointer"
          >
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
}
