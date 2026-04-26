// ─── Lead & Contact ──────────────────────────────────────────────

export interface OutreachLead {
  id: string;
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  title?: string;
  city?: string;
  state?: string;
  unit_count?: number;
  current_software?: string;
  source?: string;
  status: LeadStatus;
  stage: LeadStage;
  score: number;
  temperature: 'hot' | 'warm' | 'cold';
  sequence_id?: string;
  current_step?: number;
  next_send_at?: string;
  sending_account_id?: string;
  ai_first_line?: string;
  tags?: string[];
  re_engagement_count: number;
  last_re_engagement_at?: string;
  cooldown_until?: string;
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | 'new'
  | 'verified'
  | 'in_sequence'
  | 'replied'
  | 'engaged'
  | 'call_booked'
  | 'demo_completed'
  | 'pilot'
  | 'closed_won'
  | 'closed_lost'
  | 'bounced'
  | 'unsubscribed'
  | 'dead'
  | 'unverified_dead'
  | 'archived'
  | 'do_not_contact';

export type LeadStage =
  | 'prospecting'
  | 'outreach'
  | 'engaged'
  | 'call_booked'
  | 'demo_completed'
  | 'pilot'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

// ─── Sequences ───────────────────────────────────────────────────

export interface OutreachSequence {
  id: string;
  name: string;
  description?: string;
  type: 'initial' | 're_engagement';
  steps: SequenceStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SequenceStep {
  step_number: number;
  delay_days: number;
  subject: string;
  body_html: string;
  body_text: string;
  variant?: 'A' | 'B';
}

// ─── Emails ──────────────────────────────────────────────────────

export interface OutreachEmail {
  id: string;
  lead_id: string;
  sending_account_id: string;
  sequence_id?: string;
  step_number?: number;
  message_id: string;
  subject: string;
  body_html: string;
  body_text: string;
  status: EmailStatus;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  bounce_type?: 'hard' | 'soft';
  created_at: string;
}

export type EmailStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'bounced'
  | 'failed';

// ─── Replies ─────────────────────────────────────────────────────

export interface OutreachReply {
  id: string;
  email_id?: string;
  lead_id: string;
  from_email: string;
  subject: string;
  body_text: string;
  body_html?: string;
  in_reply_to?: string;
  classification?: ReplyClassification;
  sentiment_score?: number;
  pain_points?: string[];
  objections?: string[];
  buying_signals?: string[];
  urgency?: 'low' | 'medium' | 'high';
  suggested_reply?: string;
  is_classified: boolean;
  received_at: string;
  created_at: string;
}

export type ReplyClassification =
  | 'interested'
  | 'meeting_request'
  | 'question'
  | 'not_now'
  | 'not_interested'
  | 'unsubscribe'
  | 'out_of_office'
  | 'wrong_person'
  | 'referral'
  | 'competitor'
  | 'already_have_solution'
  | 'spam'
  | 'bounce';

// ─── Sending Accounts ────────────────────────────────────────────

export interface SendingAccount {
  id: string;
  email: string;
  display_name: string;
  smtp_host: string;
  smtp_port: number;
  imap_host: string;
  imap_port: number;
  auth_type: 'oauth2' | 'password';
  access_token?: string;
  refresh_token?: string;
  password?: string;
  daily_limit: number;
  sent_today: number;
  warmup_mode: boolean;
  warmup_daily_limit?: number;
  health_score: number;
  is_active: boolean;
  last_send_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Tasks ───────────────────────────────────────────────────────

export interface OutreachTask {
  id: string;
  lead_id: string;
  type: TaskType;
  title: string;
  description?: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'skipped' | 'overdue';
  assigned_to?: string;
  created_at: string;
  completed_at?: string;
}

export type TaskType =
  | 'follow_up_call'
  | 'follow_up_email'
  | 'send_proposal'
  | 'reschedule'
  | 'review_reply'
  | 'manual_outreach'
  | 'research';

// ─── Analytics ───────────────────────────────────────────────────

export interface OutreachAnalyticsDaily {
  id: string;
  date: string;
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  emails_clicked: number;
  emails_replied: number;
  emails_bounced: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  bounce_rate: number;
  new_leads: number;
  leads_engaged: number;
  calls_booked: number;
  sequence_id?: string;
  sending_account_id?: string;
  created_at: string;
}

// ─── Hygiene Log ─────────────────────────────────────────────────

export interface HygieneLog {
  id: string;
  action: string;
  lead_id?: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ─── Scoring ─────────────────────────────────────────────────────

export interface ScoreResult {
  score: number;
  temperature: 'hot' | 'warm' | 'cold';
  components: {
    company_size: number;
    engagement: number;
    reply_sentiment: number;
    title_seniority: number;
    timing_signals: number;
  };
}

// ─── Claude Classification ───────────────────────────────────────

export interface ClassificationResult {
  classification: ReplyClassification;
  confidence: number;
  reasoning: string;
}

export interface DeepAnalysisResult {
  sentiment_score: number;
  pain_points: string[];
  objections: string[];
  buying_signals: string[];
  urgency: 'low' | 'medium' | 'high';
  suggested_reply: string;
  key_topics: string[];
}

// ─── Merge Tag Context ───────────────────────────────────────────

export interface MergeTagContext {
  first_name: string;
  last_name: string;
  company_name: string;
  unit_count?: number;
  current_software?: string;
  city?: string;
  state?: string;
  ai_first_line?: string;
  cal_link: string;
  sender_first_name: string;
}
