import type { PipelineStage, AgentName, Vertical } from '@/lib/types';
import { getVerticalConfig } from '@/lib/verticals';

// ── Pipeline Stages (default — use getVerticalConfig for vertical-specific) ──
export const PIPELINE_STAGES: { value: PipelineStage; label: string; color: string }[] = [
  { value: 'prospect', label: 'Prospect', color: '#8B95A5' },
  { value: 'due_diligence', label: 'Due Diligence', color: '#3B82F6' },
  { value: 'loi', label: 'LOI', color: '#8A00FF' },
  { value: 'under_contract', label: 'Under Contract', color: '#F59E0B' },
  { value: 'closed', label: 'Closed', color: '#22C55E' },
];

export const STAGE_ORDER: PipelineStage[] = [
  'prospect',
  'due_diligence',
  'loi',
  'under_contract',
  'closed',
];

// ── Agents ──
export const AGENTS: { name: AgentName; label: string; description: string; icon: string }[] = [
  { name: 'alpha', label: 'Agent Alpha', description: 'Infrastructure Scanner — finds substations with available capacity headroom', icon: 'Zap' },
  { name: 'beta', label: 'Agent Beta', description: 'Site Discovery — locates optimal parcels near infrastructure', icon: 'Map' },
  { name: 'gamma', label: 'Agent Gamma', description: 'Multi-Dimension Scorer — calculates composite site scores', icon: 'Shield' },
  { name: 'delta', label: 'Agent Delta', description: 'Market Intel — regional power, land, and tax data', icon: 'TrendingUp' },
  { name: 'epsilon', label: 'Agent Epsilon', description: 'Feasibility Analyzer — AI-powered zoning and buildability analysis', icon: 'Search' },
  { name: 'zeta', label: 'Agent Zeta', description: 'Data Ingestion — orchestrates external data source pipelines', icon: 'Database' },
];

// ── Default Map Bounds (US-wide, configurable per org) ──
export const DEFAULT_BOUNDS = {
  center: { lat: 39.5, lng: -98.5 },
  zoom: 4,
  bounds: {
    north: 49.0,
    south: 24.5,
    east: -66.9,
    west: -125.0,
  },
} as const;

/** @deprecated Use DEFAULT_BOUNDS instead */
export const PJM_BOUNDS = DEFAULT_BOUNDS;

// ── Map Config ──
export const MAP_CONFIG = {
  style: 'mapbox://styles/mapbox/dark-v11',
  initialViewState: {
    longitude: DEFAULT_BOUNDS.center.lng,
    latitude: DEFAULT_BOUNDS.center.lat,
    zoom: DEFAULT_BOUNDS.zoom,
    pitch: 45,
    bearing: -15,
  },
  terrain: {
    source: 'mapbox-dem',
    exaggeration: 1.5,
  },
  buildingsMinZoom: 14,
} as const;

// ── Roles ──
export const ROLES = {
  admin: { label: 'Admin', description: 'Full access — manage team, override pipeline, configure agents' },
  analyst: { label: 'Analyst', description: 'View/edit sites, move pipeline stages, generate reports' },
  viewer: { label: 'Viewer', description: 'Read-only access to all data' },
} as const;

// ── Score Dimensions (default — use getVerticalConfig for vertical-specific) ──
export const SCORE_DIMENSIONS = [
  { key: 'grid_score', label: 'Grid', color: '#3B82F6' },
  { key: 'land_score', label: 'Land', color: '#22C55E' },
  { key: 'risk_score', label: 'Risk', color: '#EF4444' },
  { key: 'market_score', label: 'Market', color: '#F59E0B' },
  { key: 'connectivity_score', label: 'Connectivity', color: '#8A00FF' },
] as const;

// ── Helper: get pipeline stages for a vertical ──
export function getPipelineStages(vertical: Vertical) {
  return getVerticalConfig(vertical).pipelineStages;
}

// ── Helper: get score dimensions for a vertical ──
export function getScoreDimensions(vertical: Vertical) {
  return getVerticalConfig(vertical).scoreDimensions;
}
