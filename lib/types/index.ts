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

// ═══════════════════════════════════════════════════════════════
// Property Management Domain
// ═══════════════════════════════════════════════════════════════

export type PropertyType = 'multifamily' | 'single_family' | 'commercial' | 'mixed_use' | 'hoa';
export type UnitStatus = 'occupied' | 'vacant' | 'notice' | 'make_ready' | 'down' | 'model';
export type TenantStatus = 'prospect' | 'applicant' | 'approved' | 'active' | 'notice' | 'past' | 'denied';
export type LeaseStatus = 'pending' | 'active' | 'expired' | 'terminated' | 'renewed';
export type WorkOrderCategory = 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'pest' | 'structural' | 'cosmetic' | 'safety' | 'general' | 'turnover';
export type WorkOrderPriority = 'emergency' | 'high' | 'medium' | 'low';
export type WorkOrderStatus = 'open' | 'assigned' | 'in_progress' | 'parts_needed' | 'completed' | 'closed' | 'cancelled';
export type WorkOrderSource = 'manual' | 'tenant_portal' | 'ai_chat' | 'phone' | 'email' | 'inspection';
export type ConversationChannel = 'sms' | 'email' | 'web_chat' | 'voice';
export type ConversationStatus = 'active' | 'closed' | 'escalated' | 'ai_handling' | 'human_handling';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageSenderType = 'tenant' | 'staff' | 'ai' | 'system';
export type IntegrationPlatform = 'appfolio' | 'buildium' | 'rent_manager' | 'yardi';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'syncing';
export type SyncJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type SyncEntityType = 'properties' | 'units' | 'tenants' | 'leases' | 'work_orders' | 'vendors' | 'full';
export type PhoneNumberPurpose = 'general' | 'leasing' | 'maintenance' | 'emergency';

