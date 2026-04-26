// =============================================================
// Agent Names
// =============================================================

export const AGENT_NAMES = [
  'lead_scraper',
  'company_enricher',
  'contact_finder',
  'email_finder',
  'email_verifier',
  'icp_scorer',
  'research_report_generator',
  'email_copywriter',
  'subject_line_optimizer',
  'follow_up_sequencer',
  'email_blaster',
  'reply_classifier',
  'lead_responder',
  'meeting_booker',
  'campaign_orchestrator',
] as const;

export type AgentName = typeof AGENT_NAMES[number];

// =============================================================
// Table Row Types
// =============================================================

export interface OutreachLead {
  [key: string]: unknown;
  id: string;
  org_id: string;
  campaign_id: string | null;
  company_name: string;
  industry: string;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  unit_count: number | null;
  employee_count: number | null;
  google_rating: number | null;
  review_count: number;
  website_score: number;
  tech_stack: string[];
  pain_signals: Record<string, unknown>;
  services: string[];
  office_locations: number;
  year_founded: number | null;
  has_ai_tools: boolean;
  source: 'google_maps' | 'linkedin' | 'facebook' | 'directory' | 'manual' | 'import' | null;
  source_url: string | null;
  icp_score: number;
  icp_score_reason: string | null;
  status: LeadStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | 'raw' | 'enriched' | 'qualified' | 'contacted' | 'replied'
  | 'meeting_booked' | 'proposal_sent' | 'closed_won' | 'closed_lost'
  | 'archived' | 'disqualified';

export interface OutreachContact {
  [key: string]: unknown;
  id: string;
  org_id: string;
  lead_id: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  email_status: 'unknown' | 'valid' | 'invalid' | 'risky' | 'catch_all';
  email_verified_at: string | null;
  linkedin_url: string | null;
  phone: string | null;
  role_type: 'ceo' | 'vp_ops' | 'regional_manager' | 'property_manager' | 'other' | null;
  status: ContactStatus;
  sequence_step: number;
  next_step_date: string | null;
  next_step_type: string | null;
  created_at: string;
  updated_at: string;
}

export type ContactStatus =
  | 'new' | 'verified' | 'contacted' | 'replied' | 'interested'
  | 'meeting_booked' | 'not_interested' | 'unsubscribed' | 'wrong_person';

export interface OutreachResearchReport {
  [key: string]: unknown;
  id: string;
  org_id: string;
  lead_id: string;
  report_json: Record<string, unknown>;
  report_summary: string | null;
  company_overview: string | null;
  portfolio_analysis: string | null;
  tech_stack_assessment: string | null;
  pain_point_assessment: string | null;
  review_analysis: string | null;
  competitive_landscape: string | null;
  pitch_strategy: string | null;
  primary_hook: string | null;
  secondary_hook: string | null;
  best_contact_id: string | null;
  generated_by: string;
  tokens_used: number;
  cost_usd: number;
  created_at: string;
  updated_at: string;
}

export interface OutreachCampaign {
  [key: string]: unknown;
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  industry_target: string;
  geo_target: string | null;
  target_count: number;
  icp_criteria: Record<string, unknown>;
  status: CampaignStatus;
  total_leads: number;
  qualified_leads: number;
  contacted: number;
  replied: number;
  interested: number;
  meetings_booked: number;
  deals_won: number;
  daily_send_limit: number;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus =
  | 'draft' | 'scraping' | 'enriching' | 'scoring' | 'writing'
  | 'queued' | 'sending' | 'active' | 'paused' | 'completed';

export interface OutreachSend {
  [key: string]: unknown;
  id: string;
  org_id: string;
  campaign_id: string | null;
  contact_id: string;
  lead_id: string | null;
  channel: 'email' | 'sms';
  subject: string | null;
  subject_variant: 'A' | 'B' | 'C' | null;
  body: string | null;
  sequence_step: number;
  sending_account: string | null;
  message_id: string | null;
  thread_id: string | null;
  status: SendStatus;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  bounced_at: string | null;
  open_count: number;
  click_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type SendStatus =
  | 'queued' | 'sending' | 'sent' | 'delivered' | 'opened'
  | 'clicked' | 'replied' | 'bounced' | 'spam' | 'failed';

export interface OutreachReply {
  [key: string]: unknown;
  id: string;
  org_id: string;
  send_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  from_email: string | null;
  subject: string | null;
  body: string | null;
  classification: ReplyClassification | null;
  sentiment_score: number | null;
  objection_type: string | null;
  referred_to_name: string | null;
  referred_to_email: string | null;
  auto_response_sent: boolean;
  auto_response_text: string | null;
  responded_at: string | null;
  created_at: string;
}

export type ReplyClassification =
  | 'interested' | 'objection' | 'question' | 'not_interested'
  | 'unsubscribe' | 'out_of_office' | 'wrong_person' | 'referral';

export interface OutreachSequence {
  [key: string]: unknown;
  id: string;
  org_id: string;
  campaign_id: string | null;
  contact_id: string;
  lead_id: string | null;
  current_step: number;
  max_steps: number;
  last_sent_at: string | null;
  next_send_at: string | null;
  status: 'active' | 'paused' | 'completed' | 'replied' | 'stopped';
  stopped_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachDomain {
  [key: string]: unknown;
  id: string;
  org_id: string;
  email_address: string;
  display_name: string | null;
  daily_limit: number;
  current_daily_count: number;
  warmup_day: number;
  warmup_stage: 'week1' | 'week2' | 'week3' | 'week4' | 'week5' | 'ready';
  bounce_rate: number;
  reputation_score: number;
  oauth_credentials: Record<string, unknown> | null;
  status: 'active' | 'warming' | 'paused' | 'blacklisted';
  last_reset_at: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachSuppression {
  [key: string]: unknown;
  id: string;
  org_id: string;
  email: string;
  reason: string | null;
  added_at: string;
}

export interface OutreachMeeting {
  [key: string]: unknown;
  id: string;
  org_id: string;
  contact_id: string | null;
  lead_id: string | null;
  campaign_id: string | null;
  calendar_event_id: string | null;
  google_meet_link: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  outcome: 'send_proposal' | 'follow_up_later' | 'not_interested' | 'closed_won' | null;
  briefing_text: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachDeal {
  [key: string]: unknown;
  id: string;
  org_id: string;
  contact_id: string | null;
  lead_id: string | null;
  campaign_id: string | null;
  meeting_id: string | null;
  stage: DealStage;
  value_monthly: number | null;
  units: number | null;
  proposal_content: string | null;
  notes: string | null;
  lost_reason: string | null;
  closed_at: string | null;
  next_followup_at: string | null;
  followup_step: number;
  created_at: string;
  updated_at: string;
}

export type DealStage =
  | 'meeting_scheduled' | 'proposal_sent' | 'negotiation'
  | 'closed_won' | 'closed_lost' | 'nurture';

export interface OutreachAgentStatus {
  [key: string]: unknown;
  id: string;
  org_id: string;
  agent_name: AgentName;
  agent_number: number;
  status: 'idle' | 'running' | 'error' | 'disabled';
  current_action: string | null;
  last_run_at: string | null;
  last_error: string | null;
  total_runs: number;
  total_tokens: number;
  total_cost_usd: number;
  runs_today: number;
  tokens_today: number;
  cost_today: number;
  config: Record<string, unknown>;
  updated_at: string;
}

export interface OutreachAgentRun {
  [key: string]: unknown;
  id: string;
  org_id: string;
  agent_name: string;
  campaign_id: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  input_summary: string | null;
  output_summary: string | null;
  tokens_used: number;
  cost_usd: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface OutreachSystemLog {
  [key: string]: unknown;
  id: string;
  org_id: string;
  agent_name: string | null;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OutreachWeeklyReport {
  [key: string]: unknown;
  id: string;
  org_id: string;
  week_start: string;
  week_end: string;
  emails_sent: number;
  open_rate: number;
  reply_rate: number;
  meetings_booked: number;
  pipeline_value: number;
  cost_total: number;
  report_data: Record<string, unknown>;
  ai_analysis: string | null;
  recommendations: unknown[];
  auto_adjustments: Record<string, unknown>;
  created_at: string;
}

// =============================================================
// Agent Types
// =============================================================

export interface AgentRunResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  tokensUsed?: number;
  costUsd?: number;
}

export interface AgentInput {
  [key: string]: unknown;
}

// =============================================================
// ICP Scoring
// =============================================================

export interface IcpCriteria {
  min_units: number;
  max_units: number;
  target_states: string[];
  target_pms_software: string[];
  disqualify_under_units: number;
  weights: {
    unit_count: number;
    tech_stack: number;
    hiring_signals: number;
    bad_reviews: number;
    multi_location: number;
    no_ai_tools: number;
    decision_maker_found: number;
    email_verified: number;
    growth_signals: number;
  };
}

export const DEFAULT_ICP_CRITERIA: IcpCriteria = {
  min_units: 200,
  max_units: 10000,
  target_states: ['FL', 'TX', 'AZ', 'CA', 'GA', 'NC', 'TN', 'CO', 'OH', 'PA'],
  target_pms_software: ['appfolio', 'buildium', 'yardi', 'realpage', 'entrata'],
  disqualify_under_units: 200,
  weights: {
    unit_count: 30,
    tech_stack: 15,
    hiring_signals: 15,
    bad_reviews: 10,
    multi_location: 10,
    no_ai_tools: 10,
    decision_maker_found: 5,
    email_verified: 5,
    growth_signals: 10,
  },
};

// =============================================================
// Email Templates
// =============================================================

export interface EmailTemplate {
  subject: string;
  body: string;
  variant: 'A' | 'B' | 'C';
}

export interface SequenceStep {
  step: number;
  delay_days: number;
  angle: string;
  max_words: number;
}

export const FOLLOW_UP_STEPS: SequenceStep[] = [
  { step: 1, delay_days: 0, angle: 'initial', max_words: 150 },
  { step: 2, delay_days: 3, angle: 'different_pain_point', max_words: 80 },
  { step: 3, delay_days: 6, angle: 'case_study', max_words: 100 },
  { step: 4, delay_days: 9, angle: 'industry_stat', max_words: 80 },
  { step: 5, delay_days: 12, angle: 'direct_ask', max_words: 60 },
  { step: 6, delay_days: 14, angle: 'breakup', max_words: 60 },
];

// =============================================================
// Objection Rebuttals
// =============================================================

export const OBJECTION_REBUTTALS: Record<string, string> = {
  'already_use_appfolio': 'We integrate on top. AI handles what they don\'t — 90-sec leasing response, 24/7 voice, auto-dispatch.',
  'too_expensive': 'One prevented vacancy pays for 6 months. At $10/unit you\'re spending less than a part-time coordinator.',
  'dont_trust_ai': 'Fair Housing compliant. 97% resolution rate. One-click staff takeover on any conversation.',
  'no_time': 'We do the entire setup. Live in 48 hours. Zero disruption to your team.',
  'current_system_works': 'How fast do you respond to leasing inquiries right now? Our clients went from 4 hours to 90 seconds.',
  'need_to_think': 'Totally understand. I\'ll send over a custom ROI breakdown for your company so you have hard numbers to think with.',
};
