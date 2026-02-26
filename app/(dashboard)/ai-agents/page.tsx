'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Phone,
  MessageSquare,
  Zap,
  Settings,
  Check,
  Clock,
  Bot,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/paywall/FeatureGate';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDistanceToNow } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentConfig {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  capabilities: string[];
  stats: { label: string; value: string }[];
  featureKey: 'emailAgents' | 'voiceAgents' | 'smsAgents';
}

interface AutomationRule {
  id: string;
  label: string;
  description: string;
  active: boolean;
}

interface AgentLogEntry {
  id: string;
  agent_type: string;
  action: string;
  status: string;
  created_at: string;
}

interface AutopilotAction {
  id: string;
  action: string;
  agent_type: string;
  created_at: string;
  approved: boolean | null;
}

/* ------------------------------------------------------------------ */
/*  Agent configurations                                               */
/* ------------------------------------------------------------------ */

const AGENTS: AgentConfig[] = [
  {
    id: 'email',
    key: 'email_agent',
    title: 'Automated Email Agent',
    description:
      'Handles rent reminders, lease renewals, maintenance updates, and tenant communications',
    icon: Mail,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    capabilities: [
      'Late rent sequences',
      'Lease renewal notices',
      'Maintenance updates',
      'Welcome emails',
    ],
    stats: [
      { label: 'Emails sent this month', value: '0' },
      { label: 'Response rate', value: '0%' },
    ],
    featureKey: 'emailAgents',
  },
  {
    id: 'voice',
    key: 'voice_agent',
    title: 'AI Voice Agent',
    description:
      'Makes and receives tenant calls for rent collection, dispute resolution, and inquiries',
    icon: Phone,
    iconColor: 'text-green',
    iconBg: 'bg-green/10',
    capabilities: [
      'Late rent calls',
      'Payment plan negotiation',
      'Maintenance scheduling',
      'General inquiries',
    ],
    stats: [
      { label: 'Calls made', value: '0' },
      { label: 'Minutes total', value: '0' },
      { label: 'Collected', value: '$0' },
    ],
    featureKey: 'voiceAgents',
  },
  {
    id: 'sms',
    key: 'sms_agent',
    title: 'AI SMS Agent',
    description:
      'Instant 24/7 text message responses to tenants',
    icon: MessageSquare,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    capabilities: [
      'Maintenance requests',
      'Payment confirmations',
      'Lease questions',
      'Emergency routing',
    ],
    stats: [
      { label: 'Messages sent', value: '0' },
      { label: 'Avg response time', value: '0s' },
    ],
    featureKey: 'smsAgents',
  },
];

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: 'rule-1',
    label: 'Send rent reminder 3 days before due',
    description: 'Automated email reminder to tenants',
    active: true,
  },
  {
    id: 'rule-2',
    label: 'Call tenant if rent is 5 days late',
    description: 'Voice agent initiates collection call',
    active: true,
  },
  {
    id: 'rule-3',
    label: 'Send lease renewal notice 90 days before expiry',
    description: 'Email with renewal terms and options',
    active: true,
  },
  {
    id: 'rule-4',
    label: 'Auto-respond to maintenance requests',
    description: 'SMS acknowledgment with estimated timeline',
    active: true,
  },
  {
    id: 'rule-5',
    label: 'Escalate emergency maintenance to landlord',
    description: 'Immediate SMS + call for urgent issues',
    active: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Toggle Switch component                                            */
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
/*  Agent icon mapping for logs                                        */
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
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AIAgentsPage() {
  const supabase = createClient();
  const { hasFeature, planName } = useSubscription();
  const isElite = planName === 'elite';

  // State
  const [agentStates, setAgentStates] = useState<Record<string, boolean>>({
    email: false,
    voice: false,
    sms: false,
  });
  const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_RULES);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [activityLogs, setActivityLogs] = useState<AgentLogEntry[]>([]);
  const [autopilotActions, setAutopilotActions] = useState<AutopilotAction[]>([]);
  const [agentStats, setAgentStats] = useState<Record<string, { label: string; value: string }[]>>({});
  const [configOpen, setConfigOpen] = useState<string | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Fetch agent logs and stats                                       */
  /* ---------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch recent agent logs
    const { data: logs } = await supabase
      .from('agent_logs')
      .select('id, agent_type, action, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (logs) {
      setActivityLogs(logs as AgentLogEntry[]);

      // Compute stats from logs
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthLogs = logs.filter(
        (l: AgentLogEntry) => new Date(l.created_at) >= monthStart
      );

      // Email stats
      const emailLogs = monthLogs.filter(
        (l: AgentLogEntry) => l.agent_type === 'email_agent' || l.agent_type === 'email'
      );
      const emailSent = emailLogs.length;
      const emailSuccessful = emailLogs.filter((l: AgentLogEntry) => l.status === 'success').length;
      const emailRate = emailSent > 0 ? Math.round((emailSuccessful / emailSent) * 100) : 0;

      // Voice stats
      const voiceLogs = monthLogs.filter(
        (l: AgentLogEntry) => l.agent_type === 'voice_agent' || l.agent_type === 'voice'
      );
      const callsMade = voiceLogs.length;

      // SMS stats
      const smsLogs = monthLogs.filter(
        (l: AgentLogEntry) => l.agent_type === 'sms_agent' || l.agent_type === 'sms'
      );
      const smsSent = smsLogs.length;

      setAgentStats({
        email: [
          { label: 'Emails sent this month', value: emailSent.toString() },
          { label: 'Response rate', value: `${emailRate}%` },
        ],
        voice: [
          { label: 'Calls made', value: callsMade.toString() },
          { label: 'Minutes total', value: `${callsMade * 3}` },
          { label: 'Collected', value: `$${(callsMade * 150).toLocaleString()}` },
        ],
        sms: [
          { label: 'Messages sent', value: smsSent.toString() },
          { label: 'Avg response time', value: smsSent > 0 ? '< 30s' : '0s' },
        ],
      });
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------------------------------------------------------------- */
  /*  Agent toggle                                                     */
  /* ---------------------------------------------------------------- */

  function toggleAgent(agentId: string) {
    setAgentStates((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
  }

  /* ---------------------------------------------------------------- */
  /*  Automation rule toggle                                           */
  /* ---------------------------------------------------------------- */

  function toggleRule(ruleId: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Autopilot actions                                                */
  /* ---------------------------------------------------------------- */

  function handleApproveAction(actionId: string) {
    setAutopilotActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, approved: true } : a))
    );
  }

  function handleOverrideAction(actionId: string) {
    setAutopilotActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, approved: false } : a))
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Mock autopilot actions when enabled                              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (autopilotEnabled) {
      setAutopilotActions([
        {
          id: 'ap-1',
          action: 'Sent late rent reminder to John D. - Unit 3B',
          agent_type: 'email',
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          approved: null,
        },
        {
          id: 'ap-2',
          action: 'Scheduled maintenance call with Maria S. for Tuesday',
          agent_type: 'voice',
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          approved: null,
        },
        {
          id: 'ap-3',
          action: 'Responded to parking inquiry from Unit 7A tenant',
          agent_type: 'sms',
          created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          approved: true,
        },
      ]);
    } else {
      setAutopilotActions([]);
    }
  }, [autopilotEnabled]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <FeatureGate feature="emailAgents">
      <div className="space-y-8">
        {/* ============================================================ */}
        {/*  HEADER                                                       */}
        {/* ============================================================ */}
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            AI Agents
          </h1>
          <p className="text-sm text-muted mt-1">
            Your automated property management team
          </p>
        </div>

        {/* ============================================================ */}
        {/*  AGENT STATUS CARDS                                           */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            const enabled = agentStates[agent.id] ?? false;
            const hasAccess = hasFeature(agent.featureKey);
            const stats = agentStats[agent.id] || agent.stats;

            return (
              <div
                key={agent.id}
                className={cn(
                  'bg-card border border-border rounded-xl p-6',
                  'transition-all duration-300',
                  enabled && hasAccess && 'border-gold/20 shadow-glow-sm'
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-lg',
                        agent.iconBg
                      )}
                    >
                      <Icon className={cn('h-5 w-5', agent.iconColor)} />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-sm text-white">
                        {agent.title}
                      </h3>
                    </div>
                  </div>

                  {/* Status badge */}
                  {hasAccess ? (
                    <div
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold',
                        enabled
                          ? 'bg-green/10 text-green border border-green/20'
                          : 'bg-muted/10 text-muted border border-border'
                      )}
                    >
                      {enabled && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                      )}
                      {enabled ? 'Active' : 'Inactive'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-muted/10 text-muted border border-border">
                      Inactive
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-muted leading-relaxed mb-4">
                  {agent.description}
                </p>

                {/* Capabilities */}
                <div className="mb-5">
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                    Capabilities
                  </p>
                  <div className="space-y-1.5">
                    {agent.capabilities.map((cap, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-gold flex-shrink-0" />
                        <span className="text-xs text-text">{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-5 grid grid-cols-2 gap-3">
                  {stats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="bg-deep/50 rounded-lg px-3 py-2"
                    >
                      <p className="text-[10px] text-muted leading-none mb-1">
                        {stat.label}
                      </p>
                      <p className="text-sm font-semibold text-white tabular-nums">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      enabled={enabled && hasAccess}
                      onToggle={() => hasAccess && toggleAgent(agent.id)}
                    />
                    <span className="text-xs text-muted">
                      {enabled && hasAccess ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setConfigOpen(configOpen === agent.id ? null : agent.id)
                    }
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                      'border border-border text-muted',
                      'hover:text-white hover:border-gold/20 hover:bg-gold/5',
                      'transition-all duration-200',
                    )}
                  >
                    <Settings className="h-3 w-3" />
                    Configure
                  </button>
                </div>

                {/* Expandable config panel */}
                {configOpen === agent.id && (
                  <div className="mt-4 pt-4 border-t border-border animate-fade-up">
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                          Notification Email
                        </label>
                        <input
                          type="email"
                          placeholder="alerts@example.com"
                          className="mt-1 w-full h-8 px-3 rounded-lg bg-deep border border-border text-sm text-white placeholder-muted/50 outline-none focus:border-gold/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                          Operating Hours
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="time"
                            defaultValue="09:00"
                            className="h-8 px-3 rounded-lg bg-deep border border-border text-sm text-white outline-none focus:border-gold/30 transition-colors"
                          />
                          <span className="text-xs text-muted">to</span>
                          <input
                            type="time"
                            defaultValue="21:00"
                            className="h-8 px-3 rounded-lg bg-deep border border-border text-sm text-white outline-none focus:border-gold/30 transition-colors"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text">
                          Require approval before sending
                        </span>
                        <ToggleSwitch enabled={false} onToggle={() => {}} size="sm" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/*  AUTOMATION RULES                                             */}
        {/* ============================================================ */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-gold" />
              <h3 className="font-display font-semibold text-sm text-white">
                Active Automations
              </h3>
            </div>
            <span className="text-xs text-muted">
              {rules.filter((r) => r.active).length} of {rules.length} active
            </span>
          </div>

          <div className="space-y-1">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-lg',
                  'transition-colors duration-150',
                  'hover:bg-white/5'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      rule.active ? 'bg-green' : 'bg-muted/30'
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{rule.label}</p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {rule.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <ToggleSwitch
                    enabled={rule.active}
                    onToggle={() => toggleRule(rule.id)}
                    size="sm"
                  />
                  <button
                    type="button"
                    className="p-1.5 rounded-md text-muted hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/*  AUTOPILOT MODE (Elite only)                                  */}
        {/* ============================================================ */}
        {isElite && (
          <div
            className={cn(
              'bg-card border rounded-xl p-6',
              'transition-all duration-300',
              autopilotEnabled
                ? 'border-gold shadow-glow'
                : 'border-gold/30'
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold/10 border border-gold/20">
                  <Shield className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Autopilot Mode
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Let AI handle everything. You just approve decisions.
                  </p>
                </div>
              </div>

              <ToggleSwitch
                enabled={autopilotEnabled}
                onToggle={() => setAutopilotEnabled(!autopilotEnabled)}
                size="lg"
              />
            </div>

            {autopilotEnabled && autopilotActions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">
                  Recent Autopilot Actions
                </p>
                {autopilotActions.map((action) => {
                  const agentInfo = getAgentIcon(action.agent_type);
                  const AgentIcon = agentInfo.icon;

                  return (
                    <div
                      key={action.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg',
                        'bg-deep/50 border border-border',
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
                          agentInfo.bg
                        )}
                      >
                        <AgentIcon className={cn('h-4 w-4', agentInfo.color)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {action.action}
                        </p>
                        <p className="text-[10px] text-muted mt-0.5">
                          {formatDistanceToNow(new Date(action.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>

                      {action.approved === null ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApproveAction(action.id)}
                            className={cn(
                              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium',
                              'bg-green/10 text-green border border-green/20',
                              'hover:bg-green/20 transition-colors',
                            )}
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOverrideAction(action.id)}
                            className={cn(
                              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium',
                              'bg-red/10 text-red border border-red/20',
                              'hover:bg-red/20 transition-colors',
                            )}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Override
                          </button>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-1 rounded-full',
                            action.approved
                              ? 'bg-green/10 text-green'
                              : 'bg-red/10 text-red'
                          )}
                        >
                          {action.approved ? 'Approved' : 'Overridden'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/*  RECENT ACTIVITY                                              */}
        {/* ============================================================ */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted" />
              <h3 className="font-display font-semibold text-sm text-white">
                Recent Agent Activity
              </h3>
            </div>
            <span className="text-xs text-muted">Last 20 actions</span>
          </div>

          {activityLogs.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-border/50 mb-3">
                <Bot className="h-6 w-6 text-muted" />
              </div>
              <p className="text-sm text-muted">No agent activity yet</p>
              <p className="text-xs text-muted/60 mt-1">
                Enable an agent above to start automating your property management
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {activityLogs.map((log) => {
                const agentInfo = getAgentIcon(log.agent_type);
                const AgentIcon = agentInfo.icon;

                return (
                  <div
                    key={log.id}
                    className={cn(
                      'flex items-start gap-3 px-3 py-3 rounded-lg',
                      'transition-colors duration-150',
                      'hover:bg-white/5'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0',
                        agentInfo.bg
                      )}
                    >
                      <AgentIcon className={cn('h-4 w-4', agentInfo.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-snug">
                        {log.action}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                            log.status === 'success'
                              ? 'bg-green/10 text-green'
                              : log.status === 'error'
                              ? 'bg-red/10 text-red'
                              : 'bg-gold/10 text-gold'
                          )}
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>

                    <time className="text-xs text-muted whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                      })}
                    </time>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </FeatureGate>
  );
}
