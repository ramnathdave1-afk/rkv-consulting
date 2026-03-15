'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#00D4AA';
  if (score >= 60) return '#22C55E';
  if (score >= 40) return '#F59E0B';
  if (score >= 20) return '#EF4444';
  return '#8B95A5';
}

export function ScoreGauge({ score, size = 120, strokeWidth = 8, className, label }: ScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(139, 149, 165, 0.15)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-display font-bold"
          style={{ color, fontSize: size * 0.28 }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {score}
        </motion.span>
        {label && (
          <span className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{label}</span>
        )}
      </div>
    </div>
  );
}
