'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Plug,
} from 'lucide-react';

interface SyncLog {
  id: string;
  entity_type: string;
  status: 'success' | 'partial' | 'failed';
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  triggered_by: string | null;
  created_at: string;
}

interface StatusResponse {
  connected: boolean;
  last_sync_at: string | null;
  last_sync_status: 'success' | 'partial' | 'failed' | null;
  last_sync_summary: unknown;
  updated_at: string | null;
  logs: SyncLog[];
}

const ENTITY_LABELS: Record<string, string> = {
  properties: 'Properties',
  units: 'Units',
  tenants: 'Tenants',
  leases: 'Leases',
  work_orders: 'Work orders',
};

function formatTime(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleString();
}

function StatusBadge({ status }: { status: 'success' | 'partial' | 'failed' }) {
  const map: Record<typeof status, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    partial: 'bg-amber-50 text-amber-700 border-amber-100',
    failed: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[status]}`}
    >
      {status}
    </span>
  );
}

export default function BuildiumIntegrationPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/buildium/status', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as StatusResponse;
        setStatus(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setConnecting(true);
    try {
      const res = await fetch('/api/integrations/buildium/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: 'err', text: data.error ?? 'Failed to connect.' });
      } else {
        setMessage({ kind: 'ok', text: 'Connected to Buildium.' });
        setClientId('');
        setClientSecret('');
        await refresh();
      }
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setMessage(null);
    if (!confirm('Disconnect Buildium? Stored credentials will be removed.')) return;
    const res = await fetch('/api/integrations/buildium/connect', { method: 'DELETE' });
    if (res.ok) {
      setMessage({ kind: 'ok', text: 'Disconnected.' });
      await refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ kind: 'err', text: data.error ?? 'Failed to disconnect.' });
    }
  }

  async function handleSync() {
    setMessage(null);
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/buildium/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: 'err', text: data.error ?? 'Sync failed.' });
      } else {
        const status = data.status ?? 'success';
        setMessage({
          kind: status === 'failed' ? 'err' : 'ok',
          text:
            status === 'success'
              ? 'Sync completed.'
              : status === 'partial'
                ? 'Sync completed with some errors. See sync history.'
                : 'Sync failed. See sync history.',
        });
        await refresh();
      }
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSyncing(false);
    }
  }

  const connected = Boolean(status?.connected);

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#020617] transition-colors"
        >
          <ArrowLeft size={12} />
          Back to integrations
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-xl font-bold text-[#020617]">Buildium Integration</h1>
              {connected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <CheckCircle2 size={10} />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                  <XCircle size={10} />
                  Not connected
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Sync properties, units, tenants, leases, and work orders from Buildium via their REST API.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            message.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* CONNECT */}
      {!connected && (
        <form
          onSubmit={handleConnect}
          className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4"
        >
          <div>
            <h2 className="font-display text-sm font-semibold text-[#020617] mb-1 flex items-center gap-2">
              <Plug size={14} className="text-[#0369A1]" />
              Connect your Buildium account
            </h2>
            <p className="text-xs text-slate-500">
              Generate an API key + secret in Buildium under{' '}
              <span className="text-[#020617] font-medium">
                Settings &rarr; Application Settings &rarr; API keys
              </span>
              . Both values are encrypted at rest before being stored.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              autoComplete="off"
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-[#020617] focus:outline-none focus:ring-2 focus:ring-[#0369A1] focus:border-transparent transition-all"
              placeholder="bldm_..."
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">API Secret</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
              autoComplete="off"
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-[#020617] focus:outline-none focus:ring-2 focus:ring-[#0369A1] focus:border-transparent transition-all"
              placeholder="••••••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={connecting || !clientId || !clientSecret}
            className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0284C7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {connecting && <Loader2 size={12} className="animate-spin" />}
            Test connection &amp; connect
          </button>
        </form>
      )}

      {/* SYNC + SETTINGS */}
      {connected && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-sm font-semibold text-[#020617] mb-1">Sync</h2>
                <p className="text-xs text-slate-500">
                  Last sync:{' '}
                  <span className="text-[#020617] font-medium">
                    {formatTime(status?.last_sync_at ?? null)}
                  </span>
                  {status?.last_sync_status && (
                    <span className="ml-2 inline-flex">
                      <StatusBadge status={status.last_sync_status} />
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0284C7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {syncing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Sync now
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="mt-0.5 accent-[#0369A1] cursor-pointer"
                />
                <div>
                  <div className="text-xs font-semibold text-[#020617] flex items-center gap-2">
                    Nightly auto-sync
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                      <AlertTriangle size={9} />
                      Roadmap
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automatic nightly sync at 2:00 AM in your account&apos;s timezone. Requires a cron
                    worker — when scheduled jobs ship in the platform this toggle will start enforcing
                    it. For now, run sync manually.
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Link
                href="https://developer.buildium.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#020617] transition-colors"
              >
                Buildium API docs
                <ExternalLink size={10} />
              </Link>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[11px] text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* SYNC HISTORY */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
            <h2 className="font-display text-sm font-semibold text-[#020617] mb-3">Recent sync history</h2>
            {loading && !status ? (
              <p className="text-xs text-slate-500">Loading…</p>
            ) : status && status.logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">
                        When
                      </th>
                      <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">
                        Entity
                      </th>
                      <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">
                        Status
                      </th>
                      <th className="text-right px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">
                        Imported
                      </th>
                      <th className="text-right px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">
                        Skipped
                      </th>
                      <th className="text-right px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">
                        Errors
                      </th>
                      <th className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[10px]">
                        Trigger
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-100 hover:bg-sky-50/50 transition-colors"
                      >
                        <td className="px-3 py-2 text-slate-500">{formatTime(log.created_at)}</td>
                        <td className="px-3 py-2 text-[#020617]">
                          {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={log.status} />
                        </td>
                        <td className="px-3 py-2 text-right text-[#020617]">{log.imported}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{log.skipped}</td>
                        <td className="px-3 py-2 text-right text-slate-500">
                          {log.errors?.length ?? 0}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{log.triggered_by ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No sync runs yet. Click &quot;Sync now&quot;.</p>
            )}
          </div>
        </>
      )}

      {/* HELP */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
        <h2 className="font-display text-sm font-semibold text-[#020617] mb-2">How it works</h2>
        <ul className="space-y-1.5 text-xs text-slate-600">
          <li>
            We call the official Buildium REST API at{' '}
            <code className="text-[#020617] bg-white border border-slate-200 rounded px-1 py-0.5">
              https://api.buildium.com/v1
            </code>{' '}
            using your API key + secret.
          </li>
          <li>
            Sync order is properties → units → tenants → leases → work orders. Records reference their
            parent by external Buildium ID.
          </li>
          <li>
            Re-running a sync is idempotent — records are upserted on{' '}
            <code className="text-[#020617] bg-white border border-slate-200 rounded px-1 py-0.5">
              (org_id, buildium_*_id)
            </code>
            .
          </li>
          <li>
            Buildium rate-limits at roughly 120 requests/minute. We pace requests at ~500ms apart and
            retry on the next sync if a page fails.
          </li>
          <li>
            Need help generating API credentials? See{' '}
            <Link
              href="https://developer.buildium.com/"
              target="_blank"
              rel="noreferrer"
              className="text-[#0369A1] hover:text-[#0284C7] hover:underline inline-flex items-center gap-1"
            >
              the Buildium developer portal
              <ExternalLink size={9} />
            </Link>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
