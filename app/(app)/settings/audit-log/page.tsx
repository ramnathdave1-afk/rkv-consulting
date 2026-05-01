'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Download, Search, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SettingsShell,
  SettingsCard,
  SettingsCardBody,
  settingsInputClass,
  settingsLabelClass,
  settingsPrimaryButtonClass,
  settingsSecondaryButtonClass,
} from '@/components/settings/SettingsShell';

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
  '',
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'invite_user',
  'change_role',
  'integration_connect',
  'integration_disconnect',
  'export',
  'view',
  'sso_attempt',
  'sso_success',
  'sso_failure',
];

const RESOURCE_TYPES = [
  '',
  'property',
  'unit',
  'lease',
  'tenant',
  'work_order',
  'vendor',
  'user',
  'integration',
  'sla_policy',
  'subscription',
  'location',
  'branding',
];

function formatChanges(changes: Record<string, { from: unknown; to: unknown }>): string {
  const keys = Object.keys(changes);
  if (keys.length === 0) return '';
  return keys.slice(0, 3).map((k) => `${k}`).join(', ') + (keys.length > 3 ? ` +${keys.length - 3}` : '');
}

const ACTION_TONE: Record<string, string> = {
  create: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  update: 'border-sky-200 bg-sky-50 text-[#0369A1]',
  delete: 'border-red-200 bg-red-50 text-red-700',
  login: 'border-slate-200 bg-slate-50 text-slate-700',
  logout: 'border-slate-200 bg-slate-50 text-slate-700',
};

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
    <SettingsShell
      title="Audit Log"
      subtitle={`${total} total events · showing ${logs.length}`}
      actions={
        <button type="button" onClick={exportCsv} className={settingsSecondaryButtonClass}>
          <Download size={14} /> Export CSV
        </button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <SettingsCard>
          <SettingsCardBody>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2">
                <label className={settingsLabelClass}>Search</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filters.q}
                    onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    placeholder="action or resource…"
                    className={cn(settingsInputClass, 'pl-9')}
                  />
                </div>
              </div>
              <div>
                <label className={settingsLabelClass}>Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className={settingsInputClass}
                >
                  {ACTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a || 'All actions'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={settingsLabelClass}>Resource</label>
                <select
                  value={filters.resource_type}
                  onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
                  className={settingsInputClass}
                >
                  {RESOURCE_TYPES.map((r) => (
                    <option key={r} value={r}>
                      {r || 'All resources'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={settingsLabelClass}>From</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  className={settingsInputClass}
                />
              </div>
              <div>
                <label className={settingsLabelClass}>To</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  className={settingsInputClass}
                />
              </div>
              <div className="md:col-span-6 flex justify-end">
                <button type="button" onClick={load} className={settingsPrimaryButtonClass}>
                  <Filter size={14} /> Apply
                </button>
              </div>
            </div>
          </SettingsCardBody>
        </SettingsCard>

        {/* Action breakdown */}
        {Object.keys(stats).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats).map(([k, v]) => (
              <span
                key={k}
                className="text-xs rounded-full bg-white border border-slate-200 px-3 py-1 text-slate-600 shadow-sm"
              >
                {k}: <span className="font-mono text-[#020617] tabular-nums">{v}</span>
              </span>
            ))}
          </div>
        )}

        {/* Table */}
        <SettingsCard className="overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No audit events match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Resource</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((l) => (
                    <React.Fragment key={l.id}>
                      <tr
                        onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {new Date(l.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-sky-50 text-[#0369A1] flex items-center justify-center text-[10px] font-semibold">
                              {l.user_id ? l.user_id.slice(0, 2).toUpperCase() : '—'}
                            </div>
                            <span className="font-mono text-xs text-slate-500">
                              {l.user_id?.slice(0, 8) ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                              ACTION_TONE[l.action] ?? 'border-slate-200 bg-slate-50 text-slate-700',
                            )}
                          >
                            {l.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {l.resource_type ?? <span className="text-slate-400">—</span>}
                          {l.resource_id && (
                            <div className="font-mono text-xs text-slate-400">
                              {l.resource_id.slice(0, 8)}…
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {formatChanges(l.changes ?? {}) ||
                            (Object.keys(l.metadata ?? {}).length > 0
                              ? `${Object.keys(l.metadata).length} fields`
                              : '')}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {l.ip_address ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {expanded === l.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                      </tr>
                      {expanded === l.id && (
                        <tr className="bg-slate-50">
                          <td colSpan={7} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <div className="font-semibold text-[#020617] mb-1">Changes</div>
                                <pre className="bg-white border border-slate-200 rounded-md p-2 overflow-x-auto text-slate-700">
                                  {JSON.stringify(l.changes ?? {}, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <div className="font-semibold text-[#020617] mb-1">Metadata</div>
                                <pre className="bg-white border border-slate-200 rounded-md p-2 overflow-x-auto text-slate-700">
                                  {JSON.stringify(l.metadata ?? {}, null, 2)}
                                </pre>
                              </div>
                              {l.user_agent && (
                                <div className="md:col-span-2">
                                  <div className="font-semibold text-[#020617] mb-1">User Agent</div>
                                  <code className="text-slate-500">{l.user_agent}</code>
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
        </SettingsCard>
      </div>
    </SettingsShell>
  );
}
