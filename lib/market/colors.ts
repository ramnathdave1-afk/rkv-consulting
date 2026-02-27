// ============================================================================
// Market Heat Map — Color Scale Utilities
// Ported from /Users/daveramnath/az-heatmap/lib/colors.ts
// Provides choropleth coloring for all market metrics
// ============================================================================

import type { HeatMapMetricKey } from '@/types';
import { HEAT_MAP_METRIC_CONFIGS } from './data';

// Color interpolation
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): string {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r}, ${g}, ${b})`;
}

// Color scales — dark theme optimized
const scales = {
  // Low = cool blue → High = hot red/orange (for prices)
  price: [
    [30, 70, 130] as [number, number, number],
    [0, 150, 200] as [number, number, number],
    [0, 212, 255] as [number, number, number],
    [255, 214, 0] as [number, number, number],
    [255, 82, 82] as [number, number, number],
  ],
  // Fast (low DOM) = green → Slow = red
  speed: [
    [0, 230, 118] as [number, number, number],
    [0, 212, 255] as [number, number, number],
    [255, 214, 0] as [number, number, number],
    [255, 138, 101] as [number, number, number],
    [255, 82, 82] as [number, number, number],
  ],
  // Low inventory = red (hot) → High = blue (cool)
  inventory: [
    [255, 82, 82] as [number, number, number],
    [255, 214, 0] as [number, number, number],
    [0, 212, 255] as [number, number, number],
    [30, 70, 130] as [number, number, number],
  ],
  // Negative = red → Zero = gray → Positive = green
  diverging: [
    [255, 82, 82] as [number, number, number],
    [100, 100, 120] as [number, number, number],
    [0, 230, 118] as [number, number, number],
  ],
  // Investment potential: red (bad) → gold (neutral) → green (good)
  potential: [
    [255, 82, 82] as [number, number, number],
    [201, 168, 76] as [number, number, number],
    [0, 230, 118] as [number, number, number],
  ],
};

function getFromScale(palette: [number, number, number][], t: number): string {
  t = Math.max(0, Math.min(1, t));
  const segments = palette.length - 1;
  const idx = t * segments;
  const lower = Math.floor(idx);
  const upper = Math.min(lower + 1, segments);
  const frac = idx - lower;
  return lerpColor(palette[lower], palette[upper], frac);
}

/**
 * Get the color for a metric value based on its scale type.
 * Uses normalized 0-1 range derived from min/max of provided data set.
 */
export function getMetricColorFromRange(
  metricKey: HeatMapMetricKey,
  value: number,
  min: number,
  max: number
): string {
  const config = HEAT_MAP_METRIC_CONFIGS.find((m) => m.key === metricKey);
  if (!config) return 'rgb(100, 100, 120)';

  const range = max - min || 1;
  let t: number;

  if (config.colorScale === 'diverging') {
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    t = absMax === 0 ? 0.5 : (value + absMax) / (2 * absMax);
  } else {
    t = (value - min) / range;
  }

  return getFromScale(scales[config.colorScale], t);
}

/**
 * Get investment potential color (green = good, gold = moderate, red = poor)
 */
export function getInvestmentPotentialColor(score: number): string {
  // Score is 0-100
  const t = Math.max(0, Math.min(1, score / 100));
  return getFromScale(scales.potential, t);
}

/**
 * Get a legend array for a given metric scale
 */
export function getMetricLegend(metricKey: HeatMapMetricKey): { color: string; label: string }[] {
  const config = HEAT_MAP_METRIC_CONFIGS.find((m) => m.key === metricKey);
  if (!config) return [];

  const scale = scales[config.colorScale];
  const steps = 5;
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return {
      color: getFromScale(scale, t),
      label: '', // Labels are context-dependent
    };
  });
}

export { scales };
