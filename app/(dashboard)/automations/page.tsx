'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  DollarSign,
  FileText,
  UserPlus,
  Wrench,
  Megaphone,
  TrendingUp,
  Receipt,
  Shield,
  Star,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Play,
  Clock,
  Activity,
  Zap,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Automation {
  id: string;
  name: string;
  desc: string;
  saves: number;
  icon: React.ElementType;
  enabled: boolean;
  lastTriggered: string | null;
  timeline?: string[];
  expanded: boolean;
}

interface WorkflowAction {
  id: string;
  type: string;
  config: string;
}

interface CustomWorkflow {
  id: string;
  name: string;
  trigger: string;
  conditions: { label: string; enabled: boolean }[];
  actions: WorkflowAction[];
  enabled: boolean;
  createdAt: string;
}

interface ActivityEntry {
  id: string;
  time: string;
  automation: string;
  automationId: string;
  action: string;
  affected: string;
  property: string;
  status: 'success' | 'pending' | 'failed';
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/* ------------------------------------------------------------------ */
/*  Initial Data                                                       */
/* ------------------------------------------------------------------ */

const INITIAL_AUTOMATIONS: Automation[] = [
  {
    id: 'RENT_COLLECTION',
    name: 'Rent Collection Autopilot',
    desc: 'Automatically reminds tenants before rent is due, sends late notices when overdue, makes AI voice calls on day 3, and escalates to formal notices if needed.',
    saves: 8,
    icon: DollarSign,
    enabled: true,
    lastTriggered: '2 hours ago',
    timeline: [
      'Day -3: Email reminder sent',
      'Day 0: Final reminder before due',
      'Day +1: Late notice sent',
      'Day +3: AI voice call to tenant',
      'Day +7: Formal notice generated',
      'Day +10: Final notice + escalation',
    ],
    expanded: false,
  },
  {
    id: 'LEASE_RENEWAL',
    name: 'Lease Renewal Autopilot',
    desc: 'Automatically contacts tenants about lease renewal at 90, 60, and 30 days before expiration with current market rent data attached.',
    saves: 5,
    icon: FileText,
    enabled: true,
    lastTriggered: '1 day ago',
    expanded: false,
  },
  {
    id: 'NEW_TENANT_WELCOME',
    name: 'New Tenant Welcome',
    desc: 'Automatically sends welcome emails, move-in checklists, portal login info, utility contacts, and a 30-day check-in to every new tenant.',
    saves: 2,
    icon: UserPlus,
    enabled: false,
    lastTriggered: null,
    expanded: false,
  },
  {
    id: 'MAINTENANCE_RESPONSE',
    name: 'Maintenance Response',
    desc: 'Automatically acknowledges maintenance requests, finds and contacts contractors, collects bids, and updates tenants on status.',
    saves: 4,
    icon: Wrench,
    enabled: true,
    lastTriggered: '4 hours ago',
    expanded: false,
  },
  {
    id: 'VACANCY_MARKETING',
    name: 'Vacancy Marketing',
    desc: 'When a unit goes vacant, automatically generates a listing, publishes to platforms, responds to inquiries, and schedules showings.',
    saves: 6,
    icon: Megaphone,
    enabled: false,
    lastTriggered: null,
    expanded: false,
  },
  {
    id: 'MARKET_MONITORING',
    name: 'Market Monitoring',
    desc: 'Watches your markets 24/7. Sends you an alert the moment cap rates, inventory, or rent growth shifts significantly.',
    saves: 12,
    icon: TrendingUp,
    enabled: true,
    lastTriggered: '30 minutes ago',
    expanded: false,
  },
  {
    id: 'TAX_TRACKING',
    name: 'Tax Tracking',
    desc: 'Automatically categorizes every transaction, updates your Schedule E, tracks depreciation, and reminds you of quarterly payment deadlines.',
    saves: 10,
    icon: Receipt,
    enabled: true,
    lastTriggered: '6 hours ago',
    expanded: false,
  },
  {
    id: 'INSURANCE_MONITORING',
    name: 'Insurance Monitoring',
    desc: 'Tracks all policy expiration dates and sends renewal reminders 90 days out. Flags if any property appears underinsured.',
    saves: 2,
    icon: Shield,
    enabled: false,
    lastTriggered: null,
    expanded: false,
  },
  {
    id: 'CONTRACTOR_FOLLOWUP',
    name: 'Contractor Follow-Up',
    desc: 'After every completed job automatically sends tenant a satisfaction check and updates the contractor\'s rating.',
    saves: 1,
    icon: Star,
    enabled: false,
    lastTriggered: null,
    expanded: false,
  },
];

const WORKFLOW_TEMPLATES = [
  {
    id: 'eviction-prevention',
    name: 'Eviction Prevention Sequence',
    desc: 'Multi-step escalation to retain tenants before formal eviction proceedings begin.',
    trigger: 'rent_late',
    actions: ['Send email', 'Wait X days', 'Make voice call', 'Send SMS', 'Create task for me'],
  },
  {
    id: 'brrrr-checklist',
    name: 'BRRRR Purchase Checklist',
    desc: 'Automated task sequences for Buy, Rehab, Rent, Refinance, Repeat strategy.',
    trigger: 'deal_score',
    actions: ['Create task for me', 'Send notification', 'Add note to tenant'],
  },
  {
    id: 'annual-review',
    name: 'Annual Portfolio Review',
    desc: 'Yearly automated review of all properties including market comp analysis.',
    trigger: 'scheduled',
    actions: ['Send email', 'Create task for me', 'Send notification'],
  },
  {
    id: 'lender-update',
    name: 'Private Lender Update Sequence',
    desc: 'Automatically send performance reports to your private lenders on schedule.',
    trigger: 'scheduled',
    actions: ['Send email', 'Send notification'],
  },
  {
    id: 'seasonal-maintenance',
    name: 'Seasonal Maintenance Campaign',
    desc: 'Schedule seasonal property inspections and preventive maintenance automatically.',
    trigger: 'scheduled',
    actions: ['Create task for me', 'Send email', 'Send notification'],
  },
  {
    id: 'vacancy-fill',
    name: 'Vacancy Fill Campaign',
    desc: 'Full marketing blitz when a unit goes vacant until a new lease is signed.',
    trigger: 'property_vacant',
    actions: ['Send email', 'Send SMS', 'Create task for me', 'Send notification'],
  },
  {
    id: 'year-end-tax',
    name: 'Year-End Tax Prep Sequence',
    desc: 'Automated checklist and document collection for year-end tax preparation.',
    trigger: 'scheduled',
    actions: ['Create task for me', 'Send email', 'Send notification'],
  },
];

const TRIGGER_OPTIONS = [
  { value: 'rent_late', label: 'Rent is X days late' },
  { value: 'lease_expiry', label: 'Lease expires in X days' },
  { value: 'maintenance_created', label: 'Maintenance request created' },
  { value: 'new_tenant', label: 'New tenant added' },
  { value: 'property_vacant', label: 'Property goes vacant' },
  { value: 'deal_score', label: 'Deal score above X' },
  { value: 'scheduled', label: 'Date/time (scheduled)' },
];

const ACTION_OPTIONS = [
  { value: 'send_email', label: 'Send email' },
  { value: 'voice_call', label: 'Make voice call' },
  { value: 'send_sms', label: 'Send SMS' },
  { value: 'create_task', label: 'Create task for me' },
  { value: 'send_notification', label: 'Send notification' },
  { value: 'add_note', label: 'Add note to tenant' },
  { value: 'wait', label: 'Wait X days' },
];

const INITIAL_ACTIVITY: ActivityEntry[] = [
  { id: '1', time: '2 min ago', automation: 'Rent Collection Autopilot', automationId: 'RENT_COLLECTION', action: 'Sent late notice email', affected: 'Marcus Johnson', property: '4821 Elm St, Unit B', status: 'success' },
  { id: '2', time: '18 min ago', automation: 'Market Monitoring', automationId: 'MARKET_MONITORING', action: 'Cap rate alert triggered', affected: 'Phoenix 85004', property: 'Market Watch', status: 'success' },
  { id: '3', time: '1 hour ago', automation: 'Maintenance Response', automationId: 'MAINTENANCE_RESPONSE', action: 'Acknowledged request #1847', affected: 'Sarah Williams', property: '220 Oak Ave, Unit 3A', status: 'success' },
  { id: '4', time: '2 hours ago', automation: 'Rent Collection Autopilot', automationId: 'RENT_COLLECTION', action: 'AI voice call placed', affected: 'David Chen', property: '1501 Pine Rd', status: 'success' },
  { id: '5', time: '3 hours ago', automation: 'Tax Tracking', automationId: 'TAX_TRACKING', action: 'Categorized 12 transactions', affected: 'Portfolio-wide', property: 'All Properties', status: 'success' },
  { id: '6', time: '5 hours ago', automation: 'Lease Renewal Autopilot', automationId: 'LEASE_RENEWAL', action: 'Sent 90-day renewal notice', affected: 'Emily Rodriguez', property: '302 Maple Dr, Unit 2', status: 'success' },
  { id: '7', time: '6 hours ago', automation: 'Maintenance Response', automationId: 'MAINTENANCE_RESPONSE', action: 'Contacted contractor for bid', affected: 'Mike\'s Plumbing Co.', property: '4821 Elm St, Unit A', status: 'pending' },
  { id: '8', time: '8 hours ago', automation: 'Tax Tracking', automationId: 'TAX_TRACKING', action: 'Quarterly payment reminder sent', affected: 'You', property: 'Portfolio-wide', status: 'success' },
  { id: '9', time: '12 hours ago', automation: 'Market Monitoring', automationId: 'MARKET_MONITORING', action: 'Rent growth shift detected', affected: 'Tempe 85281', property: 'Market Watch', status: 'success' },
  { id: '10', time: '1 day ago', automation: 'Rent Collection Autopilot', automationId: 'RENT_COLLECTION', action: 'Sent payment reminder email', affected: 'James Wilson', property: '892 Birch Ln', status: 'failed' },
];

/* ------------------------------------------------------------------ */
/*  Toggle Switch (inline)                                             */
/* ------------------------------------------------------------------ */

function ToggleSwitch({
  enabled,
  onToggle,
  size = 'md',
}: {
  enabled: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
}) {
  const isSm = size === 'sm';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex items-center rounded-full transition-colors duration-200 ease-out shrink-0',
        isSm ? 'h-5 w-9' : 'h-6 w-11',
        enabled ? 'bg-gold' : 'bg-border',
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow-sm transition-transform duration-200',
          isSm ? 'h-3 w-3' : 'h-4 w-4',
          enabled
            ? isSm ? 'translate-x-5' : 'translate-x-6'
            : 'translate-x-1',
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Automation Card                                                    */
/* ------------------------------------------------------------------ */

function AutomationCard({
  automation,
  onToggle,
  onExpand,
}: {
  automation: Automation;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const Icon = automation.icon;

  return (
    <div
      className="rounded-lg overflow-hidden glow-border transition-all duration-300"
      style={{
        background: '#111111',
        border: `1px solid ${automation.enabled ? 'rgba(201, 168, 76, 0.25)' : '#1e1e1e'}`,
      }}
    >
      <div className="p-5">
        {/* Top row: icon + name + badge + toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors duration-200',
                automation.enabled
                  ? 'bg-gold/10 text-gold'
                  : 'bg-border/40 text-muted',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-display font-semibold text-white text-[15px] leading-tight">
                  {automation.name}
                </h3>
                <Badge
                  variant={automation.enabled ? 'success' : 'muted'}
                  size="sm"
                  dot={automation.enabled}
                >
                  {automation.enabled ? 'Running' : 'Paused'}
                </Badge>
              </div>
              <p className="text-sm text-muted font-body mt-1.5 leading-relaxed">
                {automation.desc}
              </p>
            </div>
          </div>
          <ToggleSwitch enabled={automation.enabled} onToggle={onToggle} />
        </div>

        {/* Bottom row: saves + last triggered + expand */}
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid #1e1e1e' }}>
          <div className="flex items-center gap-4">
            <span className="text-gold text-xs font-mono">
              Saves {automation.saves} hrs/month
            </span>
            {automation.enabled && automation.lastTriggered && (
              <span className="flex items-center gap-1.5 text-xs text-muted font-body">
                <Clock className="h-3 w-3" strokeWidth={1.5} />
                Last triggered: {automation.lastTriggered}
              </span>
            )}
          </div>
          {automation.timeline && automation.timeline.length > 0 && (
            <button
              type="button"
              onClick={onExpand}
              className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors font-body"
            >
              {automation.expanded ? 'Hide' : 'Timeline'}
              {automation.expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expandable timeline */}
      {automation.expanded && automation.timeline && (
        <div
          className="px-5 pb-5 animate-fade-up"
          style={{ borderTop: '1px solid #1e1e1e' }}
        >
          <div className="pt-4">
            <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-3">
              Automation Timeline
            </p>
            <div className="space-y-2.5">
              {automation.timeline.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-gold/60 shrink-0" />
                    {i < automation.timeline!.length - 1 && (
                      <div className="w-px h-4 bg-border mt-1" />
                    )}
                  </div>
                  <span className="text-xs text-muted font-body leading-relaxed">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Workflow Template Card                                              */
/* ------------------------------------------------------------------ */

function WorkflowTemplateCard({
  template,
  onUse,
}: {
  template: typeof WORKFLOW_TEMPLATES[number];
  onUse: () => void;
}) {
  return (
    <div
      className="rounded-lg p-4 transition-all duration-200 hover:border-gold/20 group"
      style={{
        background: '#111111',
        border: '1px solid #1e1e1e',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-display font-semibold text-white text-sm leading-tight">
            {template.name}
          </h4>
          <p className="text-xs text-muted font-body mt-1.5 leading-relaxed">
            {template.desc}
          </p>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="text-[10px] text-muted-deep font-mono">
              {template.actions.length} actions
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onUse}
          className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
        >
          Use Template
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Workflow Builder Modal                                              */
/* ------------------------------------------------------------------ */

function WorkflowBuilderModal({
  open,
  onOpenChange,
  initialTemplate,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTemplate: typeof WORKFLOW_TEMPLATES[number] | null;
  onSave: (workflow: CustomWorkflow) => void;
}) {
  const [workflowName, setWorkflowName] = useState(initialTemplate?.name || '');
  const [trigger, setTrigger] = useState(initialTemplate?.trigger || '');
  const [conditions, setConditions] = useState<{ label: string; enabled: boolean }[]>([
    { label: 'Only during business hours', enabled: false },
    { label: 'Skip if tenant has open dispute', enabled: false },
    { label: 'Only for residential properties', enabled: true },
    { label: 'Exclude properties under renovation', enabled: false },
  ]);
  const [actions, setActions] = useState<WorkflowAction[]>(
    initialTemplate
      ? initialTemplate.actions.map((a, i) => ({
          id: `action-${i}`,
          type: ACTION_OPTIONS.find((o) => o.label === a)?.value || 'send_email',
          config: '',
        }))
      : [{ id: 'action-0', type: 'send_email', config: '' }],
  );

  // Reset when template changes
  React.useEffect(() => {
    if (initialTemplate) {
      setWorkflowName(initialTemplate.name);
      setTrigger(initialTemplate.trigger);
      setActions(
        initialTemplate.actions.map((a, i) => ({
          id: `action-${i}`,
          type: ACTION_OPTIONS.find((o) => o.label === a)?.value || 'send_email',
          config: '',
        })),
      );
    } else {
      setWorkflowName('');
      setTrigger('');
      setActions([{ id: 'action-0', type: 'send_email', config: '' }]);
    }
  }, [initialTemplate]);

  function addAction() {
    setActions((prev) => [
      ...prev,
      { id: `action-${Date.now()}`, type: 'send_email', config: '' },
    ]);
  }

  function removeAction(id: string) {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  function updateAction(id: string, type: string) {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, type } : a)),
    );
  }

  function toggleCondition(index: number) {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, enabled: !c.enabled } : c)),
    );
  }

  function handleSave() {
    if (!workflowName.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }
    if (!trigger) {
      toast.error('Please select a trigger');
      return;
    }
    if (actions.length === 0) {
      toast.error('Add at least one action');
      return;
    }
    const workflow: CustomWorkflow = {
      id: `wf-${Date.now()}`,
      name: workflowName,
      trigger,
      conditions: conditions.filter((c) => c.enabled),
      actions,
      enabled: true,
      createdAt: 'Just now',
    };
    onSave(workflow);
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="xl" className="max-h-[85vh] overflow-y-auto">
        <ModalHeader
          title={initialTemplate ? `Configure: ${initialTemplate.name}` : 'Build Custom Workflow'}
          description="Define a trigger, set conditions, then chain actions in sequence."
        />

        <div className="px-6 py-4 space-y-6">
          {/* Workflow Name */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-body text-muted mb-1.5">
              Workflow Name
            </label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="e.g. Late Rent Escalation"
              className="w-full h-10 px-3 text-sm bg-transparent text-white font-body border rounded-lg placeholder:text-muted-deep transition-all duration-200 focus:outline-none focus:shadow-glow-sm"
              style={{ borderColor: '#1e1e1e', backgroundColor: '#080808' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#1e1e1e'; }}
            />
          </div>

          {/* Visual Flow: TRIGGER -> CONDITIONS -> ACTIONS */}
          <div className="space-y-4">
            {/* TRIGGER */}
            <div
              className="rounded-lg p-4"
              style={{ background: '#0F1620', border: '1px solid #1e1e1e' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-gold/10">
                  <Zap className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
                </div>
                <span className="text-xs font-display font-semibold text-white uppercase tracking-wider">
                  Trigger
                </span>
                <div className="flex-1 h-px bg-border/30" />
              </div>
              <Select
                options={TRIGGER_OPTIONS}
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="Select a trigger..."
              />
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-px h-3 bg-border" />
                <ArrowRight className="h-4 w-4 text-muted rotate-90" />
                <div className="w-px h-3 bg-border" />
              </div>
            </div>

            {/* CONDITIONS */}
            <div
              className="rounded-lg p-4"
              style={{ background: '#0F1620', border: '1px solid #1e1e1e' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-gold-light/10">
                  <Filter className="h-3.5 w-3.5 text-gold-light" strokeWidth={2} />
                </div>
                <span className="text-xs font-display font-semibold text-white uppercase tracking-wider">
                  Conditions
                </span>
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[10px] text-muted font-body">Optional</span>
              </div>
              <div className="space-y-2">
                {conditions.map((cond, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="text-sm text-muted font-body">{cond.label}</span>
                    <ToggleSwitch
                      enabled={cond.enabled}
                      onToggle={() => toggleCondition(i)}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-px h-3 bg-border" />
                <ArrowRight className="h-4 w-4 text-muted rotate-90" />
                <div className="w-px h-3 bg-border" />
              </div>
            </div>

            {/* ACTIONS */}
            <div
              className="rounded-lg p-4"
              style={{ background: '#0F1620', border: '1px solid #1e1e1e' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-green/10">
                  <Play className="h-3.5 w-3.5 text-green" strokeWidth={2} />
                </div>
                <span className="text-xs font-display font-semibold text-white uppercase tracking-wider">
                  Actions
                </span>
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[10px] text-muted font-body">{actions.length} step{actions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {actions.map((action, i) => (
                  <div key={action.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-deep font-mono w-5 shrink-0 text-right">
                      {i + 1}.
                    </span>
                    <div className="flex-1">
                      <select
                        value={action.type}
                        onChange={(e) => updateAction(action.id, e.target.value)}
                        className="w-full h-9 px-3 text-sm bg-transparent text-white font-body border rounded-lg appearance-none transition-all duration-200 focus:outline-none focus:shadow-glow-sm"
                        style={{ borderColor: '#1e1e1e', backgroundColor: '#080808' }}
                      >
                        {ACTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {actions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAction(action.id)}
                        className="p-1.5 rounded text-muted hover:text-red hover:bg-red/5 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addAction}
                className="mt-3 flex items-center gap-1.5 text-xs text-gold hover:text-gold-light font-body transition-colors"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Add Action
              </button>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="solid" size="sm" onClick={handleSave}>
            Save Workflow
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Status icon helper                                                 */
/* ------------------------------------------------------------------ */

function StatusIcon({ status }: { status: ActivityEntry['status'] }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green" strokeWidth={1.5} />;
    case 'pending':
      return <AlertCircle className="h-3.5 w-3.5 text-warning" strokeWidth={1.5} />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-red" strokeWidth={1.5} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function AutomationCenterPage() {
  const supabase = createClient();
  const [automations, setAutomations] = useState<Automation[]>(INITIAL_AUTOMATIONS);
  const [customWorkflows, setCustomWorkflows] = useState<CustomWorkflow[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(INITIAL_ACTIVITY);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof WORKFLOW_TEMPLATES[number] | null>(null);
  const [activityFilter, setActivityFilter] = useState('all');

  /* ---- Load persisted state from Supabase ---- */
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load automation toggle states
      const { data: configs } = await supabase
        .from('automation_configs')
        .select('automation_id, enabled')
        .eq('user_id', user.id);

      if (configs && configs.length > 0) {
        setAutomations((prev) =>
          prev.map((a) => {
            const saved = configs.find((c: Record<string, unknown>) => c.automation_id === a.id);
            return saved ? { ...a, enabled: saved.enabled as boolean } : a;
          })
        );
      } else {
        // Seed defaults on first visit
        const defaults = INITIAL_AUTOMATIONS.map((a) => ({
          user_id: user.id,
          automation_id: a.id,
          enabled: a.enabled,
        }));
        await supabase.from('automation_configs').insert(defaults);
      }

      // Load custom workflows
      const { data: workflows } = await supabase
        .from('custom_workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (workflows && workflows.length > 0) {
        setCustomWorkflows(
          workflows.map((w: Record<string, unknown>) => ({
            id: w.id as string,
            name: w.name as string,
            trigger: w.trigger_type as string,
            conditions: (w.conditions as { label: string; enabled: boolean }[]) || [],
            actions: (w.actions as WorkflowAction[]) || [],
            enabled: w.enabled as boolean,
            createdAt: formatTime(w.created_at as string),
          }))
        );
      }

      // Load activity logs
      const { data: logs } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (logs && logs.length > 0) {
        setActivityLog(
          logs.map((l: Record<string, unknown>) => ({
            id: l.id as string,
            time: formatTime(l.created_at as string),
            automation: (l.automation_name as string) || 'Automation',
            automationId: (l.automation_id as string) || '',
            action: (l.action as string) || '',
            affected: (l.affected as string) || '',
            property: (l.property as string) || '',
            status: (l.status as string as ActivityEntry['status']) || 'success',
          }))
        );
      }
    }
    loadData();
  }, [supabase]);

  /* ---- Computed stats ---- */
  const activeCount = useMemo(
    () => automations.filter((a) => a.enabled).length,
    [automations],
  );
  const totalHoursSaved = useMemo(
    () => automations.filter((a) => a.enabled).reduce((sum, a) => sum + a.saves, 0),
    [automations],
  );

  /* ---- Handlers ---- */
  const toggleAutomation = useCallback(async (id: string) => {
    const automation = automations.find((a) => a.id === id);
    if (!automation) return;
    const next = !automation.enabled;

    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        toast.success(`${a.name} ${next ? 'enabled' : 'paused'}`);
        return { ...a, enabled: next, lastTriggered: next ? a.lastTriggered : null };
      }),
    );

    // Persist to DB
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('automation_configs')
        .update({ enabled: next })
        .eq('user_id', user.id)
        .eq('automation_id', id);
    }
  }, [automations, supabase]);

  const toggleExpand = useCallback((id: string) => {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, expanded: !a.expanded } : a,
      ),
    );
  }, []);

  const openTemplateBuilder = useCallback((template: typeof WORKFLOW_TEMPLATES[number]) => {
    setSelectedTemplate(template);
    setBuilderOpen(true);
  }, []);

  const openBlankBuilder = useCallback(() => {
    setSelectedTemplate(null);
    setBuilderOpen(true);
  }, []);

  const saveWorkflow = useCallback(async (workflow: CustomWorkflow) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('custom_workflows')
        .insert({
          user_id: user.id,
          name: workflow.name,
          trigger_type: workflow.trigger,
          conditions: workflow.conditions,
          actions: workflow.actions,
          enabled: workflow.enabled,
        })
        .select('id')
        .single();
      if (data) workflow.id = data.id;
    }
    setCustomWorkflows((prev) => [...prev, workflow]);
    toast.success(`Workflow "${workflow.name}" saved and enabled`);
  }, [supabase]);

  const toggleWorkflow = useCallback(async (id: string) => {
    const wf = customWorkflows.find((w) => w.id === id);
    if (!wf) return;
    const next = !wf.enabled;
    setCustomWorkflows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        toast.success(`${w.name} ${next ? 'enabled' : 'paused'}`);
        return { ...w, enabled: next };
      }),
    );
    await supabase.from('custom_workflows').update({ enabled: next }).eq('id', id);
  }, [customWorkflows, supabase]);

  const removeWorkflow = useCallback(async (id: string) => {
    setCustomWorkflows((prev) => prev.filter((w) => w.id !== id));
    toast.info('Workflow removed');
    await supabase.from('custom_workflows').delete().eq('id', id);
  }, [supabase]);

  /* ---- Filtered activity ---- */
  const filteredActivity = useMemo(() => {
    if (activityFilter === 'all') return activityLog;
    return activityLog.filter((a) => a.automationId === activityFilter);
  }, [activityFilter, activityLog]);

  /* ---- Filter options ---- */
  const activityFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Automations' },
      ...automations.map((a) => ({ value: a.id, label: a.name })),
    ],
    [automations],
  );

  /* ================================================================== */
  /*  RENDER                                                             */
  /* ================================================================== */

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ============================================================ */}
      {/*  SECTION 1: Header + Stats Banner                             */}
      {/* ============================================================ */}
      <div>
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white tracking-tight">
          Automation Center
        </h1>
        <p className="font-body text-sm text-muted mt-1.5">
          Your portfolio runs itself. Enable what you need.
        </p>

        {/* Stats banner */}
        <div
          className="mt-5 rounded-lg p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6"
          style={{
            background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.08) 0%, rgba(201, 168, 76, 0.03) 100%)',
            border: '1px solid rgba(201, 168, 76, 0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold/10">
              <Zap className="h-5 w-5 text-gold" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-body text-sm text-white">
                <span className="font-display font-bold text-gold">{activeCount}</span> automation{activeCount !== 1 ? 's' : ''} active
                <span className="text-muted mx-1.5">&mdash;</span>
                saving you an estimated{' '}
                <span className="font-display font-bold text-gold">{totalHoursSaved}</span> hours this month
              </p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="text-[11px] text-muted font-body">All systems operational</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 2: Quick Enable Automation Toggle Cards               */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[10px] uppercase tracking-wider font-body text-muted">
            Automations
          </span>
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-[10px] text-muted-deep font-mono">
            {automations.length} total
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {automations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onToggle={() => toggleAutomation(automation.id)}
              onExpand={() => toggleExpand(automation.id)}
            />
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 3: Custom Workflow Builder                            */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-white">
              Custom Workflows
            </h2>
            <p className="font-body text-sm text-muted mt-0.5">
              Build your own automated sequences
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={openBlankBuilder}
          >
            New Workflow
          </Button>
        </div>

        {/* Templates grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {WORKFLOW_TEMPLATES.map((template) => (
            <WorkflowTemplateCard
              key={template.id}
              template={template}
              onUse={() => openTemplateBuilder(template)}
            />
          ))}
        </div>

        {/* Saved custom workflows */}
        {customWorkflows.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] uppercase tracking-wider font-body text-muted">
                Your Workflows
              </span>
              <div className="flex-1 h-px bg-border/30" />
              <span className="text-[10px] text-muted-deep font-mono">
                {customWorkflows.length} saved
              </span>
            </div>
            <div className="space-y-2">
              {customWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between gap-4 rounded-lg p-4"
                  style={{
                    background: '#111111',
                    border: `1px solid ${workflow.enabled ? 'rgba(201, 168, 76, 0.25)' : '#1e1e1e'}`,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded shrink-0',
                        workflow.enabled
                          ? 'bg-gold/10 text-gold'
                          : 'bg-border/40 text-muted',
                      )}
                    >
                      <Zap className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-semibold text-white text-sm truncate">
                          {workflow.name}
                        </h4>
                        <Badge
                          variant={workflow.enabled ? 'success' : 'muted'}
                          size="sm"
                          dot={workflow.enabled}
                        >
                          {workflow.enabled ? 'Running' : 'Paused'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted font-body mt-0.5">
                        {TRIGGER_OPTIONS.find((t) => t.value === workflow.trigger)?.label || workflow.trigger}
                        <span className="text-muted-deep mx-1">&middot;</span>
                        {workflow.actions.length} action{workflow.actions.length !== 1 ? 's' : ''}
                        <span className="text-muted-deep mx-1">&middot;</span>
                        Created {workflow.createdAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ToggleSwitch
                      enabled={workflow.enabled}
                      onToggle={() => toggleWorkflow(workflow.id)}
                      size="sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeWorkflow(workflow.id)}
                      className="p-1.5 rounded text-muted hover:text-red hover:bg-red/5 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 4: Activity Log                                       */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-white">
              Automation Activity
            </h2>
            <p className="font-body text-sm text-muted mt-0.5">
              Recent actions performed by your automations
            </p>
          </div>
          <div className="w-52">
            <Select
              options={activityFilterOptions}
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
            />
          </div>
        </div>

        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: '#111111',
            border: '1px solid #1e1e1e',
          }}
        >
          {/* Table header */}
          <div
            className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] uppercase tracking-wider font-body text-muted"
            style={{ borderBottom: '1px solid #1e1e1e', background: '#0A0E15' }}
          >
            <div className="col-span-2">Time</div>
            <div className="col-span-2">Automation</div>
            <div className="col-span-3">Action</div>
            <div className="col-span-2">Affected</div>
            <div className="col-span-2">Property</div>
            <div className="col-span-1 text-right">Status</div>
          </div>

          {/* Table rows */}
          <div className="divide-y" style={{ borderColor: '#1e1e1e' }}>
            {filteredActivity.map((entry, i) => (
              <div
                key={entry.id}
                className={cn(
                  'grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-3.5 transition-colors',
                  i % 2 === 0 ? 'bg-transparent' : '',
                )}
                style={i % 2 !== 0 ? { background: 'rgba(15, 22, 32, 0.4)' } : undefined}
              >
                {/* Mobile labels */}
                <div className="md:hidden flex items-center justify-between">
                  <span className="text-xs text-muted font-body">{entry.time}</span>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={entry.status} />
                    <Badge
                      variant={entry.status === 'success' ? 'success' : entry.status === 'pending' ? 'warning' : 'danger'}
                      size="sm"
                    >
                      {entry.status}
                    </Badge>
                  </div>
                </div>
                <div className="md:hidden">
                  <p className="text-sm text-white font-body">{entry.action}</p>
                  <p className="text-xs text-muted font-body mt-0.5">
                    {entry.automation} &middot; {entry.affected} &middot; {entry.property}
                  </p>
                </div>

                {/* Desktop columns */}
                <div className="hidden md:flex col-span-2 items-center">
                  <span className="text-xs text-muted font-body">{entry.time}</span>
                </div>
                <div className="hidden md:flex col-span-2 items-center">
                  <span className="text-xs text-white font-body truncate">{entry.automation}</span>
                </div>
                <div className="hidden md:flex col-span-3 items-center">
                  <span className="text-xs text-muted font-body">{entry.action}</span>
                </div>
                <div className="hidden md:flex col-span-2 items-center">
                  <span className="text-xs text-muted font-body truncate">{entry.affected}</span>
                </div>
                <div className="hidden md:flex col-span-2 items-center">
                  <span className="text-xs text-muted font-body truncate">{entry.property}</span>
                </div>
                <div className="hidden md:flex col-span-1 items-center justify-end gap-1.5">
                  <StatusIcon status={entry.status} />
                  <span
                    className={cn(
                      'text-[10px] font-body capitalize',
                      entry.status === 'success' && 'text-green',
                      entry.status === 'pending' && 'text-warning',
                      entry.status === 'failed' && 'text-red',
                    )}
                  >
                    {entry.status}
                  </span>
                </div>
              </div>
            ))}

            {filteredActivity.length === 0 && (
              <div className="px-5 py-12 text-center">
                <Activity className="h-8 w-8 text-muted-deep mx-auto mb-3" strokeWidth={1} />
                <p className="text-sm text-muted font-body">
                  No activity found for this automation
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Workflow Builder Modal                                        */}
      {/* ============================================================ */}
      <WorkflowBuilderModal
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        initialTemplate={selectedTemplate}
        onSave={saveWorkflow}
      />
    </div>
  );
}
