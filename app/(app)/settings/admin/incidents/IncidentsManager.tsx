'use client';

import React, { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardBody,
  settingsInputClass,
  settingsLabelClass,
  settingsPrimaryButtonClass,
  settingsSecondaryButtonClass,
} from '@/components/settings/SettingsShell';
import { CheckCircle2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

interface IncidentUpdate {
  timestamp: string;
  status: string;
  message: string;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  severity: string;
  affected_components: string[];
  created_at: string;
  resolved_at: string | null;
  updates: IncidentUpdate[];
}

const COMPONENTS = ['database', 'auth', 'email', 'sms', 'payments', 'ai'] as const;

const STATUS_OPTIONS = ['investigating', 'identified', 'monitoring', 'resolved'] as const;
const SEVERITY_OPTIONS = ['minor', 'major', 'critical'] as const;

function severityTone(s: string) {
  return s === 'critical'
    ? 'border-red-200 bg-red-50 text-red-700'
    : s === 'major'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-sky-200 bg-sky-50 text-[#0369A1]';
}

function statusTone(s: string) {
  if (s === 'resolved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export function IncidentsManager({ initialIncidents }: { initialIncidents: Incident[] }) {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<(typeof SEVERITY_OPTIONS)[number]>('minor');
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('investigating');
  const [components, setComponents] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  function resetForm() {
    setTitle('');
    setSeverity('minor');
    setStatus('investigating');
    setComponents([]);
    setMessage('');
  }

  function toggleComponent(c: string) {
    setComponents((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function createIncident() {
    setError(null);
    if (!title || title.length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    startTransition(async () => {
      const res = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          severity,
          status,
          affected_components: components,
          message: message || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to create incident');
        return;
      }
      setIncidents((prev) => [json.incident, ...prev]);
      resetForm();
      setCreating(false);
    });
  }

  async function patchIncident(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/incidents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Update failed');
      return;
    }
    setIncidents((prev) => prev.map((i) => (i.id === id ? json.incident : i)));
  }

  const active = incidents.filter((i) => i.status !== 'resolved');
  const past = incidents.filter((i) => i.status === 'resolved');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {incidents.length} incident{incidents.length === 1 ? '' : 's'} total · {active.length} active
        </p>
        {!creating ? (
          <button type="button" onClick={() => setCreating(true)} className={settingsPrimaryButtonClass}>
            <Plus size={14} /> New incident
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              resetForm();
            }}
            className={settingsSecondaryButtonClass}
          >
            <X size={14} /> Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {creating && (
        <SettingsCard>
          <SettingsCardHeader title="Create Incident" description="This will appear on the public status page." />
          <SettingsCardBody className="space-y-4">
            <div>
              <label className={settingsLabelClass}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={settingsInputClass}
                placeholder="e.g., Email delivery degraded"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={settingsLabelClass}>Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as typeof severity)}
                  className={settingsInputClass}
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={settingsLabelClass}>Initial Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className={settingsInputClass}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={settingsLabelClass}>Affected components</label>
              <div className="flex flex-wrap gap-2">
                {COMPONENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleComponent(c)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs border transition-colors',
                      components.includes(c)
                        ? 'bg-sky-50 border-[#0369A1] text-[#0369A1]'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={settingsLabelClass}>Initial message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className={cn(settingsInputClass, 'h-auto py-2')}
                placeholder="What are users seeing? What are you doing about it?"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={createIncident}
                disabled={pending}
                className={settingsPrimaryButtonClass}
              >
                {pending ? 'Creating…' : 'Create incident'}
              </button>
            </div>
          </SettingsCardBody>
        </SettingsCard>
      )}

      <div>
        <h2 className="font-display text-sm font-semibold text-[#020617] mb-3 uppercase tracking-wider">
          Active Incidents
        </h2>
        <div className="space-y-3">
          {active.length === 0 ? (
            <SettingsCard>
              <SettingsCardBody className="text-center py-8 text-sm text-slate-500">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                All systems operational. No active incidents.
              </SettingsCardBody>
            </SettingsCard>
          ) : (
            active.map((inc) => <IncidentCard key={inc.id} incident={inc} onPatch={patchIncident} />)
          )}
        </div>
      </div>

      {past.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 hover:text-[#020617]"
          >
            Past Incidents ({past.length})
            {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showPast && (
            <div className="space-y-3 mt-3">
              {past.map((inc) => (
                <IncidentCard key={inc.id} incident={inc} onPatch={patchIncident} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IncidentCard({
  incident,
  onPatch,
}: {
  incident: Incident;
  onPatch: (id: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const [updateMsg, setUpdateMsg] = useState('');
  const [updateStatus, setUpdateStatus] = useState<(typeof STATUS_OPTIONS)[number]>(
    (incident.status as (typeof STATUS_OPTIONS)[number]) ?? 'investigating',
  );
  const [busy, setBusy] = useState(false);

  return (
    <SettingsCard>
      <SettingsCardBody>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs uppercase tracking-wider font-semibold',
                  severityTone(incident.severity),
                )}
              >
                {incident.severity}
              </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs uppercase tracking-wider font-semibold',
                  statusTone(incident.status),
                )}
              >
                {incident.status}
              </span>
              {incident.affected_components.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
                >
                  {c}
                </span>
              ))}
            </div>
            <h3 className="font-display text-base font-semibold text-[#020617]">{incident.title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Opened {new Date(incident.created_at).toLocaleString()}
              {incident.resolved_at &&
                ` · Resolved ${new Date(incident.resolved_at).toLocaleString()}`}
            </p>
          </div>
          {incident.status !== 'resolved' && (
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                await onPatch(incident.id, { resolve: true });
                setBusy(false);
              }}
              disabled={busy}
              className="shrink-0 inline-flex items-center gap-2 h-9 px-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Resolving…' : 'Mark resolved'}
            </button>
          )}
        </div>

        {/* Updates timeline */}
        {incident.updates && incident.updates.length > 0 && (
          <div className="mt-4 space-y-2">
            {incident.updates.map((u, i) => (
              <div key={i} className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-xs text-slate-500">
                  {new Date(u.timestamp).toLocaleString()} ·{' '}
                  <span className="uppercase font-semibold">{u.status}</span>
                </p>
                <p className="text-sm text-slate-700 mt-0.5">{u.message}</p>
              </div>
            ))}
          </div>
        )}

        {incident.status !== 'resolved' && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
            <input
              type="text"
              value={updateMsg}
              onChange={(e) => setUpdateMsg(e.target.value)}
              placeholder="Add an update…"
              className={settingsInputClass}
            />
            <select
              value={updateStatus}
              onChange={(e) => setUpdateStatus(e.target.value as typeof updateStatus)}
              className={settingsInputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!updateMsg || busy}
              onClick={async () => {
                setBusy(true);
                await onPatch(incident.id, { status: updateStatus, message: updateMsg });
                setUpdateMsg('');
                setBusy(false);
              }}
              className={settingsPrimaryButtonClass}
            >
              Post update
            </button>
          </div>
        )}
      </SettingsCardBody>
    </SettingsCard>
  );
}