export interface Property {
  id: string;
  org_id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  property_type: PropertyType;
  unit_count: number;
  year_built: number | null;
  square_footage: number | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  metadata: Record<string, unknown>;
  external_id: string | null;
  external_source: IntegrationPlatform | null;
  last_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  org_id: string;
  unit_number: string;
  floor_plan: string | null;
  bedrooms: number;
  bathrooms: number;
  square_footage: number | null;
  market_rent: number | null;
  status: UnitStatus;
  external_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  phone_verified: boolean;
  status: TenantStatus;
  source: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  org_id: string;
  unit_id: string;
  tenant_id: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  security_deposit: number | null;
  status: LeaseStatus;
  renewal_offered: boolean;
  renewal_rent: number | null;
  external_id: string | null;
  terms: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  org_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  specialty: string[];
  hourly_rate: number | null;
  is_preferred: boolean;
  rating: number | null;
  notes: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  org_id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string | null;
  vendor_id: string | null;
  title: string;
  description: string | null;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  source: WorkOrderSource;
  scheduled_date: string | null;
  completed_date: string | null;
  cost: number | null;
  photos: string[];
  ai_summary: string | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  org_id: string;
  tenant_id: string | null;
  property_id: string | null;
  channel: ConversationChannel;
  twilio_phone: string | null;
  participant_phone: string | null;
  participant_name: string | null;
  status: ConversationStatus;
  ai_context: Record<string, unknown>;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  org_id: string;
  direction: MessageDirection;
  sender_type: MessageSenderType;
  sender_id: string | null;
  content: string;
  channel: ConversationChannel;
  twilio_sid: string | null;
  status: string;
  ai_classified_intent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OwnerReport {
  id: string;
  org_id: string;
  property_id: string;
  report_type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  period_start: string;
  period_end: string;
  total_income: number | null;
  total_expenses: number | null;
  net_operating_income: number | null;
  occupancy_rate: number | null;
  ai_summary: string | null;
  data: Record<string, unknown>;
  pdf_url: string | null;
  generated_by: string | null;
  created_at: string;
}

export interface Integration {
  id: string;
  org_id: string;
  platform: IntegrationPlatform;
  auth_type: 'api_key' | 'oauth2';
  status: IntegrationStatus;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_records: number;
  sync_config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncJob {
  id: string;
  integration_id: string;
  org_id: string;
  entity_type: SyncEntityType;
  status: SyncJobStatus;
  records_fetched: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  records_errored: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface OrgPhoneNumber {
  id: string;
  org_id: string;
  phone_number: string;
  twilio_sid: string;
  friendly_name: string | null;
  purpose: PhoneNumberPurpose;
  is_active: boolean;
  sms_enabled: boolean;
  voice_enabled: boolean;
  created_at: string;
}

export interface PMDashboardKPIs {
  total_properties: number;
  total_units: number;
  occupancy_rate: number;
  open_work_orders: number;
  expiring_leases_30d: number;
  monthly_revenue: number;
  active_conversations: number;
}

// ── Phase 2: Showings, Renewals, Financials ──

export type ShowingStatus = 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
export type ShowingSource = 'manual' | 'ai_chat' | 'website' | 'phone' | 'walk_in';
export type FollowUpStatus = 'pending' | 'sent' | 'responded' | 'applied' | 'skipped';
export type RenewalSequenceStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'expired';
export type TenantRenewalResponse = 'accepted' | 'declined' | 'negotiating' | 'no_response';
export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 'rent' | 'late_fee' | 'utility' | 'repair' | 'insurance' | 'tax' | 'management_fee' | 'other';

export interface Showing {
  id: string;
  org_id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string | null;
  prospect_name: string | null;
  prospect_phone: string | null;
  prospect_email: string | null;
  status: ShowingStatus;
  scheduled_at: string;
  duration_minutes: number;
  notes: string | null;
  source: ShowingSource;
  follow_up_status: FollowUpStatus;
  follow_up_sent_at: string | null;
  reminder_sent: boolean;
  assigned_to: string | null;
  conversation_id: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaseRenewalSequence {
  id: string;
  org_id: string;
  lease_id: string;
  tenant_id: string;
  status: RenewalSequenceStatus;
  trigger_date: string;
  step_90_sent_at: string | null;
  step_90_channel: string | null;
  step_60_sent_at: string | null;
  step_60_channel: string | null;
  step_30_sent_at: string | null;
  step_30_channel: string | null;
  renewal_offered_at: string | null;
  renewal_accepted_at: string | null;
  renewal_declined_at: string | null;
  proposed_rent: number | null;
  rent_increase_pct: number | null;
  tenant_response: TenantRenewalResponse;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransaction {
  id: string;
  org_id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string | null;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string | null;
  transaction_date: string;
  period_month: number | null;
  period_year: number | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FinancialKPIs {
  total_revenue_mtd: number;
  total_expenses_mtd: number;
  noi_mtd: number;
  occupancy_rate: number;
  avg_rent_per_unit: number;
  delinquency_rate: number;
}

// ── Phase 3: Acquisitions CRM ──

export type DealPipelineStage = 'lead' | 'contacted' | 'analyzing' | 'offer_sent' | 'negotiating' | 'under_contract' | 'due_diligence' | 'closed' | 'dead';
export type DealPropertyType = 'single_family' | 'multifamily' | 'commercial' | 'mixed_use' | 'land';
export type SellerType = 'motivated' | 'pre_foreclosure' | 'absentee' | 'tax_delinquent' | 'estate' | 'other';
export type DealSource = 'manual' | 'propstream' | 'zillow' | 'mls' | 'wholesaler' | 'driving_for_dollars' | 'referral' | 'direct_mail' | 'other';
export type DealActivityType = 'stage_change' | 'note' | 'call' | 'email' | 'sms' | 'offer' | 'counter_offer' | 'document' | 'inspection' | 'appraisal' | 'ai_analysis';
export type SellerSequenceType = 'cold_outreach' | 'follow_up' | 'offer' | 'negotiation';
export type SellerResponseType = 'interested' | 'not_interested' | 'callback' | 'wrong_number' | 'do_not_contact';

export interface Deal {
  id: string;
  org_id: string;
  property_id: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  property_type: DealPropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  lot_size_sqft: number | null;
  year_built: number | null;
  asking_price: number | null;
  arv: number | null;
  repair_estimate: number | null;
  mao: number | null;
  mao_formula: string;
  offer_price: number | null;
  deal_score: number | null;
  arv_confidence: string | null;
  market_score: number | null;
  risk_score: number | null;
  location_score: number | null;
  condition_score: number | null;
  score_reasoning: string | null;
  pipeline_stage: DealPipelineStage;
  seller_name: string | null;
  seller_phone: string | null;
  seller_email: string | null;
  seller_type: SellerType | null;
  source: DealSource;
  portfolio_impact: string | null;
  notes: string | null;
  photos: string[];
  metadata: Record<string, unknown>;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealComp {
  id: string;
  deal_id: string;
  org_id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  sale_price: number | null;
  sale_date: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  price_per_sqft: number | null;
  distance_miles: number | null;
  source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  org_id: string;
  activity_type: DealActivityType;
  from_stage: string | null;
  to_stage: string | null;
  content: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface SellerSequence {
  id: string;
  org_id: string;
  deal_id: string;
  status: string;
  sequence_type: SellerSequenceType;
  step_1_sent_at: string | null;
  step_2_sent_at: string | null;
  step_3_sent_at: string | null;
  step_4_sent_at: string | null;
  step_5_sent_at: string | null;
  responded_at: string | null;
  response_type: SellerResponseType | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
