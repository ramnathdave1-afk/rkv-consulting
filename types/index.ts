// ============================================================================
// RKV Consulting - TypeScript Type Definitions
// Complete interfaces for all Supabase database tables and app types
// ============================================================================

// ---------------------------------------------------------------------------
// Plan & Feature Types
// ---------------------------------------------------------------------------

export type PlanName = 'basic' | 'pro' | 'elite';

export type FeatureKey =
  | 'deal_analyzer'
  | 'property_management'
  | 'tenant_screening'
  | 'market_intelligence'
  | 'ai_assistant'
  | 'document_storage'
  | 'email_campaigns'
  | 'sms_messaging'
  | 'portfolio_analytics'
  | 'rent_collection'
  | 'maintenance_tracking'
  | 'contractor_management'
  | 'deal_pipeline'
  | 'export_reports'
  | 'api_access'
  | 'white_label'
  | 'priority_support'
  | 'unlimited_properties'
  | 'unlimited_ai_queries'
  | 'custom_branding';

// ---------------------------------------------------------------------------
// Database Table Interfaces
// ---------------------------------------------------------------------------

/** User profile linked to Supabase Auth */
export interface Profile {
  id: string; // uuid, references auth.users
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  company: string | null;
  role: 'investor' | 'property_manager' | 'agent' | 'admin';
  onboarding_completed: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Stripe subscription tied to a user profile */
export interface Subscription {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: PlanName;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  current_period_start: string | null; // timestamptz
  current_period_end: string | null; // timestamptz
  cancel_at_period_end: boolean;
  trial_end: string | null; // timestamptz
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Real estate property record */
export interface Property {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  property_type: 'single_family' | 'multi_family' | 'condo' | 'townhouse' | 'commercial' | 'land' | 'mixed_use';
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  lot_size: number | null;
  year_built: number | null;
  purchase_price: number | null;
  purchase_date: string | null; // date
  current_value: number | null;
  monthly_rent: number | null;
  monthly_expenses: number | null;
  mortgage_balance: number | null;
  mortgage_rate: number | null;
  mortgage_payment: number | null;
  insurance: number | null;
  property_tax: number | null;
  hoa_fees: number | null;
  vacancy_rate: number | null;
  status: 'active' | 'vacant' | 'under_renovation' | 'listed_for_sale' | 'sold' | 'pending';
  notes: string | null;
  image_url: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Tenant associated with a property */
export interface Tenant {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  property_id: string; // uuid, references properties.id
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  lease_start: string | null; // date
  lease_end: string | null; // date
  monthly_rent: number;
  security_deposit: number | null;
  status: 'active' | 'pending' | 'past' | 'eviction';
  screening_status: 'not_started' | 'pending' | 'approved' | 'denied';
  screening_data: ScreeningResult | null; // jsonb
  notes: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Deal in the investment pipeline */
export interface Deal {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: 'single_family' | 'multi_family' | 'condo' | 'townhouse' | 'commercial' | 'land' | 'mixed_use';
  asking_price: number;
  offer_price: number | null;
  arv: number | null; // after repair value
  repair_cost: number | null;
  monthly_rent_estimate: number | null;
  stage: 'lead' | 'analyzing' | 'offer_sent' | 'under_contract' | 'due_diligence' | 'closed' | 'dead';
  priority: 'low' | 'medium' | 'high';
  source: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  analysis: DealAnalysisResult | null; // jsonb
  notes: string | null;
  image_url: string | null;
  close_date: string | null; // date
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Financial transaction (income or expense) */
export interface Transaction {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  property_id: string | null; // uuid, references properties.id
  tenant_id: string | null; // uuid, references tenants.id
  type: 'income' | 'expense';
  category: string; // e.g., 'rent', 'repair', 'insurance', 'tax', 'management_fee', 'utility', 'other'
  amount: number;
  description: string | null;
  date: string; // date
  recurring: boolean;
  recurring_frequency: 'monthly' | 'quarterly' | 'annually' | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Rent payment record */
export interface RentPayment {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  tenant_id: string; // uuid, references tenants.id
  property_id: string; // uuid, references properties.id
  amount: number;
  due_date: string; // date
  paid_date: string | null; // date
  status: 'pending' | 'paid' | 'late' | 'partial' | 'waived';
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'online' | 'other' | null;
  late_fee: number | null;
  notes: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Maintenance request for a property */
export interface MaintenanceRequest {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  property_id: string; // uuid, references properties.id
  tenant_id: string | null; // uuid, references tenants.id
  contractor_id: string | null; // uuid, references contractors.id
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest_control' | 'landscaping' | 'general' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'awaiting_parts' | 'scheduled' | 'completed' | 'canceled';
  estimated_cost: number | null;
  actual_cost: number | null;
  scheduled_date: string | null; // date
  completed_date: string | null; // date
  images: string[] | null; // text array of URLs
  notes: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Contractor for maintenance and repair work */
export interface Contractor {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  specialty: string; // e.g., 'plumbing', 'electrical', 'general', 'hvac'
  rating: number | null; // 1-5
  hourly_rate: number | null;
  notes: string | null;
  is_preferred: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Log entry for AI agent actions */
export interface AgentLog {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  agent_type: 'deal_analyzer' | 'market_intel' | 'tenant_screener' | 'portfolio_optimizer' | 'assistant';
  action: string;
  input: Record<string, unknown> | null; // jsonb
  output: Record<string, unknown> | null; // jsonb
  tokens_used: number | null;
  duration_ms: number | null;
  status: 'success' | 'error' | 'pending';
  error_message: string | null;
  created_at: string; // timestamptz
}

/** Uploaded document associated with a property or deal */
export interface Document {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  property_id: string | null; // uuid, references properties.id
  deal_id: string | null; // uuid, references deals.id
  tenant_id: string | null; // uuid, references tenants.id
  name: string;
  file_url: string;
  file_type: string; // mime type
  file_size: number; // bytes
  category: 'lease' | 'inspection' | 'insurance' | 'tax' | 'receipt' | 'contract' | 'photo' | 'report' | 'other';
  notes: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** User notification */
export interface Notification {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'rent_due' | 'maintenance' | 'lease_expiring' | 'deal_update' | 'ai_insight';
  read: boolean;
  action_url: string | null;
  metadata: Record<string, unknown> | null; // jsonb
  created_at: string; // timestamptz
}

/** Market a user is actively tracking */
export interface WatchedMarket {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  city: string;
  state: string;
  zip: string | null;
  county: string | null;
  metrics: MarketData | null; // jsonb - cached market data
  last_refreshed: string | null; // timestamptz
  alert_on_change: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** AI chat conversation thread */
export interface AIConversation {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  title: string;
  agent_type: 'deal_analyzer' | 'market_intel' | 'tenant_screener' | 'portfolio_optimizer' | 'assistant';
  messages: AIMessage[]; // jsonb array
  context: Record<string, unknown> | null; // jsonb - additional context (property_id, deal_id, etc.)
  pinned: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** AI usage tracking for billing/limits */
export interface AIUsage {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  period_start: string; // date
  period_end: string; // date
  queries_used: number;
  queries_limit: number;
  tokens_used: number;
  tokens_limit: number;
  cost_usd: number;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

// ---------------------------------------------------------------------------
// App-Specific Interfaces (non-table)
// ---------------------------------------------------------------------------

/** Result of an AI deal analysis */
export interface DealAnalysisResult {
  // Purchase metrics
  purchase_price: number;
  closing_costs: number;
  repair_costs: number;
  total_investment: number;

