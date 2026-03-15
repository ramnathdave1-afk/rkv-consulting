'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: string;
  index?: number;
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, color = '#00D4AA', index = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="glass-card p-4 hover:border-border-hover transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</p>
          <p className="mt-1 text-2xl font-display font-bold text-text-primary">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
          {trend && (
            <p className={cn('mt-1 text-xs font-medium', trend.value >= 0 ? 'text-success' : 'text-danger')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}
