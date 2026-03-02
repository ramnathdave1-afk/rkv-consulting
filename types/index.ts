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
  insurance_annual: number | null;
  insurance_expiry: string | null;
  tax_annual: number | null;
  hoa_monthly: number | null;
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
  status: 'lead' | 'analyzing' | 'reviewing' | 'offer_sent' | 'under_contract' | 'due_diligence' | 'closed' | 'dead';
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
  amount_due: number;
  amount_paid: number;
  due_date: string; // date
  paid_date: string | null; // date
  status: 'pending' | 'paid' | 'late' | 'partial' | 'waived';
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'online' | 'other' | null;
  late_fee_charged: number | null;
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

// ============================================================================
// Property Analyzer Types (ported from property-analyzer/lib/types.ts)
// ============================================================================

export interface PropertyAnalyzerInputs {
  purchasePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  monthlyRent: number;
  vacancyRate: number;
  annualRentGrowth: number;
  propertyTax: number;
  insurance: number;
  maintenance: number;
  hoa: number;
  propertyManagementPercent: number;
  closingCostsPercent: number;
  annualAppreciationRate: number;
  annualExpenseGrowthRate: number;
}

export interface AnalyzerAmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
}

export interface AnalyzerAnnualProjection {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  grossRent: number;
  effectiveRent: number;
  totalExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  cashOnCash: number;
  capRate: number;
  cumulativeCashFlow: number;
  totalReturn: number;
  totalROI: number;
  principalPaid: number;
  interestPaid: number;
  appreciation: number;
}

export interface AnalyzerMonthlyCashFlow {
  month: number;
  year: number;
  grossRent: number;
  vacancyLoss: number;
  effectiveRent: number;
  propertyTax: number;
  insurance: number;
  maintenance: number;
  hoa: number;
  managementFee: number;
  totalExpenses: number;
  noi: number;
  mortgagePayment: number;
  cashFlow: number;
}

export interface AnalyzerDealMetrics {
  loanAmount: number;
  downPayment: number;
  closingCosts: number;
  totalCashInvested: number;
  monthlyMortgagePayment: number;
  monthlyGrossRent: number;
  monthlyEffectiveRent: number;
  annualGrossRent: number;
  annualEffectiveRent: number;
  monthlyExpenses: number;
  annualExpenses: number;
  monthlyNOI: number;
  annualNOI: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  capRate: number;
  cashOnCash: number;
  grossRentMultiplier: number;
  dscr: number;
  onePercentRule: boolean;
  twoPercentRule: boolean;
  onePercentRatio: number;
  irr5Year: number;
  irr10Year: number;
  breakEvenMonths: number;
  dealScore: number;
  dealRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  amortizationSchedule: AnalyzerAmortizationRow[];
  annualProjections: AnalyzerAnnualProjection[];
  monthlyCashFlows: AnalyzerMonthlyCashFlow[];
  totalInterestPaid: number;
  totalPrincipalPaid10Year: number;
  totalAppreciation10Year: number;
  equityYear10: number;
  propertyValueYear10: number;
}

export interface AnalyzerSensitivityResult {
  scenario: string;
  monthlyCashFlow: number;
  annualCashFlow: number;
  cashOnCash: number;
  capRate: number;
  dscr: number;
  dealScore: number;
  change: number;
}

export interface AnalyzerCompareProperty {
  name: string;
  inputs: PropertyAnalyzerInputs;
  metrics: AnalyzerDealMetrics;
}

// ============================================================================
// Heat Map / Market Intelligence Types (ported from az-heatmap/lib/types.ts)
// ============================================================================

export type HeatMapMetricKey =
  | 'medianPrice'
  | 'pricePerSqft'
  | 'daysOnMarket'
  | 'activeInventory'
  | 'monthsOfSupply'
  | 'yoyChange'
  | 'medianRent'
  | 'populationGrowth';

export type HeatMapPropertyType = 'all' | 'single_family' | 'condo' | 'townhouse' | 'multi_family';

export interface HeatMapMonthlyTrend {
  month: string;
  medianPrice: number;
  pricePerSqft: number;
  daysOnMarket: number;
  activeInventory: number;
  medianRent: number;
}

export interface HeatMapCityMarketData {
  id: string;
  name: string;
  state: string;
  center: [number, number];
  population: number;
  medianHouseholdIncome: number;
  populationGrowth: number;
  investmentScore?: number;
  byType: Record<HeatMapPropertyType, {
    medianPrice: number;
    pricePerSqft: number;
    daysOnMarket: number;
    activeInventory: number;
    monthsOfSupply: number;
    yoyChange: number;
    medianRent: number;
  }>;
  trends: HeatMapMonthlyTrend[];
  lastUpdated?: string;
}

