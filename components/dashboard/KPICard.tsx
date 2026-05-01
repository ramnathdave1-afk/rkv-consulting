'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  numericValue?: number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: string;
  index?: number;
  sparklineData?: number[];
  format?: 'number' | 'currency' | 'percentage' | 'compact';
  prefix?: string;
  suffix?: string;
}

/* ── Count-up animation with subtle highlight on update ── */
function useCountUp(target: number, duration = 1400) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const prevTarget = useRef(target);

  const animateTo = useCallback(
    (from: number, to: number, dur: number) => {
      startRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const step = (timestamp: number) => {
        if (startRef.current === null) startRef.current = timestamp;
        const elapsed = timestamp - startRef.current;
        const progress = Math.min(elapsed / dur, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setDisplay(from + (to - from) * eased);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setDisplay(to);
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  useEffect(() => {
    animateTo(prevTarget.current !== target ? prevTarget.current : 0, target, duration);
    prevTarget.current = target;
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, animateTo]);

  return display;
}

function formatValue(value: number, format?: string, prefix = '', suffix = ''): string {
  let formatted: string;
  switch (format) {
    case 'currency':
      formatted =
        value >= 1_000_000
          ? `$${(value / 1_000_000).toFixed(1)}M`
          : value >= 1_000
            ? `$${(value / 1_000).toFixed(0)}K`
            : `$${value.toFixed(0)}`;
      break;
    case 'percentage':
      formatted = `${value.toFixed(1)}%`;
      break;
    case 'compact':
      formatted =
        value >= 1_000_000
          ? `${(value / 1_000_000).toFixed(1)}M`
          : value >= 1_000
            ? `${(value / 1_000).toFixed(1)}K`
            : value.toFixed(0);
      break;
    default:
      formatted = Math.round(value).toLocaleString('en-US');
  }
  return `${prefix}${formatted}${suffix}`;
}

/* ── Subtle sparkline in sky tones ── */
function MiniSparkline({ data, w = 80, h = 28 }: { data: number[]; w?: number; h?: number }) {
  const gradientId = useMemo(() => `spark-${Math.random().toString(36).slice(2, 7)}`, []);

  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h * 0.75 - h * 0.12,
  }));

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx1 = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.35;
    const cx2 = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.35;
    d += ` C ${cx1} ${pts[i - 1].y} ${cx2} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0369A1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0369A1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d + ` L ${w} ${h} L 0 ${h} Z`} fill={`url(#${gradientId})`} />
      <path d={d} fill="none" stroke="#0369A1" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: i * 0.05,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

/**
 * Sales Intelligence Dashboard KPI card.
 * White surface, slate borders, sky-blue accent icon, tabular-nums numerics.
 */
export function KPICard({
  title,
  value,
  numericValue,
  subtitle,
  icon: Icon,
  trend,
  index = 0,
  sparklineData,
  format,
  prefix,
  suffix,
}: KPICardProps) {
  const useAnimated = numericValue !== undefined;
  const animatedValue = useCountUp(useAnimated ? numericValue : 0, 1400);
  const [pulse, setPulse] = useState(false);
  const prevValRef = useRef(numericValue);

  // Subtle status-change pulse on metric update
  useEffect(() => {
    if (numericValue !== undefined && prevValRef.current !== numericValue && prevValRef.current !== undefined) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
    prevValRef.current = numericValue;
  }, [numericValue]);

  const trendValue = trend?.value ?? 0;
  const trendUp = trendValue >= 0;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="p-5 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
      style={{ willChange: 'transform' }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
            {title}
          </p>
          <motion.p
            className="mt-2 font-display text-3xl font-bold tabular-nums text-[#020617]"
            animate={pulse ? { backgroundColor: ['rgba(3,105,161,0)', 'rgba(3,105,161,0.12)', 'rgba(3,105,161,0)'] } : {}}
            transition={{ duration: 0.6 }}
            style={{ borderRadius: 4, padding: pulse ? '0 4px' : 0, marginLeft: pulse ? -4 : 0 }}
          >
            {useAnimated
              ? formatValue(animatedValue, format, prefix, suffix)
              : value}
          </motion.p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sparklineData && sparklineData.length > 1 && (
            <MiniSparkline data={sparklineData} />
          )}
          <div className="p-2 rounded-md bg-sky-50 text-[#0369A1]">
            <Icon size={20} />
          </div>
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trendUp ? (
            <TrendingUp size={14} className="text-emerald-600" />
          ) : (
            <TrendingDown size={14} className="text-red-600" />
          )}
          <span className={trendUp ? 'text-emerald-600 font-semibold tabular-nums' : 'text-red-600 font-semibold tabular-nums'}>
            {Math.abs(trendValue)}%
          </span>
          <span className="text-slate-500">{trend.label || 'vs last period'}</span>
        </div>
      )}
    </motion.div>
  );
}
