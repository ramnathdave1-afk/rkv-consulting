'use client';

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  HeatMapMetricKey,
  HeatMapPropertyType,
  HeatMapCityMarketData,
} from '@/types';
import { MAJOR_METROS, HEAT_MAP_METRIC_CONFIGS } from '@/lib/market/data';
import { getMetricColorFromRange } from '@/lib/market/colors';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface LeafletMapProps {
  selectedMetric: HeatMapMetricKey;
  selectedPropertyType: HeatMapPropertyType;
  marketData: HeatMapCityMarketData[];
  onCitySelect: (cityId: string) => void;
  selectedCity: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Extract the numeric value for a given metric key from city data */
function getMetricValue(
  city: HeatMapCityMarketData,
  metric: HeatMapMetricKey,
  propType: HeatMapPropertyType
): number {
  if (metric === 'populationGrowth') return city.populationGrowth;
  return city.byType[propType]?.[metric] ?? 0;
}

/** Map marker radius from population — range 6px to 28px */
function getRadius(population: number): number {
  const minPop = 20_000;
  const maxPop = 8_500_000;
  const minR = 6;
  const maxR = 28;
  const clamped = Math.max(minPop, Math.min(maxPop, population));
  const t = (Math.log(clamped) - Math.log(minPop)) / (Math.log(maxPop) - Math.log(minPop));
  return minR + t * (maxR - minR);
}

/* ------------------------------------------------------------------ */
/*  Custom dark theme CSS injected once                                */
/* ------------------------------------------------------------------ */

const DARK_THEME_CSS = `
  .leaflet-container {
    background: #080808 !important;
    font-family: 'Inter', sans-serif;
  }
  .leaflet-control-attribution { display: none !important; }
  .leaflet-control-zoom {
    border: 1px solid #1e1e1e !important;
    border-radius: 8px !important;
    overflow: hidden;
  }
  .leaflet-control-zoom a {
    background: #111111 !important;
    color: #c9a84c !important;
    border-color: #1e1e1e !important;
    width: 32px !important;
    height: 32px !important;
    line-height: 32px !important;
    font-size: 16px !important;
  }
  .leaflet-control-zoom a:hover {
    background: #1e1e1e !important;
    color: #f5f5f5 !important;
  }
  .leaflet-popup-content-wrapper {
    background: #111111 !important;
    color: #f5f5f5 !important;
    border: 1px solid #1e1e1e !important;
    border-radius: 10px !important;
    box-shadow: 0 8px 32px rgba(201,168,76,0.08), 0 4px 16px rgba(0,0,0,0.5) !important;
    font-family: 'Inter', sans-serif !important;
  }
  .leaflet-popup-tip {
    background: #111111 !important;
    border: 1px solid #1e1e1e !important;
  }
  .leaflet-popup-close-button {
    color: #4A6080 !important;
  }
  .leaflet-popup-close-button:hover {
    color: #c9a84c !important;
  }
  .leaflet-tooltip {
    background: rgba(4, 8, 16, 0.96) !important;
    color: #f5f5f5 !important;
    border: 1px solid #1e1e1e !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 20px rgba(201,168,76,0.06), 0 4px 16px rgba(0,0,0,0.5) !important;
    padding: 10px 14px !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 12px !important;
    backdrop-filter: blur(12px);
  }
  .leaflet-tooltip::before {
    border-top-color: rgba(4, 8, 16, 0.96) !important;
  }
  .rkv-map-tooltip-name {
    font-family: 'DM Serif Display', serif;
    font-weight: 700;
    font-size: 14px;
    color: #c9a84c;
    margin-bottom: 6px;
    text-shadow: 0 0 8px rgba(201,168,76,0.3);
  }
  .rkv-map-tooltip-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 2px 0;
  }
  .rkv-map-tooltip-label {
    color: #4A6080;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: 'JetBrains Mono', monospace;
  }
  .rkv-map-tooltip-value {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
    font-size: 12px;
    color: #f5f5f5;
  }
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LeafletMap({
  selectedMetric,
  selectedPropertyType,
  marketData,
  onCitySelect,
  selectedCity,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const selectedRingRef = useRef<L.CircleMarker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const styleInjectedRef = useRef(false);

  // Pre-compute min/max for the current metric across all market data
  const { min, max } = useMemo(() => {
    if (marketData.length === 0) return { min: 0, max: 1 };
    const values = marketData.map((c) =>
      getMetricValue(c, selectedMetric, selectedPropertyType)
    );
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [marketData, selectedMetric, selectedPropertyType]);

  // Metric config for formatting
  const metricConfig = useMemo(
    () => HEAT_MAP_METRIC_CONFIGS.find((m) => m.key === selectedMetric),
    [selectedMetric]
  );

  // ── Inject dark-theme CSS once ──
  useEffect(() => {
    if (styleInjectedRef.current) return;
    const style = document.createElement('style');
    style.textContent = DARK_THEME_CSS;
    document.head.appendChild(style);
    styleInjectedRef.current = true;
  }, []);

  // ── Initialize map once ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.5, -98.35], // center of contiguous US
      zoom: 4,
      minZoom: 3,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark Carto tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control in bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Update markers when data/metric/selection changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (selectedRingRef.current) {
      map.removeLayer(selectedRingRef.current);
      selectedRingRef.current = null;
    }

    const newMarkers: L.CircleMarker[] = [];

    // Build a lookup from city name to market data
    const dataMap = new Map<string, HeatMapCityMarketData>();
    marketData.forEach((c) => dataMap.set(c.id, c));

    // Also allow lookup by "name, state"
    marketData.forEach((c) => dataMap.set(`${c.name}, ${c.state}`, c));

    MAJOR_METROS.forEach((metro) => {
      // Find market data for this metro
      const cityKey = `${metro.name}, ${metro.state}`;
      const cityData =
        dataMap.get(cityKey) ||
        marketData.find(
          (c) =>
            c.name.toLowerCase() === metro.name.toLowerCase() &&
            c.state === metro.state
        );

      if (!cityData) return;

      const value = getMetricValue(cityData, selectedMetric, selectedPropertyType);
      const color = getMetricColorFromRange(selectedMetric, value, min, max);
      const radius = getRadius(metro.population);
      const isSelected = selectedCity === cityData.id || selectedCity === cityKey;

      // Main circle marker
      const marker = L.circleMarker(metro.center, {
        radius,
        fillColor: color,
        fillOpacity: isSelected ? 0.9 : 0.65,
        color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.15)',
        weight: isSelected ? 3 : 1,
      });

      // Tooltip
      const formattedValue = metricConfig ? metricConfig.format(value) : String(value);
      const tooltipHtml = `
        <div>
          <div class="rkv-map-tooltip-name">${metro.name}, ${metro.state}</div>
          <div class="rkv-map-tooltip-row">
            <span class="rkv-map-tooltip-label">${metricConfig?.label ?? selectedMetric}</span>
            <span class="rkv-map-tooltip-value">${formattedValue}</span>
          </div>
          <div class="rkv-map-tooltip-row">
            <span class="rkv-map-tooltip-label">Population</span>
            <span class="rkv-map-tooltip-value">${metro.population.toLocaleString()}</span>
          </div>
        </div>
      `;
      marker.bindTooltip(tooltipHtml, {
        direction: 'top',
        offset: [0, -radius],
        className: '',
        sticky: false,
      });

      // Click handler
      marker.on('click', () => {
        onCitySelect(cityData.id);
      });

      // Hover interaction
      marker.on('mouseover', () => {
        marker.setStyle({ fillOpacity: 0.9, weight: 2 });
      });
      marker.on('mouseout', () => {
        if (!(selectedCity === cityData.id || selectedCity === cityKey)) {
          marker.setStyle({ fillOpacity: 0.65, weight: 1, color: 'rgba(255,255,255,0.15)' });
        }
      });

      marker.addTo(map);
      newMarkers.push(marker);

      // Gold ring for selected city
      if (isSelected) {
        const ring = L.circleMarker(metro.center, {
          radius: radius + 5,
          fillColor: 'transparent',
          fillOpacity: 0,
          color: '#c9a84c',
          weight: 2.5,
          dashArray: '6 3',
          opacity: 0.85,
        });
        ring.addTo(map);
        selectedRingRef.current = ring;
      }
    });

    markersRef.current = newMarkers;
  }, [
    marketData,
    selectedMetric,
    selectedPropertyType,
    selectedCity,
    min,
    max,
    metricConfig,
    onCitySelect,
  ]);

  return (
    <div className="relative w-full h-full" style={{ background: '#080808' }}>
      <div ref={containerRef} className="w-full h-full" />
      {/* Vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(4,8,16,0.7) 100%)',
        }}
      />
      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" />
    </div>
  );
}
