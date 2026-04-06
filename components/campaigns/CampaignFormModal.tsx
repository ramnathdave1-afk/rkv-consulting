'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Users,
  PenLine,
  Eye,
  MessageSquare,
  Mail,
  Send,
  CalendarClock,
  Tag,
} from 'lucide-react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea, SelectField } from '@/components/ui/Input';
import toast from 'react-hot-toast';

/* ─── Types ──────────────────────────────────────────────────────── */

interface Property {
  id: string;
  name: string;
}

interface AudienceFilter {
  property_id?: string;
  tenant_status?: string[];
  lease_active?: boolean;
}

interface CampaignFormData {
  name: string;
  channel: 'sms' | 'email' | 'both';
  subject: string;
  message_body: string;
  audience_filter: AudienceFilter;
  scheduled_at: string;
  send_now: boolean;
}

const STEPS = [
  { label: 'Basics', icon: <Megaphone size={16} /> },
  { label: 'Audience', icon: <Users size={16} /> },
  { label: 'Compose', icon: <PenLine size={16} /> },
  { label: 'Review', icon: <Eye size={16} /> },
];

const CHANNEL_OPTIONS = [
  { value: 'sms', label: 'SMS', icon: <MessageSquare size={16} /> },
  { value: 'email', label: 'Email', icon: <Mail size={16} /> },
  { value: 'both', label: 'Both', icon: <Send size={16} /> },
];

const TENANT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'applicant', label: 'Applicant' },
  { value: 'approved', label: 'Approved' },
  { value: 'notice', label: 'Notice' },
  { value: 'past', label: 'Past' },
];

const MERGE_TAGS = [
  { tag: '{tenant_name}', label: 'Tenant Name' },
  { tag: '{property_name}', label: 'Property' },
  { tag: '{unit_number}', label: 'Unit #' },
];

/* ─── Component ──────────────────────────────────────────────────── */

