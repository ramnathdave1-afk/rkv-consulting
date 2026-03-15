import type { PipelineStage, AgentName } from '@/lib/types';

// ── Pipeline Stages ──
export const PIPELINE_STAGES: { value: PipelineStage; label: string; color: string }[] = [
  { value: 'ghost_site', label: 'Ghost Site', color: '#8B95A5' },
  { value: 'due_diligence', label: 'Due Diligence', color: '#3B82F6' },
  { value: 'loi', label: 'LOI', color: '#8A00FF' },
  { value: 'under_contract', label: 'Under Contract', color: '#F59E0B' },
  { value: 'closed', label: 'Closed', color: '#22C55E' },
];

export const STAGE_ORDER: PipelineStage[] = [
  'ghost_site',
  'due_diligence',
  'loi',
  'under_contract',
  'closed',
];

// ── Agents ──
export const AGENTS: { name: AgentName; label: string; description: string; icon: string }[] = [
  { name: 'alpha', label: 'Agent Alpha', description: 'Grid Scanner — finds substations with available MW headroom', icon: 'Zap' },
  { name: 'beta', label: 'Agent Beta', description: 'Parcel Analyzer — locates >40 acre parcels near substations', icon: 'Map' },
  { name: 'gamma', label: 'Agent Gamma', description: 'Risk Scorer — calculates composite site scores', icon: 'Shield' },
  { name: 'delta', label: 'Agent Delta', description: 'Market Intel — regional power, land, and tax data', icon: 'TrendingUp' },
];

// ── PJM Territory Bounds ──
export const PJM_BOUNDS = {
  center: { lat: 39.5, lng: -78.5 },
  zoom: 6,
  bounds: {
    north: 42.5,
    south: 36.5,
    east: -74.0,
    west: -84.0,
  },
} as const;

// ── Map Config ──
export const MAP_CONFIG = {
  style: 'mapbox://styles/mapbox/dark-v11',
  initialViewState: {
    longitude: PJM_BOUNDS.center.lng,
    latitude: PJM_BOUNDS.center.lat,
    zoom: PJM_BOUNDS.zoom,
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

// ── Score Dimensions ──
export const SCORE_DIMENSIONS = [
  { key: 'grid_score', label: 'Grid', color: '#3B82F6' },
  { key: 'land_score', label: 'Land', color: '#22C55E' },
  { key: 'risk_score', label: 'Risk', color: '#EF4444' },
  { key: 'market_score', label: 'Market', color: '#F59E0B' },
  { key: 'connectivity_score', label: 'Connectivity', color: '#8A00FF' },
] as const;
