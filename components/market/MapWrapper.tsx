'use client';

import dynamic from 'next/dynamic';
import type {
  HeatMapMetricKey,
  HeatMapPropertyType,
  HeatMapCityMarketData,
} from '@/types';

/* ------------------------------------------------------------------ */
/*  Dynamic import — Leaflet needs `window`, so SSR must be disabled   */
/* ------------------------------------------------------------------ */

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function MapSkeleton() {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden" style={{ background: '#080808', border: '1px solid #1e1e1e' }}>
      {/* Fake map background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #111111, #080808, #111111)' }} />

      {/* Animated cyan shimmer */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(201,168,76,0.04), transparent)',
          }}
        />
      </div>

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(15,22,32,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(15,22,32,0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Fake dots to hint at map markers */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-3/4 h-3/4">
          {[
            { top: '25%', left: '15%', size: 10 },
            { top: '35%', left: '75%', size: 14 },
            { top: '55%', left: '45%', size: 8 },
            { top: '40%', left: '55%', size: 12 },
            { top: '60%', left: '25%', size: 9 },
            { top: '30%', left: '40%', size: 11 },
            { top: '50%', left: '65%', size: 7 },
          ].map((dot, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                top: dot.top,
                left: dot.left,
                width: dot.size,
                height: dot.size,
                background: 'rgba(201,168,76,0.15)',
                boxShadow: '0 0 8px rgba(201,168,76,0.1)',
                animationDelay: `${i * 200}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Loading label */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="pulse-dot" />
        <span className="text-xs text-muted font-body uppercase tracking-wider">Loading market map...</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props (pass-through to LeafletMap)                                 */
/* ------------------------------------------------------------------ */

interface MapWrapperProps {
  selectedMetric: HeatMapMetricKey;
  selectedPropertyType: HeatMapPropertyType;
  marketData: HeatMapCityMarketData[];
  onCitySelect: (cityId: string) => void;
  selectedCity: string | null;
}

/* ------------------------------------------------------------------ */
/*  Wrapper                                                            */
/* ------------------------------------------------------------------ */

export default function MapWrapper({
  selectedMetric,
  selectedPropertyType,
  marketData,
  onCitySelect,
  selectedCity,
}: MapWrapperProps) {
  return (
    <LeafletMap
      selectedMetric={selectedMetric}
      selectedPropertyType={selectedPropertyType}
      marketData={marketData}
      onCitySelect={onCitySelect}
      selectedCity={selectedCity}
    />
  );
}