export interface HeatMapMetricConfig {
  key: HeatMapMetricKey;
  label: string;
  shortLabel: string;
  format: (v: number) => string;
  colorScale: 'price' | 'speed' | 'inventory' | 'diverging';
  description: string;
  unit: string;
}

// ============================================================================
// Tax & Accounting Types
// ============================================================================

export interface TaxReportData {
  propertyName: string;
  propertyAddress?: string;
  year: number;
  grossIncome: number;
  deductions: { label: string; amount: number; scheduleELine?: string }[];
  totalDeductions: number;
  netTaxableIncome: number;
  depreciation?: {
    depreciableBasis: number;
    annualDepreciation: number;
    accumulatedDepreciation: number;
    remainingBasis: number;
  };
  capitalExpenses?: { description: string; amount: number }[];
  comparison?: {
    prevYear: number;
    prevIncome: number;
    prevDeductions: number;
    prevNet: number;
  };
}

export interface ScheduleEData {
  propertyId: string;
  propertyAddress: string;
  year: number;
  rentsReceived: number;
  advertising: number;
  autoAndTravel: number;
  cleaning: number;
  commissions: number;
  insurance: number;
  legal: number;
  management: number;
  mortgageInterest: number;
  otherInterest: number;
  repairs: number;
  supplies: number;
  taxes: number;
  utilities: number;
  depreciation: number;
  other: number;
  totalExpenses: number;
  netIncome: number;
}

export interface DepreciationEntry {
  propertyId: string;
  propertyAddress: string;
  purchasePrice: number;
  landValue: number;
  depreciableBasis: number;
  depreciationStartDate: string;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  remainingBasis: number;
  yearsRemaining: number;
}

export interface MileageLogEntry {
  id: string;
  date: string;
  propertyId: string;
  propertyAddress: string;
  purpose: string;
  miles: number;
  deduction: number;
}

export interface Exchange1031 {
  id: string;
  soldPropertyId: string;
  soldPropertyAddress: string;
  saleDate: string;
  salePrice: number;
  identificationDeadline: string; // 45 days
  closingDeadline: string; // 180 days
  identifiedProperties: string[];
  replacementPropertyId?: string;
  status: 'identifying' | 'under_contract' | 'completed' | 'failed';
}

// ============================================================================
// Agent & Automation Types
// ============================================================================

export interface AgentSequence {
  id: string;
  userId: string;
  name: string;
  type: 'rent_reminder' | 'lease_renewal' | 'welcome' | 'maintenance_followup' | 'moveout' | 'seasonal';
  agentType: 'email' | 'voice' | 'sms';
  enabled: boolean;
  steps: AgentSequenceStep[];
  createdAt: string;
}

export interface AgentSequenceStep {
  dayOffset: number;
  subject?: string;
  template: string;
  tone: 'friendly' | 'professional' | 'firm';
  variables: string[];
}

export interface VoiceConfig {
  voiceId: string;
  voiceName: string;
  speed: number;
  tone: 'professional' | 'friendly' | 'firm';
}

export interface SMSThread {
  tenantId: string;
  tenantName: string;
  propertyAddress: string;
  messages: SMSMessage[];
  unreadCount: number;
  lastMessageAt: string;
}

export interface SMSMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  sender: 'tenant' | 'agent' | 'investor';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

// ============================================================================
// Screening Application Types
// ============================================================================

export interface ScreeningApplication {
  id: string;
  token: string;
  propertyId: string;
  propertyAddress: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  dateOfBirth?: string;
  currentAddress?: string;
  currentLandlord?: string;
  currentLandlordPhone?: string;
  employer?: string;
  monthlyIncome?: number;
  moveInDate?: string;
  numberOfOccupants?: number;
  pets?: boolean;
  petDetails?: string;
  consentBackgroundCheck: boolean;
  consentCreditCheck: boolean;
  status: 'pending' | 'submitted' | 'screening' | 'completed' | 'expired';
  result?: ScreeningResult;
  createdAt: string;
  expiresAt: string;
}

// ============================================================================
// Contractor & Maintenance Types
// ============================================================================

export interface ContractorMatch {
  contractor: Contractor;
  compositeScore: number;
  qualityScore: number;
  priceFairnessScore: number;
  reliabilityScore: number;
  responsivenessScore: number;
  googleRating?: number;
  googleReviewCount?: number;
  priceRange: { min: number; max: number };
  licenseVerified: boolean;
  licenseExpiry?: string;
  insuranceVerified: boolean;
  insuranceExpiry?: string;
  aiReviewSummary?: string;
  pros: string[];
  cons: string[];
}

export interface ContractorBid {
  id: string;
  maintenanceRequestId: string;
  contractorId: string;
  contractorName: string;
  price: number;
  timeline: string;
  warranty?: string;
  notes?: string;
  status: 'requested' | 'submitted' | 'accepted' | 'rejected';
  submittedAt?: string;
}

