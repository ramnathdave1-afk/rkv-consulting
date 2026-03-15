// ── Organizations & Users ──
export type UserRole = 'admin' | 'analyst' | 'viewer';

export type Vertical = 'data_center' | 'solar' | 'wind' | 'ev_charging' | 'industrial' | 'residential' | 'mixed_use';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  enabled_verticals: Vertical[];
  default_vertical: Vertical;
  coverage_bounds: Record<string, unknown> | null;
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
  | 'prospect'
  | 'due_diligence'
  | 'loi'
  | 'under_contract'
  | 'closed';

export interface Site {
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
  vertical: Vertical;
  attributes: Record<string, unknown>;
  target_capacity: number | null;
  capacity_unit: string;
  iso_region: string | null;
  municipality: string | null;
  parcel_id: string | null;
  nearest_substation_id: string | null;
  distance_to_substation_mi: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use Site instead */
export type GhostSite = Site;

export interface SiteScore {
  id: string;
  site_id: string;
  composite_score: number;
  grid_score: number;
  land_score: number;
  risk_score: number;
  market_score: number;
  connectivity_score: number;
  dimension_scores: Record<string, number>;
  scoring_profile: string;
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
  iso_zone: string | null;
  iso_region: string | null;
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
export type AgentName = 'alpha' | 'beta' | 'gamma' | 'delta' | 'epsilon' | 'zeta';

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
  vertical: string | null;
  iso_region: string | null;
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
  vertical: Vertical;
  target_capacity: number | null;
  capacity_unit: string;
  acreage: number | null;
  composite_score: number | null;
  nearest_substation_name: string | null;
  distance_to_substation_mi: number | null;
}

// ── Dashboard KPIs ──
export interface DashboardKPIs {
  total_sites: number;
  aggregate_capacity: number;
  under_contract: number;
  agent_activity_24h: number;
  avg_score: number;
  pipeline_value: number;
}

// ── Chat ──
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SystemLogEntry {
  id: string;
  type: 'FETCH' | 'ANALYSIS' | 'SUCCESS' | 'ERROR' | 'SCAN';
  message: string;
  agent?: AgentName;
  timestamp: string;
}

// ── Data Ingestion ──
export type DataSourceType = 'parcel' | 'environmental' | 'energy' | 'infrastructure' | 'market' | 'zoning' | 'permit';
export type DataSourceStatus = 'active' | 'paused' | 'error' | 'setup';
export type IngestionJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface DataSource {
  id: string;
  name: string;
  slug: string;
  source_type: DataSourceType;
  provider: string;
  description: string | null;
  status: DataSourceStatus;
  refresh_schedule: string | null;
  coverage_states: string[] | null;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_records: number;
  total_records: number;
  created_at: string;
  updated_at: string;
}

export interface IngestionJob {
  id: string;
  source_id: string;
  status: IngestionJobStatus;
  triggered_by: string;
  target_states: string[] | null;
  target_counties: string[] | null;
  records_fetched: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  records_errored: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  warnings: string[] | null;
  created_at: string;
}

export interface ExpandedParcel extends Parcel {
  fips_code: string | null;
  assessed_value: number | null;
  market_value: number | null;
  tax_amount: number | null;
  tax_year: number | null;
  lot_size_sqft: number | null;
  year_built: number | null;
  land_use_code: string | null;
  land_use_desc: string | null;
  flood_zone: string | null;
  wetland_flag: boolean;
  environmental_flags: unknown[];
  utilities_available: Record<string, unknown>;
  source_id: string | null;
  updated_at: string;
}

export interface ZoningDistrict {
  id: string;
  jurisdiction: string;
  state: string;
  county: string | null;
  zone_code: string;
  zone_name: string | null;
  zone_category: string | null;
  permitted_uses: string[] | null;
  conditional_uses: string[] | null;
  max_building_height_ft: number | null;
  max_lot_coverage_pct: number | null;
  min_lot_size_sqft: number | null;
  front_setback_ft: number | null;
  side_setback_ft: number | null;
  rear_setback_ft: number | null;
  max_far: number | null;
  created_at: string;
}

export interface Permit {
  id: string;
  permit_number: string;
  permit_type: string;
  status: string;
  applicant: string | null;
  description: string | null;
  parcel_id: string | null;
  address: string | null;
  state: string;
  county: string | null;
  jurisdiction: string;
  lat: number | null;
  lng: number | null;
  submitted_date: string | null;
  issued_date: string | null;
  estimated_value: number | null;
  created_at: string;
}

export interface EnvironmentalLayer {
  id: string;
  layer_type: string;
  severity: string | null;
  designation: string | null;
  name: string | null;
  description: string | null;
  state: string | null;
  source_agency: string | null;
  area_acres: number | null;
  restrictions: Record<string, unknown>;
  mitigation_required: boolean;
  created_at: string;
}

// ── Layer Tree ──
export type LayerTreeVisibility = Record<string, boolean>;

// ── Vertical Configuration ──
export interface ScoreDimension {
  key: string;
  label: string;
  color: string;
  weight: number;
}

export interface VerticalConfig {
  id: Vertical;
  label: string;
  icon: string;
  description: string;
  capacityUnit: string;
  capacityLabel: string;
  pipelineStages: { value: PipelineStage; label: string; color: string }[];
  scoreDimensions: ScoreDimension[];
  defaultLayers: string[];
}
