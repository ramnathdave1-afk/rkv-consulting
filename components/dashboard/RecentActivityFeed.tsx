'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Bot, User, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  agent_name: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity size={16} className="text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Recent Activity</h3>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {activities.length === 0 && (
          <p className="text-xs text-text-muted py-4 text-center">No recent activity</p>
        )}
        {activities.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-bg-primary/50 transition-colors"
          >
            {item.agent_name ? (
              <Bot size={14} className="text-accent mt-0.5 shrink-0" />
            ) : (
              <User size={14} className="text-blue mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-primary truncate">{item.action}</p>
              <p className="text-[10px] text-text-muted">
                {item.agent_name ? `Agent ${item.agent_name}` : 'User'} ·{' '}
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
