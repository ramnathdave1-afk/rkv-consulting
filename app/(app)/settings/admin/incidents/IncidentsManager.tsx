'use client';

import React, { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';

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

function severityColor(s: string) {
  return s === 'critical'
    ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : s === 'major'
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : 'bg-sky-500/15 text-sky-400 border-sky-500/30';
}

function statusColor(s: string) {
  if (s === 'resolved') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
}

export function IncidentsManager({ initialIncidents }: { initialIncidents: Incident[] }) {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-muted">
          {incidents.length} incident{incidents.length === 1 ? '' : 's'} total
        </p>
        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg-primary hover:opacity-90 transition"
          >
            New incident
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              resetForm();
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-elevated transition"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {creating && (
        <div className="rounded-2xl border border-border bg-bg-secondary/40 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
              placeholder="e.g., Email delivery degraded"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as typeof severity)}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
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
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Affected components
            </label>
            <div className="flex flex-wrap gap-2">
              {COMPONENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleComponent(c)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs border transition',
                    components.includes(c)
                      ? 'bg-accent/20 border-accent/40 text-accent'
                      : 'bg-bg-primary border-border text-text-secondary hover:border-accent/40',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Initial message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
              placeholder="What are users seeing? What are you doing about it?"
            />
          </div>
          <button
            type="button"
            onClick={createIncident}
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg-primary hover:opacity-90 transition disabled:opacity-50"
          >
            {pending ? 'Creating…' : 'Create incident'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {incidents.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg-secondary/40 px-6 py-12 text-center text-sm text-text-secondary">
            No incidents yet.
          </div>
        ) : (
          incidents.map((inc) => <IncidentCard key={inc.id} incident={inc} onPatch={patchIncident} />)
        )}
      </div>
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
    <div className="rounded-2xl border border-border bg-bg-secondary/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold',
                severityColor(incident.severity),
              )}
            >
              {incident.severity}
            </span>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold',
                statusColor(incident.status),
              )}
            >
              {incident.status}
            </span>
            {incident.affected_components.map((c) => (
              <span
                key={c}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-secondary"
              >
                {c}
              </span>
            ))}
          </div>
          <h3 className="text-base font-semibold text-text-primary">{incident.title}</h3>
          <p className="mt-1 text-xs text-text-muted">
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
            className="shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
          >
            {busy ? 'Resolving…' : 'Mark resolved'}
          </button>
        )}
      </div>

      {/* Updates timeline */}
      <div className="mt-4 space-y-2">
        {(incident.updates ?? []).map((u, i) => (
          <div key={i} className="rounded-lg bg-bg-primary/60 px-3 py-2">
            <p className="text-[11px] text-text-muted">
              {new Date(u.timestamp).toLocaleString()} · <span className="uppercase">{u.status}</span>
            </p>
            <p className="text-sm text-text-secondary mt-0.5">{u.message}</p>
          </div>
        ))}
      </div>

      {incident.status !== 'resolved' && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <input
            type="text"
            value={updateMsg}
            onChange={(e) => setUpdateMsg(e.target.value)}
            placeholder="Add an update…"
            className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
          />
          <select
            value={updateStatus}
            onChange={(e) => setUpdateStatus(e.target.value as typeof updateStatus)}
            className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
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
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg-primary hover:opacity-90 transition disabled:opacity-50"
          >
            Post
          </button>
        </div>
      )}
    </div>
  );
}
