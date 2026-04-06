'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { HoverIcon } from '@/components/ui/HoverIcon';
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

/* ── Premium count-up with easeOutQuart ── */
function useCountUp(target: number, duration = 1800) {
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

/* ── Premium Sparkline with gradient fill ── */
function PremiumSparkline({ data, color, w = 88, h = 36 }: { data: number[]; color: string; w?: number; h?: number }) {
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
    <svg width={w} height={h} style={{ overflow: 'visible', opacity: 0.9 }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d + ` L ${w} ${h} L 0 ${h} Z`} fill={`url(#${gradientId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill={color} />
    </svg>
  );
}

/* ── Stagger variants ── */
const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.07,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

export function KPICard({
  title,
  value,
  numericValue,
  subtitle,
  icon: Icon,
  trend,
  color = '#00bfa6',
  index = 0,
  sparklineData,
  format,
  prefix,
  suffix,
}: KPICardProps) {
  const useAnimated = numericValue !== undefined;
  const animatedValue = useCountUp(useAnimated ? numericValue : 0, 1800);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="glass-card-premium"
      style={{ padding: 24, willChange: 'transform' }}
    >
      {/* Glow line at top */}
      <div
        className="glow-line"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}${hovered ? '80' : '40'}, transparent)`,
        }}
      />

      {/* Top row: HoverIcon + trend badge */}
      <div className="flex items-start justify-between mb-[18px]">
        <HoverIcon
          icon={Icon}
          size={21}
          color={color}
          bgSize={46}
          bgRadius={13}
          bgColor={`${color}12`}
          borderColor={`${color}18`}
          glowColor={color}
        />
        {trend && (
          <div
            className="flex items-center gap-1 badge"
            style={{
              backgroundColor: trend.value >= 0 ? 'var(--success-muted)' : 'var(--danger-muted)',
              color: trend.value >= 0 ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {trend.value >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      {/* Value + sparkline row */}
      <div className="flex items-end justify-between">
        <div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.03em',
            }}
          >
            {useAnimated
              ? formatValue(animatedValue, format, prefix, suffix)
              : value}
          </div>
          <div
            className="mt-1.5"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-tertiary)',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              className="mt-1"
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <PremiumSparkline data={sparklineData} color={color} />
        )}
      </div>
    </motion.div>
  );
}
