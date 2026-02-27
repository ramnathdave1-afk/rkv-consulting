'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { AnalyzerSensitivityResult } from '@/types';

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

const GOLD = '#C9A84C';
const GOLD_LIGHT = '#E8C97A';
const CARD_BG = '#111620';
const BORDER = '#1E2530';
const GREEN = '#22C55E';
const MUTED = '#6B7280';
const GRID = '#1E2530';

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  payload: Record<string, unknown>;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: '10px 14px',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 12,
      }}
    >
      <p style={{ color: '#F0EDE8', fontWeight: 600, marginBottom: 6, fontFamily: 'Syne, sans-serif', fontSize: 11 }}>
        {label}
      </p>
      {payload.map((entry, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 2,
          }}
        >
          <span style={{ color: entry.color, fontSize: 11 }}>{entry.name}</span>
          <span style={{ color: '#F0EDE8', fontVariantNumeric: 'tabular-nums' }}>
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface SensitivityRadarProps {
  data: AnalyzerSensitivityResult[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SensitivityRadar({ data }: SensitivityRadarProps) {
  // Find the base case for normalization
  const baseCase = data.find((d) => d.scenario === 'Base Case');
  if (!baseCase) return null;

  // Filter to scenario variations (exclude base case from radar points)
  const scenarios = data.filter((d) => d.scenario !== 'Base Case');

  // Normalize values to 0-100 scale for radar display
  const chartData = scenarios.map((s) => ({
    scenario: s.scenario,
    cashFlow: Math.max(0, Math.min(100, ((s.monthlyCashFlow + 500) / 1500) * 100)),
    cashOnCash: Math.max(0, Math.min(100, ((s.cashOnCash + 5) / 20) * 100)),
    dscr: Math.max(0, Math.min(100, (s.dscr / 2.5) * 100)),
    dealScore: s.dealScore,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={340}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke={GRID} strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="scenario"
            stroke={MUTED}
            fontSize={9}
            fontFamily="DM Sans"
            tick={{ fill: '#9CA3AF', fontSize: 9 }}
          />
          <PolarRadiusAxis
            stroke={GRID}
            fontSize={9}
            fontFamily="DM Sans"
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
              fontSize: 11,
              fontFamily: 'DM Sans, sans-serif',
              color: '#9CA3AF',
              paddingTop: 12,
            }}
          />
          <Radar
            name="Deal Score"
            dataKey="dealScore"
            stroke={GOLD}
            strokeWidth={2}
            fill={GOLD}
            fillOpacity={0.2}
            animationDuration={1000}
          />
          <Radar
            name="Cash on Cash"
            dataKey="cashOnCash"
            stroke={GREEN}
            strokeWidth={1.5}
            fill={GREEN}
            fillOpacity={0.08}
            animationDuration={1000}
          />
          <Radar
            name="DSCR"
            dataKey="dscr"
            stroke={GOLD_LIGHT}
            strokeWidth={1}
            strokeDasharray="4 3"
            fill={GOLD_LIGHT}
            fillOpacity={0.05}
            animationDuration={1000}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