export interface PreventiveSchedule {
  id: string;
  propertyId: string;
  taskType: 'hvac_service' | 'gutter_cleaning' | 'fire_detector' | 'water_heater' | 'roof_inspection' | 'pest_inspection';
  frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  lastCompleted?: string;
  nextDue: string;
  autoSchedule: boolean;
  preferredContractorId?: string;
}

// ============================================================================
// Financing & Exit Strategy Types
// ============================================================================

export interface LoanComparison {
  type: 'conventional_30' | 'conventional_15' | 'dscr' | 'hard_money' | 'portfolio';
  label: string;
  rate: number;
  monthlyPayment: number;
  totalInterest: number;
  downPaymentPercent: number;
  requirements: string[];
  pros: string[];
  cons: string[];
}

export interface ExitStrategy {
  scenario: 'sell_now' | 'hold_1yr' | 'hold_3yr' | 'hold_5yr' | '1031_exchange';
  label: string;
  estimatedSalePrice: number;
  agentFees: number;
  closingCosts: number;
  depreciationRecapture: number;
  capitalGainsTax: number;
  netProceeds: number;
  totalReturn: number;
  annualizedReturn: number;
}

// ============================================================================
// Insurance & Zoning Types
// ============================================================================

export interface InsurancePolicy {
  id: string;
  propertyId: string;
  type: 'landlord' | 'umbrella' | 'flood' | 'earthquake';
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  premium: number;
  deductible: number;
  expiryDate: string;
  autoRenew: boolean;
}

export interface ZoningData {
  zoningCode: string;
  zoningDescription: string;
  strAllowed: boolean | 'restricted';
  strRestrictions?: string;
  rentControlApplies: boolean;
  rentControlDetails?: string;
  aduAllowed: boolean;
  aduRequirements?: string;
  floodZone: string;
  floodZoneRisk: 'minimal' | 'moderate' | 'high';
  opportunityZone: boolean;
  historicDistrict: boolean;
  historicRestrictions?: string;
  permitRequirements?: string[];
}

// ============================================================================
// Referral & Onboarding Types
// ============================================================================

export interface ReferralInfo {
  code: string;
  link: string;
  referredCount: number;
  totalEarnings: number;
  pendingEarnings: number;
  referrals: {
    email: string;
    signupDate: string;
    firstPaymentDate?: string;
    creditEarned: number;
  }[];
}

export interface OnboardingProgress {
  currentStep: number;
  investorType?: 'beginner' | 'intermediate' | 'experienced';
  portfolioSize?: '0' | '1-5' | '6-20' | '20+';
  primaryStrategy?: 'buy_and_hold' | 'flip' | 'brrrr' | 'str' | 'wholesale' | 'mixed';
  firstPropertyAdded: boolean;
  dataConnected: boolean;
  completed: boolean;
}

// ============================================================================
// Webhook & Automation Types (Phase 8)
// ============================================================================

/** Supported webhook event types */
export type WebhookEventType =
  | 'rent_received'
  | 'maintenance_created'
  | 'tenant_added'
  | 'deal_saved'
  | 'lease_expiring'
  | 'agent_action';

/** User's webhook configuration (Zapier / custom integrations) */
export interface WebhookConfig {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  webhook_url: string;
  events_enabled: WebhookEventType[];
  active: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Log entry for a fired webhook */
export interface WebhookLog {
  id: string; // uuid
  user_id: string; // uuid, references profiles.id
  event_type: string;
  payload: Record<string, unknown>; // jsonb
  response_status: number | null;
  response_body: string | null;
  error: string | null;
  created_at: string; // timestamptz
}

// ============================================================================
// Calendar Event Types
// ============================================================================

export type CalendarEventType =
  | 'rent_due'
  | 'lease_expiry'
  | 'maintenance'
  | 'mortgage'
  | 'tax_deadline'
  | 'deal_closing'
  | 'insurance_renewal'
  | 'meeting'
  | 'call'
  | 'showing'
  | 'inspection'
  | 'deadline'
  | 'anniversary'
  | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  type: CalendarEventType;
  color: string;
  propertyId?: string;
  propertyAddress?: string;
  tenantId?: string;
  tenantName?: string;
  amount?: number;
  notes?: string;
  source: 'auto' | 'manual';
}

// ============================================================================
// Contact CRM Types
// ============================================================================

export type ContactType =
  | 'private_lender'
  | 'real_estate_agent'
  | 'contractor'
  | 'wholesaler'
  | 'attorney'
  | 'cpa'
  | 'property_manager'
  | 'partner_jv'
  | 'other';

