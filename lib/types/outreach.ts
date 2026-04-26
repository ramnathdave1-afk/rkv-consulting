// ═══════════════════════════════════════════════════════════════
// Outreach System TypeScript Types
// Matches: supabase/migrations/20260413_outreach_system.sql
// ═══════════════════════════════════════════════════════════════

// ── Type Unions ──

export type LeadSource = 'apollo' | 'google_maps' | 'narpm' | 'csv_import' | 'referral' | 'manual';

export type LeadStatus =
  | 'new'
  | 'in_sequence'
  | 'replied'
  | 'interested'
  | 'booked'
  | 'closed'
  | 'lost'
  | 'unsubscribed'
  | 'bounced';

export type OutreachPipelineStage =
  | 'lead'
  | 'contacted'
  | 'replied'
  | 'call_booked'
  | 'demo_done'
  | 'pilot'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export type LeadTemperature = 'hot' | 'warm' | 'cold';

export type SequenceType = 'initial' | 're_engagement';

export type EmailStatus =
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'replied'
  | 'bounced'
  | 'failed';

export type ReplyClassification =
  | 'interested'
  | 'not_interested'
  | 'ooo'
  | 'unsubscribe'
  | 'question'
  | 'referral'
  | 'angry';

export type ReplyUrgency = 'high' | 'medium' | 'low';

export type TaskType =
  | 'follow_up_call'
  | 'send_proposal'
  | 'follow_up_email'
  | 'reschedule'
  | 'review_referral'
  | 'post_demo'
  | 'custom';

export type TaskPriority = 'urgent' | 'normal' | 'low';

export type TaskStatus = 'pending' | 'completed' | 'skipped' | 'overdue';

export type TaskCreatedBy = 'system' | 'manual';

export type CallOutcome = 'showed_up' | 'no_show' | 'rescheduled' | 'cancelled';

export type InterestLevel = 'very_interested' | 'interested' | 'lukewarm' | 'not_interested';

export type SuppressionReason =
  | 'hard_bounce'
  | 'unsubscribe'
  | 'spam_complaint'
  | 'manual'
  | 'competitor';

export type HygieneAction =
  | 'duplicate_merged'
  | 'dead_removed'
  | 'bounce_suppressed'
  | 'dedup_flagged'
  | 'archived';

// ── Helper Interfaces ──

export interface SequenceStep {
  step_number: number;
  delay_days: number;
  subject_template: string;
  body_template: string;
  variant?: string;
}

export interface LeadScoreComponents {
  unit_count_score: number;
  title_score: number;
  engagement_score: number;
  recency_score: number;
  company_fit_score: number;
  total: number;
}

export interface ReplyAnalysis {
  classification: ReplyClassification;
  confidence: number;
  sentiment_score: number;
  urgency: ReplyUrgency;
  pain_points: string[];
  objections: string[];
  questions: string[];
  buying_signals: string[];
  next_step_suggestion: string;
  suggested_response: string;
  referred_person: ReferredPerson | null;
}

export interface ReferredPerson {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  notes?: string;
}

export interface DailyDigestData {
  date: string;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  positive_replies: number;
  calls_booked: number;
  open_rate: number;
  reply_rate: number;
  positive_reply_rate: number;
  top_performing_sequence: string | null;
  hot_leads: OutreachLead[];
  pending_tasks: OutreachTask[];
  unhandled_replies: OutreachReply[];
}

export interface RevenueForcastData {
  period: string;
  pipeline_stages: {
    stage: OutreachPipelineStage;
    count: number;
    total_deal_value: number;
    weighted_value: number;
    conversion_probability: number;
  }[];
  total_pipeline_value: number;
  weighted_forecast: number;
  avg_deal_size: number;
  avg_days_to_close: number;
  projected_monthly_revenue: number;
}

// ── Table Interfaces ──

