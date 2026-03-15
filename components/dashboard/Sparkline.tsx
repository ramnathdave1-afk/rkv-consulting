'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#00D4AA',
  showGradient = true,
  className = '',
}: SparklineProps) {
  const gradientId = useMemo(() => `sparkline-${Math.random().toString(36).slice(2, 8)}`, []);

  const path = useMemo(() => {
    if (data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    const usableH = height - padding * 2;
    const stepX = width / (data.length - 1);

    const points = data.map((v, i) => ({
      x: i * stepX,
      y: padding + usableH - ((v - min) / range) * usableH,
    }));

    // Smooth bezier path
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return d;
  }, [data, width, height]);

  const areaPath = useMemo(() => {
    if (!path) return '';
    const stepX = width / (data.length - 1);
    return `${path} L ${(data.length - 1) * stepX} ${height} L 0 ${height} Z`;
  }, [path, data.length, width, height]);

  if (data.length < 2) return null;

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showGradient && (
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      )}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.svg>
  );
}
