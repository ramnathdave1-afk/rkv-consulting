'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Phone,
  MessageSquare,
  Settings,
  Clock,
  Bot,
  ChevronDown,
  ChevronUp,
  Play,
  Edit,
  Send,
  Activity,
  BarChart3,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/paywall/FeatureGate';
import { useSubscription } from '@/hooks/useSubscription';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentLogEntry {
  id: string;
  agent_type: string;
  action: string;
  status: string;
  created_at: string;
  details?: string;
}

interface EmailSequence {
  id: string;
  name: string;
  type: string;
  description: string;
  stepsCount: number;
  active: boolean;
  steps: { dayOffset: number; subject: string; preview: string }[];
}

interface SMSThread {
  tenantId: string;
  tenantName: string;
  propertyAddress: string;
  messages: SMSMsg[];
  unreadCount: number;
  autoResponse: boolean;
}

interface SMSMsg {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  sender: 'tenant' | 'agent' | 'investor';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

/* ------------------------------------------------------------------ */
/*  Constants: Email Sequences                                         */
/* ------------------------------------------------------------------ */

const EMAIL_SEQUENCES: EmailSequence[] = [
  {
    id: 'seq-rent',
    name: 'Rent Reminder',
    type: 'rent_reminder',
    description: 'Automated sequence that reminds tenants when rent is approaching and follows up on late payments.',
    stepsCount: 4,
    active: true,
    steps: [
      { dayOffset: -3, subject: 'Rent Due Reminder', preview: 'Hi {{tenant_name}}, your rent of {{rent_amount}} for {{property_address}} is due on {{due_date}}.' },
      { dayOffset: 0, subject: 'Rent Due Today', preview: 'Hi {{tenant_name}}, just a reminder that your rent of {{rent_amount}} is due today.' },
      { dayOffset: 3, subject: 'Late Rent Notice', preview: 'Hi {{tenant_name}}, your rent of {{rent_amount}} is now 3 days past due. A late fee of {{late_fee}} may apply.' },
      { dayOffset: 7, subject: 'Final Late Rent Notice', preview: 'Hi {{tenant_name}}, your rent is now 7 days past due. Please contact us immediately to discuss payment arrangements.' },
    ],
  },
  {
    id: 'seq-renewal',
    name: 'Lease Renewal',
    type: 'lease_renewal',
    description: 'Multi-step sequence that notifies tenants of upcoming lease expirations and presents renewal options.',
    stepsCount: 3,
    active: true,
    steps: [
      { dayOffset: -90, subject: 'Lease Renewal Notice', preview: 'Hi {{tenant_name}}, your lease at {{property_address}} expires on {{lease_end}}. We would like to offer you renewal options.' },
      { dayOffset: -60, subject: 'Renewal Options Available', preview: 'Hi {{tenant_name}}, please review the attached renewal options for {{property_address}}. New rent: {{new_rent_amount}}/mo.' },
      { dayOffset: -30, subject: 'Lease Renewal - Action Required', preview: 'Hi {{tenant_name}}, your lease expires in 30 days. Please sign your renewal or confirm your move-out date.' },
    ],
  },
  {
    id: 'seq-welcome',
    name: 'Welcome Tenant',
    type: 'welcome',
    description: 'Onboarding sequence for new tenants with move-in details, property information, and important contacts.',
    stepsCount: 3,
    active: false,
    steps: [
      { dayOffset: 0, subject: 'Welcome to {{property_address}}!', preview: 'Hi {{tenant_name}}, welcome to your new home! Here is everything you need to know about move-in.' },
      { dayOffset: 1, subject: 'Important Contacts & Emergency Info', preview: 'Hi {{tenant_name}}, here are your important contacts for maintenance, emergencies, and general inquiries.' },
      { dayOffset: 7, subject: 'How is Everything Going?', preview: 'Hi {{tenant_name}}, just checking in after your first week. Is there anything you need help with?' },
    ],
  },
  {
    id: 'seq-maintenance',
    name: 'Maintenance Follow-up',
    type: 'maintenance_followup',
    description: 'Automated updates for tenants on maintenance request status, scheduling, and completion confirmation.',
    stepsCount: 3,
    active: true,
    steps: [
      { dayOffset: 0, subject: 'Maintenance Request Received', preview: 'Hi {{tenant_name}}, we received your maintenance request: "{{request_title}}". A technician will be assigned shortly.' },
      { dayOffset: 1, subject: 'Maintenance Scheduled', preview: 'Hi {{tenant_name}}, your maintenance visit for "{{request_title}}" is scheduled for {{scheduled_date}}.' },
      { dayOffset: 0, subject: 'Maintenance Completed', preview: 'Hi {{tenant_name}}, the maintenance work for "{{request_title}}" has been completed. Please confirm everything is resolved.' },
    ],
  },
  {
    id: 'seq-moveout',
    name: 'Move-out Notice',
    type: 'moveout',
    description: 'Step-by-step guidance for tenants through the move-out process including inspection scheduling.',
    stepsCount: 3,
    active: false,
    steps: [
      { dayOffset: -30, subject: 'Move-out Checklist', preview: 'Hi {{tenant_name}}, since your lease at {{property_address}} ends on {{lease_end}}, here is your move-out checklist.' },
      { dayOffset: -14, subject: 'Inspection Scheduling', preview: 'Hi {{tenant_name}}, please schedule your pre-move-out inspection. Available times: {{available_times}}.' },
      { dayOffset: -3, subject: 'Final Move-out Reminder', preview: 'Hi {{tenant_name}}, your move-out date is in 3 days. Please ensure all items on the checklist are completed.' },
    ],
  },
  {
    id: 'seq-seasonal',
    name: 'Seasonal Update',
    type: 'seasonal',
    description: 'Periodic newsletters with seasonal maintenance tips, community updates, and property announcements.',
    stepsCount: 2,
    active: false,
    steps: [
      { dayOffset: 0, subject: '{{season}} Property Update', preview: 'Hi {{tenant_name}}, here are some seasonal tips and updates for your property at {{property_address}}.' },
      { dayOffset: 7, subject: 'Seasonal Maintenance Tips', preview: 'Hi {{tenant_name}}, prepare your home for {{season}} with these helpful maintenance tips.' },
    ],
  },
];


/* ------------------------------------------------------------------ */
/*  Constants: Voice Settings                                          */
/* ------------------------------------------------------------------ */

const ELEVENLABS_VOICES = [
  { value: 'rachel', label: 'Rachel - Professional Female' },
  { value: 'adam', label: 'Adam - Professional Male' },
  { value: 'sarah', label: 'Sarah - Friendly Female' },
  { value: 'josh', label: 'Josh - Friendly Male' },
  { value: 'bella', label: 'Bella - Warm Female' },
  { value: 'custom', label: 'Custom Voice (Coming Soon)' },
];

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                      */
/* ------------------------------------------------------------------ */

function ToggleSwitch({
  enabled,
  onToggle,
  size = 'md',
}: {
  enabled: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeStyles = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' },
  };
  const s = sizeStyles[size];

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200 cursor-pointer',
        s.track,
        enabled ? 'bg-gold' : 'bg-border'
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow-md transform transition-transform duration-200',
          s.thumb,
          'mt-0.5 ml-0.5',
          enabled ? s.translate : 'translate-x-0'
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent icon helper                                                  */
/* ------------------------------------------------------------------ */

function getAgentIcon(agentType: string) {
  switch (agentType) {
    case 'email_agent':
    case 'email':
      return { icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10' };
    case 'voice_agent':
    case 'voice':
      return { icon: Phone, color: 'text-green', bg: 'bg-green/10' };
    case 'sms_agent':
    case 'sms':
      return { icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10' };
    default:
      return { icon: Bot, color: 'text-gold', bg: 'bg-gold/10' };
  }
}

/* ------------------------------------------------------------------ */
/*  Variable highlighter                                               */
/* ------------------------------------------------------------------ */

function HighlightVariables({ text }: { text: string }) {
  const parts = text.split(/({{[^}]+}})/g);
  return (
    <>
      {parts.map((part, i) =>
        /^{{[^}]+}}$/.test(part) ? (
          <span key={i} className="text-gold font-semibold bg-gold/10 px-1 rounded">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AIAgentsPage() {
  const supabase = createClient();
  const { hasFeature: _hasFeature, planName } = useSubscription();
  const _isElite = planName === 'elite';

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [activityLogs, setActivityLogs] = useState<AgentLogEntry[]>([]);
  const [expandedSequence, setExpandedSequence] = useState<string | null>(null);
  const [sequences, setSequences] = useState(EMAIL_SEQUENCES);
  const [selectedVoice, setSelectedVoice] = useState('rachel');
  const [callScript, setCallScript] = useState(
    'Hello {{tenant_name}}, this is an automated call from your property management team regarding your rent payment for {{property_address}}. Your rent of {{rent_amount}} was due on {{due_date}}. Please contact us at your earliest convenience to arrange payment. Press 1 to speak with a representative, or press 2 to set up a payment plan.'
  );
  const [businessHoursStart, setBusinessHoursStart] = useState('09:00');
  const [businessHoursEnd, setBusinessHoursEnd] = useState('21:00');
  const [maxCallsPerWeek, setMaxCallsPerWeek] = useState(10);
  const [escalationThreshold, setEscalationThreshold] = useState(3);
  const [smsThreads, setSmsThreads] = useState<SMSThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [smsInput, setSmsInput] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Stats
  const [overviewStats, setOverviewStats] = useState({
    emailsSent: 0,
    callsMade: 0,
    smsSent: 0,
    tasksCompleted: 0,
  });

  /* ---------------------------------------------------------------- */
  /*  Fetch data                                                       */
  /* ---------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch activity logs
    const { data: logs } = await supabase
      .from('agent_logs')
      .select('id, agent_type, trigger_event, subject, content, outcome, status, created_at, tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (logs) {
      // Map logs to the expected format
      const mappedLogs = logs.map((l: Record<string, unknown>) => ({
        id: l.id as string,
        agent_type: l.agent_type as string,
        action: (l.trigger_event || l.subject || 'Action') as string,
        status: l.status as string,
        created_at: l.created_at as string,
        details: (l.outcome || l.content) as string,
      }));
      setActivityLogs(mappedLogs);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthLogs = mappedLogs.filter((l: AgentLogEntry) => new Date(l.created_at) >= monthStart);

      const emailLogs = monthLogs.filter((l: AgentLogEntry) => l.agent_type === 'email_agent' || l.agent_type === 'email');
      const voiceLogs = monthLogs.filter((l: AgentLogEntry) => l.agent_type === 'voice_agent' || l.agent_type === 'voice');
      const smsLogs = monthLogs.filter((l: AgentLogEntry) => l.agent_type === 'sms_agent' || l.agent_type === 'sms');
      const completedLogs = monthLogs.filter((l: AgentLogEntry) => l.status === 'sent' || l.status === 'success');

      setOverviewStats({
        emailsSent: emailLogs.length,
        callsMade: voiceLogs.length,
        smsSent: smsLogs.length,
        tasksCompleted: completedLogs.length,
      });
    }

    // Fetch real tenants for SMS threads
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, first_name, last_name, phone, properties(address)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .not('phone', 'is', null)
      .limit(10);

    if (tenants && tenants.length > 0) {
      // Build SMS threads from real tenant data + agent_logs
      const realThreads: SMSThread[] = [];
      for (const tenant of tenants) {
        const { data: smsLogs } = await supabase
          .from('agent_logs')
          .select('id, content, status, created_at')
          .eq('tenant_id', tenant.id)
          .eq('agent_type', 'sms')
          .order('created_at', { ascending: true })
          .limit(20);

        const messages: SMSMsg[] = (smsLogs || []).map((log: Record<string, unknown>) => ({
          id: log.id as string,
          direction: 'outbound' as const,
          content: (log.content as string) || 'Message sent',
          sender: 'agent' as const,
          timestamp: log.created_at as string,
          status: (log.status as string) === 'sent' ? 'delivered' as const : 'sent' as const,
        }));

        const property = Array.isArray(tenant.properties)
          ? tenant.properties[0]
          : tenant.properties;

        realThreads.push({
          tenantId: tenant.id,
          tenantName: `${tenant.first_name} ${tenant.last_name}`,
          propertyAddress: (property as Record<string, unknown>)?.address as string || 'Unknown',
          messages,
          unreadCount: 0,
          autoResponse: false,
        });
      }

      if (realThreads.length > 0) {
        setSmsThreads(realThreads);
        setSelectedThread(realThreads[0].tenantId);
      }
    }

    // Fetch saved sequence states — seed defaults on first visit
    const { data: savedSequences } = await supabase
      .from('agent_sequences')
      .select('id, type, enabled')
      .eq('user_id', user.id);

    if (savedSequences && savedSequences.length > 0) {
      setSequences((prev) =>
        prev.map((seq) => {
          const saved = savedSequences.find((s: Record<string, unknown>) => s.type === seq.type);
          return saved ? { ...seq, id: saved.id as string, active: saved.enabled as boolean } : seq;
        })
      );
    } else {
      // Seed default sequences for new user
      const defaults = EMAIL_SEQUENCES.map((seq) => ({
        user_id: user.id,
        name: seq.name,
        type: seq.type,
        agent_type: 'email',
        enabled: seq.active,
        steps: seq.steps,
      }));
      const { data: seeded } = await supabase
        .from('agent_sequences')
        .insert(defaults)
        .select('id, type, enabled');
      if (seeded) {
        setSequences((prev) =>
          prev.map((seq) => {
            const s = seeded.find((r: Record<string, unknown>) => r.type === seq.type);
            return s ? { ...seq, id: s.id as string, active: s.enabled as boolean } : seq;
          })
        );
      }
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  async function toggleSequence(id: string) {
    const seq = sequences.find((s) => s.id === id);
    if (!seq) return;

    const newActive = !seq.active;
    setSequences((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: newActive } : s))
    );

    // Persist to Supabase agent_sequences table
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use DB id if available, otherwise upsert by type
      if (!id.startsWith('seq-')) {
        await supabase
          .from('agent_sequences')
          .update({ enabled: newActive })
          .eq('id', id);
      } else {
        await supabase
          .from('agent_sequences')
          .upsert(
            {
              user_id: user.id,
              name: seq.name,
              type: seq.type,
              agent_type: 'email',
              enabled: newActive,
              steps: seq.steps,
            },
            { onConflict: 'user_id,type' }
          );
      }
    } catch (err) {
      console.error('Failed to persist sequence toggle:', err);
    }
  }

  const [smsSending, setSmsSending] = useState(false);

  async function handleSendSMS() {
    if (!smsInput.trim() || !selectedThread || smsSending) return;
    setSmsSending(true);

    try {
      // Call real SMS API
      const res = await fetch('/api/agents/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedThread,
          message: smsInput.trim(),
        }),
      });

      const newMsg: SMSMsg = {
        id: `s-${Date.now()}`,
        direction: 'outbound',
        content: smsInput.trim(),
        sender: 'investor',
        timestamp: new Date().toISOString(),
        status: res.ok ? 'sent' : 'failed',
      };

      setSmsThreads((prev) =>
        prev.map((t) =>
          t.tenantId === selectedThread
            ? { ...t, messages: [...t.messages, newMsg] }
            : t
        )
      );
      setSmsInput('');
    } catch {
      console.error('Failed to send SMS');
    } finally {
      setSmsSending(false);
    }
  }

  function toggleAutoResponse(tenantId: string) {
    setSmsThreads((prev) =>
      prev.map((t) =>
        t.tenantId === tenantId
          ? { ...t, autoResponse: !t.autoResponse }
          : t
      )
    );
  }

  const activeThread = smsThreads.find((t) => t.tenantId === selectedThread);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <FeatureGate feature="emailAgents">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            AI Agents
          </h1>
          <p className="text-sm text-muted mt-1">
            Your automated property management team
          </p>
        </div>

        {/* ============================================================ */}
        {/*  TABS                                                         */}
        {/* ============================================================ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" icon={<BarChart3 className="h-3.5 w-3.5" />}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="email" icon={<Mail className="h-3.5 w-3.5" />}>
              Email
            </TabsTrigger>
            <TabsTrigger value="voice" icon={<Phone className="h-3.5 w-3.5" />}>
              Voice
            </TabsTrigger>
            <TabsTrigger value="sms" icon={<MessageSquare className="h-3.5 w-3.5" />}>
              SMS
            </TabsTrigger>
            <TabsTrigger value="activity" icon={<Activity className="h-3.5 w-3.5" />}>
              Activity Log
            </TabsTrigger>
          </TabsList>

          {/* ========================================================== */}
          {/*  TAB 1: OVERVIEW                                            */}
          {/* ========================================================== */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Emails Sent', value: overviewStats.emailsSent, icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Calls Made', value: overviewStats.callsMade, icon: Phone, color: 'text-green', bg: 'bg-green/10' },
                  { label: 'SMS Sent', value: overviewStats.smsSent, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  { label: 'Tasks Completed', value: overviewStats.tasksCompleted, icon: CheckCircle, color: 'text-gold', bg: 'bg-gold/10' },
                ].map((stat) => {
                  const Icon = stat.icon as React.ComponentType<{ className?: string; strokeWidth?: number }>;
                  return (
                    <Card key={stat.label} className="rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl', stat.bg)}>
                          <Icon className={cn('h-6 w-6', stat.color)} />
                        </div>
                        <div>
                          <p className="label">{stat.label}</p>
                          <p className="text-2xl font-bold text-white font-mono tabular-nums">{stat.value}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Recent Activity Feed */}
              <Card
                header={
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted" />
                    <span className="font-display font-semibold text-sm text-white">Recent Activity</span>
                    <span className="ml-auto text-xs text-muted">This month</span>
                  </div>
                }
              >
                {activityLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-border/50 mb-3">
                      <Bot className="h-6 w-6 text-muted" />
                    </div>
                    <p className="text-sm text-muted">No agent activity yet</p>
                    <p className="text-xs text-muted/60 mt-1">
                      Configure your agents to start automating tasks
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {activityLogs.slice(0, 10).map((log) => {
                      const agentInfo = getAgentIcon(log.agent_type);
                      const AgentIcon = agentInfo.icon;
                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <div className={cn('flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0', agentInfo.bg)}>
                            <AgentIcon className={cn('h-4 w-4', agentInfo.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white leading-snug">{log.action}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant={log.status === 'success' ? 'success' : log.status === 'error' ? 'danger' : 'warning'}
                                size="sm"
                              >
                                {log.status}
                              </Badge>
                              <span className="text-[10px] text-muted font-mono">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================== */}
          {/*  TAB 2: EMAIL                                               */}
          {/* ========================================================== */}
          <TabsContent value="email">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-lg text-white">Email Sequences</h2>
                  <p className="text-xs text-muted mt-0.5">Automated email workflows for tenant communications</p>
                </div>
                <Badge variant="default" size="md">
                  {sequences.filter((s) => s.active).length} Active
                </Badge>
              </div>

              {sequences.map((seq) => {
                const isExpanded = expandedSequence === seq.id;

                return (
                  <Card key={seq.id} className={cn(seq.active && 'border-gold/20')}>
                    {/* Sequence header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                          <Mail className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold text-sm text-white">{seq.name}</h3>
                          <p className="text-xs text-muted mt-0.5 truncate">{seq.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <Badge variant="info" size="sm">{seq.stepsCount} steps</Badge>
                        <ToggleSwitch enabled={seq.active} onToggle={() => toggleSequence(seq.id)} size="sm" />
                        <Button variant="ghost" size="sm" icon={<Edit className="h-3 w-3" />}>
                          Edit Sequence
                        </Button>
                        <button
                          type="button"
                          onClick={() => setExpandedSequence(isExpanded ? null : seq.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded steps */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3 animate-fade-up">
                        <p className="label">Sequence Steps</p>
                        {seq.steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-3 pl-2">
                            {/* Step indicator */}
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-gold">{idx + 1}</span>
                              </div>
                              {idx < seq.steps.length - 1 && (
                                <div className="w-px h-8 bg-border mt-1" />
                              )}
                            </div>
                            {/* Step content */}
                            <div className="flex-1 min-w-0 pb-2">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-white">{step.subject}</p>
                                <Badge variant="info" size="sm">
                                  {step.dayOffset === 0 ? 'Day 0' : step.dayOffset > 0 ? `Day +${step.dayOffset}` : `Day ${step.dayOffset}`}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted mt-1 leading-relaxed">
                                <HighlightVariables text={step.preview} />
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ========================================================== */}
          {/*  TAB 3: VOICE                                               */}
          {/* ========================================================== */}
          <TabsContent value="voice">
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-semibold text-lg text-white">Voice Agent Configuration</h2>
                <p className="text-xs text-muted mt-0.5">Configure your AI voice agent for automated tenant calls</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Voice Selection */}
                <Card
                  header={
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green" />
                      <span className="font-display font-semibold text-sm text-white">Voice Settings</span>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted font-medium mb-1.5 block">ElevenLabs Voice</label>
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full h-10 px-3 pr-8 text-sm bg-deep border border-border rounded-lg text-white appearance-none outline-none focus:border-gold/30 transition-colors"
                      >
                        {ELEVENLABS_VOICES.map((v) => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted font-medium mb-1.5 block">Call Script</label>
                      <textarea
                        value={callScript}
                        onChange={(e) => setCallScript(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2.5 text-sm bg-deep border border-border rounded-lg text-white resize-y outline-none focus:border-gold/30 transition-colors min-h-[120px] font-body"
                      />
                      <p className="text-[10px] text-muted mt-1">
                        Use <span className="text-gold font-semibold">{'{{variable_name}}'}</span> for dynamic content
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Play className="h-3.5 w-3.5" />}
                      onClick={async () => {
                        // Get first active tenant for test call
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;
                        const { data: tenants } = await supabase
                          .from('tenants')
                          .select('id')
                          .eq('user_id', user.id)
                          .eq('status', 'active')
                          .limit(1);
                        if (!tenants?.length) {
                          alert('No active tenants found for test call');
                          return;
                        }
                        try {
                          const res = await fetch('/api/agents/voice', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              tenantId: tenants[0].id,
                              purpose: 'general',
                            }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert('Test call initiated successfully');
                            fetchData(); // Refresh activity logs
                          } else {
                            alert(data.error || 'Failed to initiate test call');
                          }
                        } catch {
                          alert('Failed to connect to voice service');
                        }
                      }}
                    >
                      Test Call
                    </Button>
                  </div>
                </Card>

                {/* Call Rules */}
                <Card
                  header={
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-gold" />
                      <span className="font-display font-semibold text-sm text-white">Call Rules</span>
                    </div>
                  }
                >
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs text-muted font-medium mb-1.5 block">Business Hours</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={businessHoursStart}
                          onChange={(e) => setBusinessHoursStart(e.target.value)}
                          className="h-10 px-3 rounded-lg bg-deep border border-border text-sm text-white outline-none focus:border-gold/30 transition-colors"
                        />
                        <span className="text-xs text-muted">to</span>
                        <input
                          type="time"
                          value={businessHoursEnd}
                          onChange={(e) => setBusinessHoursEnd(e.target.value)}
                          className="h-10 px-3 rounded-lg bg-deep border border-border text-sm text-white outline-none focus:border-gold/30 transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-muted mt-1">Calls will only be made during these hours</p>
                    </div>

                    <div>
                      <label className="text-xs text-muted font-medium mb-1.5 block">Max Calls Per Week</label>
                      <input
                        type="number"
                        value={maxCallsPerWeek}
                        onChange={(e) => setMaxCallsPerWeek(Number(e.target.value))}
                        min={1}
                        max={50}
                        className="w-full h-10 px-3 text-sm bg-deep border border-border rounded-lg text-white outline-none focus:border-gold/30 transition-colors"
                      />
                      <p className="text-[10px] text-muted mt-1">Per tenant. Prevents call fatigue.</p>
                    </div>

                    <div>
                      <label className="text-xs text-muted font-medium mb-1.5 block">Escalation Threshold</label>
                      <input
                        type="number"
                        value={escalationThreshold}
                        onChange={(e) => setEscalationThreshold(Number(e.target.value))}
                        min={1}
                        max={10}
                        className="w-full h-10 px-3 text-sm bg-deep border border-border rounded-lg text-white outline-none focus:border-gold/30 transition-colors"
                      />
                      <p className="text-[10px] text-muted mt-1">Number of failed calls before escalating to you</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <p className="text-sm text-white">Require approval before calling</p>
                        <p className="text-[10px] text-muted mt-0.5">You will be notified before each call is made</p>
                      </div>
                      <ToggleSwitch enabled={false} onToggle={() => {}} size="sm" />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================== */}
          {/*  TAB 4: SMS                                                 */}
          {/* ========================================================== */}
          <TabsContent value="sms">
            <div className="space-y-4">
              <div>
                <h2 className="font-display font-semibold text-lg text-white">SMS Conversations</h2>
                <p className="text-xs text-muted mt-0.5">View and manage tenant text message conversations</p>
              </div>

              <div className="flex gap-4" style={{ height: '600px' }}>
                {/* Thread list */}
                <div className="w-72 flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col rounded-lg">
                  <div className="p-3 border-b border-border">
                    <p className="label">Threads</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {smsThreads.map((thread) => (
                      <button
                        key={thread.tenantId}
                        type="button"
                        onClick={() => setSelectedThread(thread.tenantId)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/50',
                          'hover:bg-white/5 transition-colors',
                          selectedThread === thread.tenantId && 'bg-gold/5 border-l-2 border-l-gold',
                        )}
                      >
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-purple-500/10 flex-shrink-0">
                          <MessageSquare className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white truncate">{thread.tenantName}</p>
                            {thread.unreadCount > 0 && (
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold flex items-center justify-center text-[10px] font-bold text-black">
                                {thread.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted truncate mt-0.5">{thread.propertyAddress}</p>
                          {thread.messages.length > 0 && (
                            <p className="text-xs text-muted/60 truncate mt-1">
                              {thread.messages[thread.messages.length - 1].content}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversation panel */}
                <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col rounded-lg">
                  {activeThread ? (
                    <>
                      {/* Thread header */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                        <div>
                          <p className="text-sm font-semibold text-white">{activeThread.tenantName}</p>
                          <p className="text-[10px] text-muted">{activeThread.propertyAddress}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted">AI Auto-response</span>
                            <ToggleSwitch
                              enabled={activeThread.autoResponse}
                              onToggle={() => toggleAutoResponse(activeThread.tenantId)}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                        {activeThread.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              'flex',
                              msg.direction === 'outbound' ? 'justify-end' : 'justify-start',
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[75%] rounded-xl px-3.5 py-2.5',
                                msg.direction === 'outbound'
                                  ? msg.sender === 'agent'
                                    ? 'bg-purple-500/20 border border-purple-500/30 text-white'
                                    : 'bg-gold/20 border border-gold/30 text-white'
                                  : 'bg-deep border border-border text-text',
                              )}
                            >
                              {msg.sender === 'agent' && msg.direction === 'outbound' && (
                                <div className="flex items-center gap-1 mb-1">
                                  <Bot className="h-3 w-3 text-purple-400" />
                                  <span className="text-[10px] font-semibold text-purple-400">AI Agent</span>
                                </div>
                              )}
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-[10px] text-muted font-mono">
                                  {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </span>
                                {msg.direction === 'outbound' && (
                                  <span className={cn(
                                    'text-[10px]',
                                    msg.status === 'delivered' || msg.status === 'read' ? 'text-green' : msg.status === 'failed' ? 'text-red' : 'text-muted',
                                  )}>
                                    {msg.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Message input */}
                      <div className="flex-shrink-0 border-t border-border px-4 py-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={smsInput}
                            onChange={(e) => setSmsInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendSMS()}
                            placeholder="Type a message..."
                            className="flex-1 h-9 px-3 bg-deep border border-border rounded-lg text-sm text-white placeholder-muted/60 outline-none focus:border-gold/30 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={handleSendSMS}
                            disabled={!smsInput.trim()}
                            className={cn(
                              'flex items-center justify-center w-9 h-9 rounded-lg transition-all',
                              smsInput.trim()
                                ? 'bg-gold text-black hover:brightness-110'
                                : 'bg-border/50 text-muted/40 cursor-not-allowed',
                            )}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted text-sm">
                      Select a conversation to view
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================== */}
          {/*  TAB 5: ACTIVITY LOG                                        */}
          {/* ========================================================== */}
          <TabsContent value="activity">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-lg text-white">Activity Log</h2>
                  <p className="text-xs text-muted mt-0.5">Unified feed of all agent actions</p>
                </div>
                <span className="text-xs text-muted">{activityLogs.length} total actions</span>
              </div>

              <Card padding="none">
                {activityLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-border/50 mb-3">
                      <Activity className="h-6 w-6 text-muted" />
                    </div>
                    <p className="text-sm text-muted">No agent activity recorded yet</p>
                    <p className="text-xs text-muted/60 mt-1">
                      Activity from all agents will appear here
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto divide-y divide-border/50">
                    {activityLogs.map((log) => {
                      const agentInfo = getAgentIcon(log.agent_type);
                      const AgentIcon = agentInfo.icon;
                      const isExpanded = expandedLog === log.id;

                      return (
                        <div
                          key={log.id}
                          className={cn(
                            'px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer',
                            isExpanded && 'bg-white/[0.02]',
                          )}
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        >
                          <div className="flex items-start gap-4">
                            {/* Type badge with icon */}
                            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0', agentInfo.bg)}>
                              <AgentIcon className={cn('h-5 w-5', agentInfo.color)} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm text-white leading-snug">{log.action}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    {/* Type badge */}
                                    <Badge
                                      variant={
                                        log.agent_type.includes('email') ? 'info'
                                          : log.agent_type.includes('voice') ? 'success'
                                          : log.agent_type.includes('sms') ? 'warning'
                                          : 'default'
                                      }
                                      size="sm"
                                    >
                                      {log.agent_type.replace('_agent', '')}
                                    </Badge>

                                    {/* Status badge */}
                                    <Badge
                                      variant={
                                        log.status === 'success' ? 'success'
                                          : log.status === 'error' ? 'danger'
                                          : 'warning'
                                      }
                                      size="sm"
                                      dot={log.status === 'pending'}
                                    >
                                      <span className="flex items-center gap-1">
                                        {log.status === 'success' && <CheckCircle className="h-2.5 w-2.5" />}
                                        {log.status === 'error' && <XCircle className="h-2.5 w-2.5" />}
                                        {log.status === 'pending' && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                                        {log.status}
                                      </span>
                                    </Badge>
                                  </div>
                                </div>

                                {/* Timestamp */}
                                <time className="text-xs text-muted font-mono whitespace-nowrap flex-shrink-0">
                                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                </time>
                              </div>

                              {/* Expanded detail panel */}
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-border animate-fade-up">
                                  <div className="grid grid-cols-2 gap-3 text-xs bg-card/50 rounded-lg p-3 border border-border/50">
                                    <div>
                                      <p className="label mb-1">Agent Type</p>
                                      <p className="text-white capitalize font-mono">{log.agent_type.replace('_', ' ')}</p>
                                    </div>
                                    <div>
                                      <p className="label mb-1">Status</p>
                                      <p className="text-white capitalize font-mono">{log.status}</p>
                                    </div>
                                    <div>
                                      <p className="label mb-1">Timestamp</p>
                                      <p className="text-white font-mono">
                                        {new Date(log.created_at).toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true,
                                        })}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="label mb-1">Action ID</p>
                                      <p className="text-white font-mono text-[10px]">{log.id}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGate>
  );
}
