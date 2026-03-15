// ── Organizations & Users ──
export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  org_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  org_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  created_at: string;
}

// ── Sites & Pipeline ──
export type PipelineStage =
  | 'ghost_site'
  | 'due_diligence'
  | 'loi'
  | 'under_contract'
  | 'closed';

export interface GhostSite {
  id: string;
  org_id: string;
  name: string;
  lat: number;
  lng: number;
  state: string;
  county: string | null;
  acreage: number | null;
  zoning: string | null;
  pipeline_stage: PipelineStage;
  target_mw: number | null;
  nearest_substation_id: string | null;
  distance_to_substation_mi: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteScore {
  id: string;
  site_id: string;
  composite_score: number;
  grid_score: number;
  land_score: number;
  risk_score: number;
  market_score: number;
  connectivity_score: number;
  scored_at: string;
  scored_by: string | null;
}

// ── Grid & Substations ──
export interface Substation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  voltage_kv: number | null;
  capacity_mw: number | null;
  available_mw: number | null;
  utility: string | null;
  state: string;
  pjm_zone: string | null;
  created_at: string;
}

// ── Parcels ──
export interface Parcel {
  id: string;
  apn: string | null;
  address: string | null;
  acreage: number | null;
  zoning: string | null;
  owner: string | null;
  state: string;
  county: string;
  lat: number;
  lng: number;
  created_at: string;
}

// ── Agents ──
export type AgentName = 'alpha' | 'beta' | 'gamma' | 'delta';

export interface AgentActivityLog {
  id: string;
  agent_name: AgentName;
  action: string;
  details: Record<string, unknown> | null;
  org_id: string | null;
  site_id: string | null;
  created_at: string;
}

// ── Market Intelligence ──
export interface MarketIntelligence {
  id: string;
  region: string;
  state: string;
  avg_power_cost_kwh: number | null;
  avg_land_cost_acre: number | null;
  tax_incentive_score: number | null;
  fiber_density_score: number | null;
  data: Record<string, unknown> | null;
  collected_at: string;
}

// ── Pipeline History ──
export interface PipelineHistory {
  id: string;
  site_id: string;
  from_stage: PipelineStage | null;
  to_stage: PipelineStage;
  moved_by: string;
  notes: string | null;
  created_at: string;
}

// ── Reports ──
export interface Report {
  id: string;
  site_id: string;
  generated_by: string;
  report_type: 'preliminary' | 'full' | 'summary';
  pdf_url: string | null;
  created_at: string;
}

// ── Map View ──
export interface SiteMapData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  state: string;
  pipeline_stage: PipelineStage;
  target_mw: number | null;
  acreage: number | null;
  composite_score: number | null;
  nearest_substation_name: string | null;
  distance_to_substation_mi: number | null;
}

// ── Dashboard KPIs ──
export interface DashboardKPIs {
  total_sites: number;
  aggregate_mw: number;
  under_contract: number;
  agent_activity_24h: number;
  avg_score: number;
  pipeline_value: number;
}
