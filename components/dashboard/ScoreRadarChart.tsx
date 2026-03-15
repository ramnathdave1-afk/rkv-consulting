'use client';

import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { SiteScore } from '@/lib/types';

interface ScoreRadarChartProps {
  score: SiteScore;
  size?: number;
}

const dimensions = [
  { key: 'grid_score', label: 'Grid', color: '#3B82F6' },
  { key: 'land_score', label: 'Land', color: '#22C55E' },
  { key: 'risk_score', label: 'Risk', color: '#EF4444' },
  { key: 'market_score', label: 'Market', color: '#F59E0B' },
  { key: 'connectivity_score', label: 'Connectivity', color: '#8A00FF' },
];

export function ScoreRadarChart({ score, size = 250 }: ScoreRadarChartProps) {
  const data = dimensions.map((dim) => ({
    dimension: dim.label,
    value: (score[dim.key as keyof SiteScore] as number) || 0,
    fullMark: 100,
  }));

  return (
    <div className="flex justify-center">
      <ResponsiveContainer width={size} height={size}>
        <RadarChart data={data}>
          <PolarGrid
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#6B7B8D', fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#4A5568', fontSize: 8 }}
            tickCount={5}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="#00D4AA"
            fill="#00D4AA"
            fillOpacity={0.15}
            strokeWidth={2}
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Tooltip
            contentStyle={{
              background: '#0C1017',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              fontSize: 11,
              color: '#F0F2F5',
            }}
            formatter={(value) => [`${value}/100`, 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
