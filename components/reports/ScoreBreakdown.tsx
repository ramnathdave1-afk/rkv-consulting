'use client';

import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { SCORE_DIMENSIONS } from '@/lib/constants';
import type { SiteScore } from '@/lib/types';

interface ScoreBreakdownProps {
  score: SiteScore;
}

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  const data = SCORE_DIMENSIONS.map((dim) => ({
    dimension: dim.label,
    value: score[dim.key as keyof SiteScore] as number,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="rgba(139, 149, 165, 0.15)" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#8B95A5', fontSize: 11, fontFamily: 'var(--font-body)' }}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="#00D4AA"
            fill="#00D4AA"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