export interface CRMContact {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  type: ContactType;
  relationship_score: number; // 1-10
  last_contacted: string | null; // date
  birthday: string | null; // date
  preferred_contact_method: 'email' | 'phone' | 'text' | 'in_person' | null;
  notes: string | null;
  metadata: Record<string, unknown> | null; // jsonb for type-specific fields
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Automation Types
// ============================================================================

export type AutomationType =
  | 'rent_collection'
  | 'lease_renewal'
  | 'new_tenant_welcome'
  | 'maintenance_response'
  | 'vacancy_marketing'
  | 'market_monitoring'
  | 'tax_tracking'
  | 'insurance_monitoring'
  | 'contractor_followup';

export interface AutomationConfig {
  id: string;
  user_id: string;
  type: AutomationType;
  enabled: boolean;
  last_triggered: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CustomWorkflow {
  id: string;
  user_id: string;
  name: string;
  trigger: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: string;
}

export interface WorkflowAction {
  type: 'send_email' | 'make_call' | 'send_sms' | 'create_task' | 'send_notification' | 'add_note' | 'update_status' | 'wait';
  config: Record<string, unknown>;
  delay_days?: number;
}

export interface AutomationLog {
  id: string;
  user_id: string;
  automation_type: string;
  action: string;
  affected_entity: string;
  property_address: string | null;
  outcome: 'success' | 'failed' | 'pending';
  created_at: string;
}

// ============================================================================
// Vacancy Marketing Types
// ============================================================================

export interface VacancyListing {
  id: string;
  property_id: string;
  title: string;
  description: string;
  highlights: string[];
  rental_terms: {
    price: number;
    deposit: number;
    lease_length: string;
    pet_policy: string;
  };
  platforms: {
    zillow: boolean;
    facebook: boolean;
    apartments_com: boolean;
    craigslist: boolean;
  };
  status: 'draft' | 'published' | 'archived';
  created_at: string;
}

export interface VacancyInquiry {
  id: string;
  property_id: string;
  prospect_name: string;
  prospect_email: string;
  prospect_phone: string | null;
  message: string;
  source: 'zillow' | 'facebook' | 'apartments_com' | 'craigslist' | 'direct';
  interest_score: 'high' | 'medium' | 'low';
  status: 'new' | 'contacted' | 'showing_scheduled' | 'application_sent' | 'closed';
  created_at: string;
}

export interface ShowingAppointment {
  id: string;
  property_id: string;
  prospect_name: string;
  prospect_email: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'canceled';
  notes: string | null;
}

// ============================================================================
// Beginner Mode Types
// ============================================================================

export type ExperienceMode = 'guided' | 'standard' | 'pro';

export interface InvestmentIQScore {
  overall: number;
  grade: string;
  cashFlowHealth: number;
  portfolioDiversification: number;
  equityGrowth: number;
  riskManagement: number;
  taxEfficiency: number;
  marketStrength: number;
}

export interface AIConciergerSuggestion {
  id: string;
  type: 'lease_expiry' | 'overdue_maintenance' | 'rent_overdue' | 'deal_stale' | 'portfolio_tip';
  headline: string;
  context: string;
  actionLabel: string;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// Deal Feed Types
// ============================================================================

export type DealFeedSource = 'wholesale' | 'mls' | 'foreclosure' | 'fsbo' | 'auction';

export interface FeedDeal {
  id: string;
  user_id: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  asking_price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  year_built: number | null;
  lot_size: number | null;
  source: DealFeedSource;
  source_id: string | null;
  image_url: string | null;
  days_on_market: number | null;
  arv_estimate: number | null;
  rent_estimate: number | null;
  cap_rate_estimate: number | null;
  ai_score: number | null;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface BuyBox {
  id: string;
  user_id: string;
  markets: string[];
  property_types: string[];
  price_min: number;
  price_max: number;
  min_bedrooms: number;
  min_cap_rate: number;
  sources: DealFeedSource[];
  created_at: string;
  updated_at: string;
}

export interface WholesaleSubmission {
  id: string;
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  asking_price: number;
  arv: number | null;
  repair_estimate: number | null;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  description: string | null;
  photos: string[];
  ai_score: number | null;
  status: 'pending' | 'approved' | 'rejected';
  views: number;
  saves: number;
  analysis_runs: number;
  created_at: string;
}

/** Rent status entry for a tenant in the current month */
export interface RentStatus {
  tenant_id: string;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  property_id: string;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  paid_date: string | null;
  late_fee_charged: number;
  status: 'paid' | 'partial' | 'overdue' | 'pending';
}

/** Lease renewal queue item */
export interface LeaseRenewalItem {
  tenant_id: string;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  property_id: string;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  property_type: string | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number;
  security_deposit: number | null;
  days_remaining: number;
}

/** Lease renewal action types */
export type LeaseRenewalAction = 'send_renewal' | 'send_reminder' | 'mark_renewed';
