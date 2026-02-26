'use client';

import { useMemo } from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
}

/**
 * Attempt smooth cubic bezier interpolation between sparkline data points.
 * Falls back to a simple polyline string when fewer than 3 points are supplied.
 */
function buildSmoothPath(
  points: { x: number; y: number }[],
): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    // Catmull-Rom to cubic bezier conversion (tension = 0.5)
    const tension = 0.5;
    const cp1x = p1.x + (p2.x - p0.x) / (6 / tension);
    const cp1y = p1.y + (p2.y - p0.y) / (6 / tension);
    const cp2x = p2.x - (p3.x - p1.x) / (6 / tension);
    const cp2y = p2.y - (p3.y - p1.y) / (6 / tension);

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

export default function SparklineChart({
  data,
  width = 120,
  height = 40,
  color = '#C9A84C',
  showArea = false,
}: SparklineChartProps) {
  const gradientId = useMemo(
    () => `sparkline-gradient-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );

  const { linePath, areaPath } = useMemo(() => {
    if (!data || data.length < 2) return { linePath: '', areaPath: '' };

    const padding = 2;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => ({
      x: padding + (index / (data.length - 1)) * drawWidth,
      y: padding + drawHeight - ((value - min) / range) * drawHeight,
    }));

    const line = buildSmoothPath(points);

    // Close the path along the bottom to create a filled area
    const area = line
      ? `${line} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`
      : '';

    return { linePath: line, areaPath: area };
  }, [data, width, height]);

  if (!data || data.length < 2) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {showArea && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
          />
        </>
      )}
      <path
        d={linePath}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
