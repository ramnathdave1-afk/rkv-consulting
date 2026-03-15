'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  format?: 'number' | 'currency' | 'percentage' | 'compact';
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

function formatValue(value: number, format: string, decimals: number): string {
  switch (format) {
    case 'currency':
      return value >= 1_000_000
        ? `$${(value / 1_000_000).toFixed(1)}M`
        : value >= 1_000
          ? `$${(value / 1_000).toFixed(0)}K`
          : `$${value.toFixed(decimals)}`;
    case 'percentage':
      return `${value.toFixed(decimals)}%`;
    case 'compact':
      return value >= 1_000_000
        ? `${(value / 1_000_000).toFixed(1)}M`
        : value >= 1_000
          ? `${(value / 1_000).toFixed(1)}K`
          : value.toFixed(decimals);
    default:
      return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
  }
}

export function AnimatedNumber({
  value,
  format = 'number',
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  duration = 1,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevValue = useRef(value);
  const motionValue = useMotionValue(0);

  useEffect(() => {
    if (value !== prevValue.current) {
      setFlash(value > prevValue.current ? 'up' : 'down');
      setTimeout(() => setFlash(null), 600);
    }
    prevValue.current = value;

    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplayValue(v),
    });

    return controls.stop;
  }, [value, duration, motionValue]);

  return (
    <motion.span
      className={`tabular-nums ${className}`}
      animate={
        flash === 'up'
          ? { color: ['#00D4AA', 'inherit'] }
          : flash === 'down'
            ? { color: ['#EF4444', 'inherit'] }
            : {}
      }
      transition={{ duration: 0.6 }}
    >
      {prefix}{formatValue(displayValue, format, decimals)}{suffix}
    </motion.span>
  );
}
