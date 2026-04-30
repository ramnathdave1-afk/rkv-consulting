'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Download, Search, Filter } from 'lucide-react';

interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  changes: Record<string, { from: unknown; to: unknown }>;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const ACTIONS = [
  '', 'create', 'update', 'delete', 'login', 'logout',
  'invite_user', 'change_role', 'integration_connect', 'integration_disconnect',
  'export', 'view', 'sso_attempt', 'sso_success', 'sso_failure',
];

const RESOURCE_TYPES = [
  '', 'property', 'unit', 'lease', 'tenant', 'work_order', 'vendor',
  'user', 'integration', 'sla_policy', 'subscription', 'location', 'branding',
];

function formatChanges(changes: Record<string, { from: unknown; to: unknown }>): string {
  const keys = Object.keys(changes);
  if (keys.length === 0) return '';
  return keys.slice(0, 3).map((k) => `${k}`).join(', ') + (keys.length > 3 ? ` +${keys.length - 3}` : '');
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    from: '',
    to: '',
    q: '',
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.action) params.set('action', filters.action);
    if (filters.resource_type) params.set('resource_type', filters.resource_type);
    if (filters.from) params.set('from', new Date(filters.from).toISOString());
    if (filters.to) params.set('to', new Date(filters.to).toISOString());
    if (filters.q) params.set('q', filters.q);
    params.set('limit', '300');
    const res = await fetch(`/api/audit-logs?${params}`);
    if (res.ok) {
      const json = await res.json();
      setLogs(json.logs ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportCsv() {
    const header = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Changes', 'IP', 'User Agent'];
    const rows = logs.map((l) => [
      l.created_at,
      l.user_id ?? '',
      l.action,
      l.resource_type ?? '',
      l.resource_id ?? '',
      JSON.stringify(l.changes ?? {}),
      l.ip_address ?? '',
      l.user_agent ?? '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = useMemo(() => {
    const byAction: Record<string, number> = {};
    for (const l of logs) byAction[l.action] = (byAction[l.action] ?? 0) + 1;
    return byAction;
  }, [logs]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Audit Log</h1>
          <p className="text-sm text-text-secondary">{total} total events · showing {logs.length}</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-tertiary"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-text-muted mb-1">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="action or resource…"
              className="w-full rounded-lg border border-border bg-bg-primary pl-9 pr-3 py-2 text-sm text-text-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Action</label>
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
          >
            {ACTIONS.map((a) => <option key={a} value={a}>{a || 'All actions'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Resource</label>
          <select
            value={filters.resource_type}
            onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
          >
            {RESOURCE_TYPES.map((r) => <option key={r} value={r}>{r || 'All resources'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div className="md:col-span-6 flex justify-end">
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover"
          >
            <Filter size={14} /> Apply
          </button>
        </div>
      </div>

      {/* Action breakdown */}
      {Object.keys(stats).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats).map(([k, v]) => (
            <span key={k} className="text-xs rounded-full bg-bg-secondary border border-border px-3 py-1 text-text-secondary">
              {k}: <span className="font-mono text-text-primary">{v}</span>
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="glass-card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-sm text-text-muted">No audit events match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-text-muted border-b border-border">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <React.Fragment key={l.id}>
                    <tr
                      onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                      className="border-b border-border/40 hover:bg-bg-secondary/30 cursor-pointer"
                    >
                      <td className="p-3 font-mono text-xs">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="p-3 font-mono text-xs text-text-muted">{l.user_id?.slice(0, 8) ?? '—'}</td>
                      <td className="p-3">
                        <span className="inline-block rounded bg-bg-secondary border border-border px-2 py-0.5 text-xs font-medium">{l.action}</span>
                      </td>
                      <td className="p-3">
                        {l.resource_type ?? <span className="text-text-muted">—</span>}
                        {l.resource_id && <div className="font-mono text-[10px] text-text-muted">{l.resource_id.slice(0, 8)}…</div>}
                      </td>
                      <td className="p-3 text-xs text-text-secondary">
                        {formatChanges(l.changes ?? {}) || (Object.keys(l.metadata ?? {}).length > 0 ? `${Object.keys(l.metadata).length} fields` : '')}
                      </td>
                      <td className="p-3 font-mono text-xs text-text-muted">{l.ip_address ?? '—'}</td>
                    </tr>
                    {expanded === l.id && (
                      <tr className="bg-bg-secondary/30">
                        <td colSpan={6} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-semibold text-text-primary mb-1">Changes</div>
                              <pre className="bg-bg-primary border border-border rounded p-2 overflow-x-auto">
                                {JSON.stringify(l.changes ?? {}, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="font-semibold text-text-primary mb-1">Metadata</div>
                              <pre className="bg-bg-primary border border-border rounded p-2 overflow-x-auto">
                                {JSON.stringify(l.metadata ?? {}, null, 2)}
                              </pre>
                            </div>
                            {l.user_agent && (
                              <div className="md:col-span-2">
                                <div className="font-semibold text-text-primary mb-1">User Agent</div>
                                <code className="text-text-muted">{l.user_agent}</code>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
