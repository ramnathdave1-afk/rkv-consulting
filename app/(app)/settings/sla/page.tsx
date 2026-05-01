'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { Plus, Trash2, Pencil, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SettingsShell,
  SettingsCard,
  SettingsCardHeader,
  SettingsCardBody,
  settingsInputClass,
  settingsLabelClass,
  settingsPrimaryButtonClass,
  settingsSecondaryButtonClass,
} from '@/components/settings/SettingsShell';

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

  return (
    <SettingsShell
      title="SLA Policies"
      subtitle="Define response and resolution targets per resource type and priority."
      actions={
        <div className="flex items-center gap-2">
          {policies.length === 0 && (
            <button type="button" onClick={applyDefaults} className={settingsSecondaryButtonClass}>
              Apply defaults
            </button>
          )}
          <button type="button" onClick={openNew} className={settingsPrimaryButtonClass}>
            <Plus size={14} /> New policy
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            {showForm && (
              <SettingsCard>
                <SettingsCardHeader
                  title={editingId ? 'Edit policy' : 'New policy'}
                  actions={
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                      }}
                      className="text-slate-400 hover:text-[#020617]"
                    >
                      <X size={16} />
                    </button>
                  }
                />
                <SettingsCardBody>
                  <form onSubmit={save} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Name">
                        <input
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className={settingsInputClass}
                        />
                      </Field>
                      <Field label="Resource type">
                        <select
                          value={form.resource_type}
                          onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
                          className={settingsInputClass}
                        >
                          {RESOURCE_TYPES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Priority">
                        <select
                          value={form.priority}
                          onChange={(e) => setForm({ ...form, priority: e.target.value })}
                          className={settingsInputClass}
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Acknowledge within (min)">
                        <input
                          type="number"
                          min={0}
                          value={form.acknowledge_within_min}
                          onChange={(e) =>
                            setForm({ ...form, acknowledge_within_min: Number(e.target.value) })
                          }
                          className={settingsInputClass}
                        />
                      </Field>
                      <Field label="First response within (min)">
                        <input
                          type="number"
                          min={0}
                          value={form.first_response_within_min}
                          onChange={(e) =>
                            setForm({ ...form, first_response_within_min: Number(e.target.value) })
                          }
                          className={settingsInputClass}
                        />
                      </Field>
                      <Field label="Resolve within (min)">
                        <input
                          type="number"
                          min={0}
                          value={form.resolve_within_min}
                          onChange={(e) =>
                            setForm({ ...form, resolve_within_min: Number(e.target.value) })
                          }
                          className={settingsInputClass}
                        />
                      </Field>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-slate-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.business_hours_only}
                          onChange={(e) => setForm({ ...form, business_hours_only: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-[#0369A1] focus:ring-[#0369A1]"
                        />
                        Business hours only
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.enabled}
                          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-[#0369A1] focus:ring-[#0369A1]"
                        />
                        Enabled
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" disabled={saving} className={settingsPrimaryButtonClass}>
                        <Save size={14} /> {saving ? 'Saving…' : 'Save policy'}
                      </button>
                    </div>
                  </form>
                </SettingsCardBody>
              </SettingsCard>
            )}

            <SettingsCard className="overflow-hidden">
              {policies.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  No policies yet. Click <strong>Apply defaults</strong> to seed recommended targets, or
                  create one manually.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Resource</th>
                        <th className="px-4 py-3 font-medium">Priority</th>
                        <th className="px-4 py-3 font-medium">Acknowledge</th>
                        <th className="px-4 py-3 font-medium">First response</th>
                        <th className="px-4 py-3 font-medium">Resolve</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {policies.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-[#020617]">{p.name}</td>
                          <td className="px-4 py-3 text-slate-600">{p.resource_type}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {p.priority ?? <span className="text-slate-400">any</span>}
                          </td>
                          <td className="px-4 py-3 tabular-nums">{fmtMin(p.acknowledge_within_min)}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {fmtMin(p.first_response_within_min)}
                          </td>
                          <td className="px-4 py-3 tabular-nums">{fmtMin(p.resolve_within_min)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                                p.enabled
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-500',
                              )}
                            >
                              {p.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(p)}
                                className="p-2 rounded-md text-slate-500 hover:text-[#0369A1] hover:bg-sky-50"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => remove(p.id)}
                                className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SettingsCard>
          </>
        )}
      </div>
    </SettingsShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={settingsLabelClass}>{label}</label>
      {children}
    </div>
  );
}