export interface OutreachLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  email_verified: boolean;
  company_name: string | null;
  company_website: string | null;
  title: string | null;
  unit_count: number | null;
  current_software: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  linkedin_url: string | null;
  source: LeadSource;
  personalization_data: Record<string, unknown>;
  ai_first_line: string | null;
  status: LeadStatus;
  pipeline_stage: OutreachPipelineStage;
  assigned_sequence_id: string | null;
  current_step: number;
  next_send_at: Date | string | null;
  last_contacted_at: Date | string | null;
  sending_account_id: string | null;
  notes: string | null;
  deal_value: number;
  lead_score: number;
  lead_temperature: LeadTemperature;
  competitor_software: string | null;
  re_engagement_count: number;
  last_re_engagement_at: Date | string | null;
  archived_at: Date | string | null;
  archived_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface OutreachSequence {
  id: string;
  name: string;
  description: string | null;
  type: SequenceType;
  is_active: boolean;
  steps: SequenceStep[];
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_booked: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface OutreachEmail {
  id: string;
  lead_id: string | null;
  sequence_id: string | null;
  step_number: number | null;
  sending_account_id: string | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  status: EmailStatus;
  opened_at: Date | string | null;
  replied_at: Date | string | null;
  reply_text: string | null;
  reply_classification: ReplyClassification | null;
  message_id: string | null;
  thread_id: string | null;
  sent_at: Date | string | null;
  scheduled_for: Date | string | null;
  created_at: Date | string;
}

export interface OutreachSendingAccount {
  id: string;
  email: string;
  display_name: string | null;
  domain: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string | null;
  smtp_password_encrypted: string | null;
  oauth_refresh_token: string | null;
  daily_send_limit: number;
  sent_today: number;
  sent_today_reset_at: Date | string;
  is_warmed_up: boolean;
  warmup_started_at: Date | string | null;
  is_active: boolean;
  health_score: number;
  created_at: Date | string;
}

export interface OutreachReply {
  id: string;
  lead_id: string | null;
  email_id: string | null;
  from_email: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  ai_classification: ReplyClassification | null;
  ai_classification_confidence: number | null;
  ai_suggested_response: string | null;
  sentiment_score: number | null;
  urgency: ReplyUrgency | null;
  pain_points_mentioned: string[] | null;
  objections: string[] | null;
  questions_asked: string[] | null;
  buying_signals: string[] | null;
  next_step_suggestion: string | null;
  referred_person: ReferredPerson | null;
  is_handled: boolean;
  handled_at: Date | string | null;
  received_at: Date | string;
  created_at: Date | string;
}

export interface OutreachAnalyticsDaily {
  id: string;
  date: string; // date only, no time
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  emails_replied: number;
  emails_bounced: number;
  positive_replies: number;
  calls_booked: number;
  sequence_id: string | null;
  sending_account_id: string | null;
  created_at: Date | string;
}

export interface OutreachTask {
  id: string;
  lead_id: string | null;
  type: TaskType;
  title: string;
  description: string | null;
  due_date: string; // date only
  due_time: string | null; // time only
  priority: TaskPriority;
  status: TaskStatus;
  created_by: TaskCreatedBy;
  completed_at: Date | string | null;
  created_at: Date | string;
}

export interface OutreachCallLog {
  id: string;
  lead_id: string | null;
  call_date: Date | string;
  duration_minutes: number | null;
  outcome: CallOutcome | null;
  interest_level: InterestLevel | null;
  pain_points_discussed: string[];
  features_demoed: string[];
  objections_raised: string[];
  next_step: string | null;
  next_step_date: string | null; // date only
  notes: string | null;
  created_at: Date | string;
}

export interface OutreachSuppression {
  id: string;
  email: string;
  reason: SuppressionReason;
  original_lead_id: string | null;
  created_at: Date | string;
}

export interface OutreachHygieneLog {
  id: string;
  action: HygieneAction;
  lead_id: string | null;
  details: Record<string, unknown>;
  created_at: Date | string;
}
