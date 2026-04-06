'use client';

import React from 'react';
import { useCountUp } from '@/lib/hooks/useCountUp';

interface RadialRingProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color: string;
  bgColor: string;
}

/**
 * Animated SVG radial progress ring.
 */
export function RadialRing({
  value,
  max = 100,
  size = 140,
  stroke = 10,
  color,
  bgColor,
}: RadialRingProps) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = useCountUp(Math.min(value / max, 1) * 100, 2200);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={bgColor}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ - (pct / 100) * circ}
        style={{
          transition: 'stroke-dashoffset 2.2s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </svg>
  );
}