  // Income projections
  monthly_rent: number;
  annual_gross_income: number;
  vacancy_loss: number;
  effective_gross_income: number;

  // Expense breakdown
  property_tax: number;
  insurance: number;
  maintenance: number;
  management_fee: number;
  hoa: number;
  utilities: number;
  total_operating_expenses: number;

  // Key metrics
  noi: number; // net operating income
  cap_rate: number;
  cash_on_cash_return: number;
  gross_rent_multiplier: number;
  debt_service_coverage_ratio: number;
  monthly_cash_flow: number;
  annual_cash_flow: number;

  // Financing
  loan_amount: number;
  down_payment: number;
  interest_rate: number;
  loan_term: number;
  monthly_mortgage: number;

  // Valuation
  arv: number; // after repair value
  equity_at_purchase: number;
  appreciation_rate: number;

  // AI assessment
  score: number; // 0-100
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'pass' | 'strong_pass';
  risks: string[];
  opportunities: string[];
  summary: string;

  // Scenarios
  scenarios: {
    conservative: DealScenario;
    base: DealScenario;
    aggressive: DealScenario;
  };
}

/** Projection scenario for a deal (conservative, base, aggressive) */
export interface DealScenario {
  label: 'conservative' | 'base' | 'aggressive';
  vacancy_rate: number;
  rent_growth_rate: number;
  expense_growth_rate: number;
  appreciation_rate: number;
  monthly_rent: number;
  monthly_cash_flow: number;
  annual_cash_flow: number;
  cap_rate: number;
  cash_on_cash_return: number;
  five_year_equity: number;
  five_year_total_return: number;
  ten_year_equity: number;
  ten_year_total_return: number;
  irr: number; // internal rate of return
}

/** Market data for a geographic area */
export interface MarketData {
  // Location
  city: string;
  state: string;
  zip: string | null;
  county: string | null;

  // Pricing
  median_home_price: number | null;
  median_price_per_sqft: number | null;
  median_rent: number | null;
  rent_to_price_ratio: number | null;
  price_change_yoy: number | null; // year over year %

  // Rent metrics
  average_rent_1br: number | null;
  average_rent_2br: number | null;
  average_rent_3br: number | null;
  rent_change_yoy: number | null;

  // Inventory & activity
  active_listings: number | null;
  days_on_market: number | null;
  months_of_supply: number | null;
  sold_last_30_days: number | null;
  new_listings_last_30_days: number | null;

  // Demographics & economy
  population: number | null;
  population_growth: number | null;
  median_household_income: number | null;
  unemployment_rate: number | null;
  job_growth_rate: number | null;

  // Investment indicators
  cap_rate_estimate: number | null;
  cash_on_cash_estimate: number | null;
  vacancy_rate: number | null;
  walkability_score: number | null;
  crime_index: number | null;
  school_rating: number | null;

  // Metadata
  data_source: string;
  last_updated: string; // timestamptz
}

/** Tenant screening result from AI analysis */
export interface ScreeningResult {
  // Applicant info
  applicant_name: string;
  application_date: string;

  // Credit
  credit_score: number | null;
  credit_grade: 'excellent' | 'good' | 'fair' | 'poor' | null;
  credit_flags: string[];

  // Income
  monthly_income: number | null;
  income_to_rent_ratio: number | null;
  employment_verified: boolean;
  employer: string | null;

  // History
  eviction_history: boolean;
  criminal_background: boolean;
  prior_landlord_references: number;
  rental_history_years: number | null;

  // AI assessment
  overall_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high';
  recommendation: 'approve' | 'approve_with_conditions' | 'deny';
  conditions: string[];
  flags: string[];
  summary: string;
}

/** Single message in an AI conversation */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO 8601
}
