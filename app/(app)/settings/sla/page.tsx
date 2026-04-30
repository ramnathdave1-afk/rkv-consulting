'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { Plus, Trash2, Pencil, X, Save } from 'lucide-react';

interface SlaPolicy {
  id: string;
  name: string;
  resource_type: string;
  priority: string | null;
  acknowledge_within_min: number | null;
  first_response_within_min: number | null;
  resolve_within_min: number | null;
  business_hours_only: boolean;
  enabled: boolean;
}

const DEFAULT_FORM = {
  name: '',
  resource_type: 'work_order',
  priority: '',
  acknowledge_within_min: 30,
  first_response_within_min: 30,
  resolve_within_min: 240,
  business_hours_only: false,
  enabled: true,
};

const RESOURCE_TYPES = [
  { value: 'work_order', label: 'Work order' },
  { value: 'tenant_message', label: 'Tenant message' },
  { value: 'maintenance_request', label: 'Maintenance request' },
  { value: 'lease_inquiry', label: 'Lease inquiry' },
];

const PRIORITIES = [
  { value: '', label: 'Any (catch-all)' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'high', label: 'High' },
  { value: 'standard', label: 'Standard' },
  { value: 'low', label: 'Low' },
];

const SUGGESTED_DEFAULTS: Array<typeof DEFAULT_FORM & { name: string }> = [
  { ...DEFAULT_FORM, name: 'Emergency work orders', resource_type: 'work_order', priority: 'emergency', acknowledge_within_min: 30, first_response_within_min: 30, resolve_within_min: 240 },
  { ...DEFAULT_FORM, name: 'High-priority work orders', resource_type: 'work_order', priority: 'high', acknowledge_within_min: 120, first_response_within_min: 120, resolve_within_min: 1440 },
  { ...DEFAULT_FORM, name: 'Standard work orders', resource_type: 'work_order', priority: 'standard', acknowledge_within_min: 1440, first_response_within_min: 1440, resolve_within_min: 4320 },
  { ...DEFAULT_FORM, name: 'Low-priority work orders', resource_type: 'work_order', priority: 'low', acknowledge_within_min: 4320, first_response_within_min: 4320, resolve_within_min: 10080 },
  { ...DEFAULT_FORM, name: 'Tenant messages', resource_type: 'tenant_message', priority: '', acknowledge_within_min: 30, first_response_within_min: 30, resolve_within_min: 1440 },
];

function fmtMin(min: number | null): string {
  if (min == null) return '—';
  if (min < 60) return `${min}m`;
  if (min < 60 * 24) return `${(min / 60).toFixed(min % 60 === 0 ? 0 : 1)}h`;
  return `${(min / 60 / 24).toFixed(min % 1440 === 0 ? 0 : 1)}d`;
}

export default function SlaSettingsPage() {
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/sla/policies');
    if (res.ok) {
      const json = await res.json();
      setPolicies(json.policies ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  }

  function openEdit(p: SlaPolicy) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      resource_type: p.resource_type,
      priority: p.priority ?? '',
      acknowledge_within_min: p.acknowledge_within_min ?? 30,
      first_response_within_min: p.first_response_within_min ?? 30,
      resolve_within_min: p.resolve_within_min ?? 240,
      business_hours_only: p.business_hours_only,
      enabled: p.enabled,
    });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, priority: form.priority || null };
    const res = editingId
      ? await fetch(`/api/sla/policies/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/sla/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (res.ok) {
      toast.success(editingId ? 'Policy updated' : 'Policy created');
      setShowForm(false);
      setEditingId(null);
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error ?? 'Failed to save policy');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this policy? Existing events stay tracked.')) return;
    const res = await fetch(`/api/sla/policies/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Deleted');
      load();
    } else {
      toast.error('Failed to delete');
    }
  }

  async function applyDefaults() {
    if (!confirm('Create the recommended default policies? Existing ones will not be overwritten.')) return;
    for (const d of SUGGESTED_DEFAULTS) {
      await fetch('/api/sla/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...d, priority: d.priority || null }),
      });
    }
    toast.success('Defaults created');
    load();
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">SLA Policies</h1>
          <p className="text-sm text-text-secondary">
            Define response and resolution targets per resource type and priority.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {policies.length === 0 && (
            <button
              onClick={applyDefaults}
              className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-tertiary"
            >
              Apply defaults
            </button>
          )}
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
          >
            <Plus size={14} /> New policy
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{editingId ? 'Edit policy' : 'New policy'}</h2>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="text-text-muted hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Name">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </Field>
            <Field label="Resource type">
              <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })} className="input">
                {RESOURCE_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Acknowledge within (min)">
              <input type="number" min={0} value={form.acknowledge_within_min} onChange={(e) => setForm({ ...form, acknowledge_within_min: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="First response within (min)">
              <input type="number" min={0} value={form.first_response_within_min} onChange={(e) => setForm({ ...form, first_response_within_min: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="Resolve within (min)">
              <input type="number" min={0} value={form.resolve_within_min} onChange={(e) => setForm({ ...form, resolve_within_min: Number(e.target.value) })} className="input" />
            </Field>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.business_hours_only} onChange={(e) => setForm({ ...form, business_hours_only: e.target.checked })} />
              Business hours only
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              Enabled
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save policy'}
            </button>
          </div>
        </form>
      )}

      <div className="glass-card p-0 overflow-hidden">
        {policies.length === 0 ? (
          <div className="p-6 text-sm text-text-muted">
            No policies yet. Click <strong>Apply defaults</strong> to seed recommended targets, or create one manually.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-text-muted border-b border-border">
                <th className="p-3">Name</th>
                <th className="p-3">Resource</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Acknowledge</th>
                <th className="p-3">First response</th>
                <th className="p-3">Resolve</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-b border-border/40">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.resource_type}</td>
                  <td className="p-3">{p.priority ?? <span className="text-text-muted">any</span>}</td>
                  <td className="p-3">{fmtMin(p.acknowledge_within_min)}</td>
                  <td className="p-3">{fmtMin(p.first_response_within_min)}</td>
                  <td className="p-3">{fmtMin(p.resolve_within_min)}</td>
                  <td className="p-3">{p.enabled ? <span className="text-accent">Enabled</span> : <span className="text-text-muted">Disabled</span>}</td>
                  <td className="p-3 flex gap-2 justify-end">
                    <button onClick={() => openEdit(p)} className="text-text-muted hover:text-text-primary"><Pencil size={14} /></button>
                    <button onClick={() => remove(p.id)} className="text-text-muted hover:text-danger"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--border, #1f2937);
          background: var(--bg-primary, #0a0a0a);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--text-primary, #f5f5f5);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}
