'use client'

import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps'
import { geoAlbersUsa } from 'd3-geo'
import type {
  HeatMapMetricKey,
  HeatMapPropertyType,
  HeatMapCityMarketData,
} from '@/types'
import { MAJOR_METROS, HEAT_MAP_METRIC_CONFIGS } from '@/lib/market/data'
import { getMetricColorFromRange } from '@/lib/market/colors'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'
const MAP_WIDTH = 800
const MAP_HEIGHT = 500
const PROJ_SCALE = 1000

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface USMarketMapProps {
  selectedMetric: HeatMapMetricKey
  selectedPropertyType: HeatMapPropertyType
  marketData: HeatMapCityMarketData[]
  onCitySelect: (cityId: string) => void
  selectedCity: string | null
  trackedMarkets: string[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getMetricValue(
  city: HeatMapCityMarketData,
  metric: HeatMapMetricKey,
  propType: HeatMapPropertyType
): number {
  if (metric === 'populationGrowth') return city.populationGrowth
  return city.byType[propType]?.[metric] ?? 0
}

function getRadius(population: number): number {
  const minPop = 20_000
  const maxPop = 8_500_000
  const minR = 3
  const maxR = 12
  const clamped = Math.max(minPop, Math.min(maxPop, population))
  const t =
    (Math.log(clamped) - Math.log(minPop)) /
    (Math.log(maxPop) - Math.log(minPop))
  return minR + t * (maxR - minR)
}

function formatMetricValue(key: HeatMapMetricKey, value: number): string {
  const config = HEAT_MAP_METRIC_CONFIGS.find((m) => m.key === key)
  if (!config) return value.toFixed(0)
  return config.format(value)
}

/* ------------------------------------------------------------------ */
/*  Projection helper for connection arcs                              */
/*  Uses the same geoAlbersUsa config as ComposableMap                 */
/* ------------------------------------------------------------------ */

function projectCoord(
  lat: number,
  lng: number
): { x: number; y: number } | null {
  const proj = geoAlbersUsa()
    .scale(PROJ_SCALE)
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
  const result = proj([lng, lat])
  if (!result) return null
  return { x: result[0], y: result[1] }
}

function createCurvedPath(
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2 - dist * 0.2
  return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`
}

/* ------------------------------------------------------------------ */
/*  Deterministic delay so animations are stable across re-renders     */
/* ------------------------------------------------------------------ */

function stableDelay(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return (Math.abs(hash) % 500) / 1000 // 0 – 0.5s
}

function stablePulseBegin(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return `${(Math.abs(hash) % 3000) / 1000}s`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function USMarketMap({
  selectedMetric,
  selectedPropertyType,
  marketData,
  onCitySelect,
  selectedCity,
  trackedMarkets,
}: USMarketMapProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)

  /* ---- Metric range for color scale ---- */
  const { min: metricMin, max: metricMax } = useMemo(() => {
    const values = marketData.map((c) =>
      getMetricValue(c, selectedMetric, selectedPropertyType)
    )
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    }
  }, [marketData, selectedMetric, selectedPropertyType])

  /* ---- Connection arcs between tracked markets ---- */
  const connections = useMemo(() => {
    const trackedCoords = trackedMarkets
      .map((cityStr) => {
        const metro = MAJOR_METROS.find(
          (m) => `${m.name}, ${m.state}` === cityStr
        )
        if (!metro) return null
        const projected = projectCoord(metro.center[0], metro.center[1])
        if (!projected) return null
        return { id: cityStr, ...projected }
      })
      .filter(Boolean) as { id: string; x: number; y: number }[]

    if (trackedCoords.length < 2) return []

    const lines: { id: string; path: string }[] = []

    for (let i = 0; i < trackedCoords.length - 1; i++) {
      const a = trackedCoords[i]
      const b = trackedCoords[i + 1]
      lines.push({
        id: `${a.id}-${b.id}`,
        path: createCurvedPath(a, b),
      })
    }
    if (trackedCoords.length >= 3) {
      const first = trackedCoords[0]
      const last = trackedCoords[trackedCoords.length - 1]
      lines.push({
        id: `${last.id}-${first.id}`,
        path: createCurvedPath(last, first),
      })
    }
    return lines
  }, [trackedMarkets])

  /* ---- City markers ---- */
  const cityMarkers = useMemo(() => {
    return marketData
      .map((city) => {
        const metro = MAJOR_METROS.find(
          (m) => `${m.name}, ${m.state}` === city.id
        )
        if (!metro) return null

        const value = getMetricValue(city, selectedMetric, selectedPropertyType)
        const color = getMetricColorFromRange(
          selectedMetric,
          value,
          metricMin,
          metricMax
        )
        const radius = getRadius(metro.population)
        const isTracked = trackedMarkets.includes(city.id)
        const isSelected = selectedCity === city.id
        const isHovered = hoveredCity === city.id

        return {
          ...city,
          // react-simple-maps Marker expects [lng, lat]
          coords: [metro.center[1], metro.center[0]] as [number, number],
          value,
          color,
          radius,
          isTracked,
          isSelected,
          isHovered,
          formattedValue: formatMetricValue(selectedMetric, value),
        }
      })
      .filter(Boolean) as Array<
      HeatMapCityMarketData & {
        coords: [number, number]
        value: number
        color: string
        radius: number
        isTracked: boolean
        isSelected: boolean
        isHovered: boolean
        formattedValue: string
      }
    >
  }, [
    marketData,
    selectedMetric,
    selectedPropertyType,
    metricMin,
    metricMax,
    trackedMarkets,
    selectedCity,
    hoveredCity,
  ])

  const handleCityClick = useCallback(
    (cityId: string) => {
      onCitySelect(cityId)
    },
    [onCitySelect]
  )

  const metricConfig = HEAT_MAP_METRIC_CONFIGS.find(
    (m) => m.key === selectedMetric
  )

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ background: '#080808', border: '1px solid #1e1e1e' }}
    >
      {/* Gold accent line at top */}
      <div className="h-[2px] bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0" />

      {/* Map container */}
      <div className="relative" style={{ height: 540 }}>
        {/* Subtle radial glow behind map */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.03) 0%, transparent 60%)',
          }}
        />

        {/* Scan line animation */}
        <motion.div
          className="absolute left-0 right-0 h-[1px] pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent)',
          }}
          animate={{ y: [0, 540, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />

        {/* ── The actual US map ── */}
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: PROJ_SCALE }}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
          }}
        >
          <defs>
            {/* Gold gradient for connection arcs */}
            <linearGradient id="conn-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="0" />
              <stop offset="15%" stopColor="#c9a84c" stopOpacity="0.6" />
              <stop offset="85%" stopColor="#c9a84c" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
            </linearGradient>

            {/* Glow filter for selected/hovered markers */}
            <filter
              id="marker-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle inner-shadow on states */}
            <filter id="state-shadow" x="-2%" y="-2%" width="104%" height="104%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="1"
                floodColor="#c9a84c"
                floodOpacity="0.05"
              />
            </filter>
          </defs>

          {/* ── State shapes ── */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#0d0d0d"
                  stroke="rgba(201,168,76,0.12)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', fill: '#141414', stroke: 'rgba(201,168,76,0.25)' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* ── Connection arcs between tracked markets ── */}
          {connections.map((conn, i) => (
            <g key={conn.id}>
              {/* Soft shadow arc */}
              <motion.path
                d={conn.path}
                fill="none"
                stroke="rgba(201,168,76,0.08)"
                strokeWidth="6"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.2,
                  ease: 'easeOut',
                }}
              />
              {/* Main dashed arc */}
              <motion.path
                d={conn.path}
                fill="none"
                stroke="url(#conn-grad)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.2,
                  ease: 'easeOut',
                }}
              />
              {/* Traveling dot (solid) */}
              <circle r="2.5" fill="#c9a84c" opacity="0.9">
                <animateMotion
                  dur={`${3 + i * 0.5}s`}
                  repeatCount="indefinite"
                  path={conn.path}
                />
              </circle>
              {/* Traveling dot (halo) */}
              <circle r="5" fill="#c9a84c" opacity="0.2">
                <animateMotion
                  dur={`${3 + i * 0.5}s`}
                  repeatCount="indefinite"
                  path={conn.path}
                />
              </circle>
            </g>
          ))}

          {/* ── City markers ── */}
          {cityMarkers.map((city) => {
            const showLabel =
              city.isSelected || city.isHovered || city.isTracked
            const pulseBegin = stablePulseBegin(city.id)

            return (
              <Marker
                key={city.id}
                coordinates={city.coords}
                onClick={() => handleCityClick(city.id)}
                onMouseEnter={() => setHoveredCity(city.id)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                {/* Outer rotating dashed ring (tracked only) */}
                {city.isTracked && (
                  <circle
                    r={city.radius + 6}
                    fill="none"
                    stroke="#c9a84c"
                    strokeWidth="0.5"
                    strokeDasharray="3 2"
                    opacity="0.3"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 0 0"
                      to="360 0 0"
                      dur="20s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Expanding pulse ring (selected only) */}
                {city.isSelected && (
                  <circle
                    r={city.radius}
                    fill="none"
                    stroke="#c9a84c"
                    strokeWidth="1"
                    opacity="0.6"
                  >
                    <animate
                      attributeName="r"
                      from={String(city.radius)}
                      to={String(city.radius + 20)}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.6"
                      to="0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Main marker circle */}
                <motion.circle
                  r={
                    city.isHovered || city.isSelected
                      ? city.radius + 2
                      : city.radius
                  }
                  fill={city.color}
                  opacity={city.isTracked ? 0.9 : 0.5}
                  stroke={
                    city.isSelected
                      ? '#c9a84c'
                      : city.isHovered
                        ? '#ffffff'
                        : city.isTracked
                          ? '#c9a84c'
                          : 'transparent'
                  }
                  strokeWidth={city.isSelected ? 2 : 1}
                  filter={
                    city.isSelected || city.isHovered
                      ? 'url(#marker-glow)'
                      : undefined
                  }
                  className="cursor-pointer"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: city.isTracked ? 0.9 : 0.5,
                  }}
                  transition={{
                    duration: 0.5,
                    delay: stableDelay(city.id),
                  }}
                />

                {/* Breathing pulse for all markers */}
                <circle r={city.radius} fill={city.color} opacity="0">
                  <animate
                    attributeName="r"
                    from={String(city.radius)}
                    to={String(city.radius + 8)}
                    dur="3s"
                    begin={pulseBegin}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.25"
                    to="0"
                    dur="3s"
                    begin={pulseBegin}
                    repeatCount="indefinite"
                  />
                </circle>

                {/* City label */}
                <AnimatePresence>
                  {showLabel && (
                    <motion.g
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <rect
                        x={-40}
                        y={-city.radius - 28}
                        width="80"
                        height="22"
                        rx="4"
                        fill="rgba(17,17,17,0.95)"
                        stroke={city.isSelected ? '#c9a84c' : '#2a2a2a'}
                        strokeWidth="0.5"
                      />
                      <text
                        x={0}
                        y={-city.radius - 20}
                        textAnchor="middle"
                        fill={city.isSelected ? '#c9a84c' : '#e5e5e5'}
                        fontSize="7"
                        fontFamily="'JetBrains Mono', monospace"
                        fontWeight="600"
                      >
                        {city.name}, {city.state}
                      </text>
                      <text
                        x={0}
                        y={-city.radius - 11}
                        textAnchor="middle"
                        fill="#888"
                        fontSize="6"
                        fontFamily="'JetBrains Mono', monospace"
                      >
                        {city.formattedValue}
                      </text>
                    </motion.g>
                  )}
                </AnimatePresence>

                {/* Invisible larger hit area */}
                <circle
                  r={Math.max(city.radius + 4, 10)}
                  fill="transparent"
                  className="cursor-pointer"
                />
              </Marker>
            )
          })}
        </ComposableMap>

        {/* ── Bottom-left: metric legend ── */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none">
          <span className="text-[9px] font-mono text-muted-deep uppercase tracking-wider">
            {metricConfig?.label || selectedMetric}
          </span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => {
              const t = i / 4
              const val = metricMin + t * (metricMax - metricMin)
              return (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="w-6 h-2 rounded-[1px]"
                    style={{
                      background: getMetricColorFromRange(
                        selectedMetric,
                        val,
                        metricMin,
                        metricMax
                      ),
                      opacity: 0.8,
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between w-[130px]">
            <span className="text-[8px] font-mono text-muted-deep">
              {formatMetricValue(selectedMetric, metricMin)}
            </span>
            <span className="text-[8px] font-mono text-muted-deep">
              {formatMetricValue(selectedMetric, metricMax)}
            </span>
          </div>
        </div>

        {/* ── Bottom-right: status ── */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-none">
          <span className="pulse-dot" />
          <span className="text-[9px] font-mono text-muted-deep uppercase tracking-wider">
            {trackedMarkets.length} markets tracked
          </span>
        </div>

        {/* ── Top-right: metro count ── */}
        <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-none">
          <span className="text-[9px] font-mono text-gold/60 uppercase tracking-wider">
            {cityMarkers.length} metros
          </span>
        </div>
      </div>
    </div>
  )
}