interface CampaignFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CampaignFormModal({
  open,
  onOpenChange,
  onCreated,
}: CampaignFormModalProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);

  const [form, setForm] = useState<CampaignFormData>({
    name: '',
    channel: 'sms',
    subject: '',
    message_body: '',
    audience_filter: {
      property_id: '',
      tenant_status: [],
      lease_active: true,
    },
    scheduled_at: '',
    send_now: true,
  });

  // Fetch properties for the audience filter
  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns?_properties=1');
      // We don't have a dedicated endpoint; load from the main page or inline
    } catch {}
  }, []);

  useEffect(() => {
    if (open) {
      // Reset
      setStep(0);
      setForm({
        name: '',
        channel: 'sms',
        subject: '',
        message_body: '',
        audience_filter: { property_id: '', tenant_status: [], lease_active: true },
        scheduled_at: '',
        send_now: true,
      });
    }
  }, [open]);

  const updateForm = (patch: Partial<CampaignFormData>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const updateFilter = (patch: Partial<AudienceFilter>) =>
    setForm((prev) => ({
      ...prev,
      audience_filter: { ...prev.audience_filter, ...patch },
    }));

  const toggleStatus = (status: string) => {
    const current = form.audience_filter.tenant_status || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateFilter({ tenant_status: next });
  };

  const insertMergeTag = (tag: string) => {
    updateForm({ message_body: form.message_body + tag });
  };

  const smsCharCount = form.message_body.length;
  const smsOverLimit = form.channel !== 'email' && smsCharCount > 160;

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return form.name.trim().length > 0;
      case 1:
        return (form.audience_filter.tenant_status?.length || 0) > 0;
      case 2:
        return (
          form.message_body.trim().length > 0 &&
          (form.channel === 'sms' || form.subject.trim().length > 0)
        );
      case 3:
        return true;
      default:
        return false;
    }
  }, [step, form]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        channel: form.channel,
        subject: form.channel !== 'sms' ? form.subject : null,
        message_body: form.message_body,
        audience_filter: {
          ...(form.audience_filter.property_id
            ? { property_id: form.audience_filter.property_id }
            : {}),
          tenant_status: form.audience_filter.tenant_status,
          lease_active: form.audience_filter.lease_active,
        },
        scheduled_at: form.send_now ? null : form.scheduled_at || null,
      };

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create campaign');
        return;
      }

      // If send now, trigger send
      if (form.send_now && data.campaign?.id) {
        await fetch(`/api/campaigns/${data.campaign.id}/send`, {
          method: 'POST',
        });
        toast.success('Campaign created and sending started');
      } else {
        toast.success('Campaign created');
      }

      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error('An error occurred creating the campaign');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Step Renderers ───────────────────────────────────────────── */

  function StepBasics() {
    return (
      <div className="space-y-5">
        <Input
          label="Campaign Name"
          placeholder="e.g., March Rent Reminder"
          value={form.name}
          onChange={(e) => updateForm({ name: e.target.value })}
        />
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Channel
          </label>
          <div className="grid grid-cols-3 gap-3">
            {CHANNEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  updateForm({ channel: opt.value as CampaignFormData['channel'] })
                }
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  form.channel === opt.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-bg-primary text-text-secondary hover:border-border-hover'
                }`}
              >
                {opt.icon}
                <span className="text-xs font-semibold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function StepAudience() {
    return (
      <div className="space-y-5">
        <SelectField
          label="Property (optional)"
          placeholder="All Properties"
          value={form.audience_filter.property_id || ''}
          onChange={(e) => updateFilter({ property_id: e.target.value || undefined })}
          options={[
            { value: '', label: 'All Properties' },
            ...properties.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">
            Tenant Status (select one or more)
          </label>
          <div className="flex flex-wrap gap-2">
            {TENANT_STATUS_OPTIONS.map((opt) => {
              const selected = (form.audience_filter.tenant_status || []).includes(
                opt.value,
              );
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleStatus(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selected
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-bg-primary text-text-secondary hover:border-border-hover'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.audience_filter.lease_active ?? true}
              onChange={(e) => updateFilter({ lease_active: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-bg-elevated border border-border rounded-full peer peer-checked:bg-accent/20 peer-checked:border-accent transition-all after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-text-muted after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-accent" />
          </label>
          <span className="text-xs text-text-secondary">
            Only tenants with active leases
          </span>
        </div>
      </div>
    );
  }

  function StepCompose() {
    return (
      <div className="space-y-5">
        {form.channel !== 'sms' && (
          <Input
            label="Email Subject"
            placeholder="e.g., Important Notice from Your Property Manager"
            value={form.subject}
            onChange={(e) => updateForm({ subject: e.target.value })}
          />
        )}

        <div>
          <Textarea
            label="Message Body"
            placeholder="Write your message here..."
            value={form.message_body}
            onChange={(e) => updateForm({ message_body: e.target.value })}
            className="min-h-[140px]"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                Merge Tags:
              </span>
              {MERGE_TAGS.map((mt) => (
                <button
                  key={mt.tag}
                  onClick={() => insertMergeTag(mt.tag)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-elevated border border-border text-[11px] text-text-secondary hover:text-accent hover:border-accent transition-colors"
                >
                  <Tag size={10} />
                  {mt.label}
                </button>
              ))}
            </div>
            {form.channel !== 'email' && (
              <span
                className={`text-xs font-mono ${
                  smsOverLimit ? 'text-danger' : 'text-text-muted'
                }`}
              >
                {smsCharCount}/160
                {smsOverLimit && ' (exceeds SMS limit)'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  function StepReview() {
    const statusLabels = (form.audience_filter.tenant_status || []).join(', ') || 'None';
    return (
      <div className="space-y-5">
        <div className="bg-bg-primary/50 border border-border rounded-xl p-4 space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-text-muted font-semibold">
            Campaign Summary
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-text-muted text-xs">Name</p>
              <p className="text-text-primary font-medium">{form.name}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Channel</p>
              <p className="text-text-primary font-medium capitalize">
                {form.channel}
              </p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Audience</p>
              <p className="text-text-primary font-medium capitalize">
                {statusLabels}
              </p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Active Leases Only</p>
              <p className="text-text-primary font-medium">
                {form.audience_filter.lease_active ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>

        {form.channel !== 'sms' && (
          <div className="bg-bg-primary/50 border border-border rounded-xl p-4">
            <p className="text-text-muted text-xs mb-1">Subject</p>
            <p className="text-text-primary text-sm">{form.subject}</p>
          </div>
        )}

        <div className="bg-bg-primary/50 border border-border rounded-xl p-4">
          <p className="text-text-muted text-xs mb-2">Message Preview</p>
          <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">
            {form.message_body}
          </p>
        </div>

        {/* Schedule */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-text-secondary">
            Schedule
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateForm({ send_now: true })}
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                form.send_now
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-bg-primary text-text-secondary hover:border-border-hover'
              }`}
            >
              <Send size={14} />
              Send Now
            </button>
            <button
              onClick={() => updateForm({ send_now: false })}
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                !form.send_now
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-bg-primary text-text-secondary hover:border-border-hover'
              }`}
            >
              <CalendarClock size={14} />
              Schedule
            </button>
          </div>
          {!form.send_now && (
            <Input
              type="datetime-local"
              label="Send Date & Time"
              value={form.scheduled_at}
              onChange={(e) => updateForm({ scheduled_at: e.target.value })}
            />
          )}
        </div>
      </div>
    );
  }

  const stepContent = [
    <StepBasics key="basics" />,
    <StepAudience key="audience" />,
    <StepCompose key="compose" />,
    <StepReview key="review" />,
  ];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="lg" showClose>
        {/* Stepper */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.label}>
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    i === step
                      ? 'bg-accent/10 text-accent'
                      : i < step
                        ? 'text-accent/60 hover:text-accent cursor-pointer'
                        : 'text-text-muted'
                  }`}
                >
                  {s.icon}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px ${
                      i < step ? 'bg-accent/40' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="px-6 py-5 min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronLeft size={14} />}
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              variant="primary"
              size="sm"
              icon={<ChevronRight size={14} />}
              disabled={!canAdvance}
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<Send size={14} />}
              loading={submitting}
              onClick={handleSubmit}
            >
              {form.send_now ? 'Create & Send' : 'Create Campaign'}
            </Button>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
