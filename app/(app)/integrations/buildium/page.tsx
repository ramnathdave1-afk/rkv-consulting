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
          className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={12} />
          Back to integrations
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-text-primary">Buildium</h1>
            <p className="text-sm text-text-secondary">
              Sync properties, units, tenants, leases, and work orders from Buildium via their REST API.
            </p>
          </div>
          {connected ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-emerald-400/10 text-emerald-400">
              <CheckCircle2 size={11} />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-amber-400/10 text-amber-400">
              <XCircle size={11} />
              Not connected
            </span>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`glass-card p-3 text-xs ${
            message.kind === 'ok' ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* CONNECT */}
      {!connected && (
        <form onSubmit={handleConnect} className="glass-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
              <Plug size={14} className="text-accent" />
              Connect your Buildium account
            </h2>
            <p className="text-xs text-text-secondary">
              Generate an API key + secret in Buildium under{' '}
              <span className="text-text-primary">Settings &rarr; Application Settings &rarr; API keys</span>.
              Both values are encrypted at rest before being stored.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">
              Client ID
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              placeholder="bldm_..."
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">
              API Secret
            </label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              placeholder="••••••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={connecting || !clientId || !clientSecret}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {connecting && <Loader2 size={12} className="animate-spin" />}
            Test connection &amp; connect
          </button>
        </form>
      )}

      {/* SYNC + SETTINGS */}
      {connected && (
        <>
          <div className="glass-card p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-text-primary mb-1">Sync</h2>
                <p className="text-xs text-text-secondary">
                  Last sync:{' '}
                  <span className="text-text-primary">{formatTime(status?.last_sync_at ?? null)}</span>
                  {status?.last_sync_status && (
                    <span
                      className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        status.last_sync_status === 'success'
                          ? 'bg-emerald-400/10 text-emerald-400'
                          : status.last_sync_status === 'partial'
                            ? 'bg-amber-400/10 text-amber-400'
                            : 'bg-rose-400/10 text-rose-400'
                      }`}
                    >
                      {status.last_sync_status}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {syncing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Sync now
              </button>
            </div>

            <div className="rounded-lg border border-border bg-bg-elevated p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="mt-0.5 accent-accent"
                />
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    Nightly auto-sync{' '}
                    <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-400/10 text-amber-400">
                      <AlertTriangle size={9} />
                      Roadmap
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Automatic nightly sync at 2:00 AM in your account&apos;s timezone. Requires a
                    cron worker — when scheduled jobs ship in the platform this toggle will start
                    enforcing it. For now, run sync manually.
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Link
                href="https://developer.buildium.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
              >
                Buildium API docs
                <ExternalLink size={10} />
              </Link>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* SYNC HISTORY */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Recent sync history</h2>
            {loading && !status ? (
              <p className="text-xs text-text-secondary">Loading…</p>
            ) : status && status.logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-text-secondary border-b border-border">
                      <th className="text-left py-2 font-medium">When</th>
                      <th className="text-left py-2 font-medium">Entity</th>
                      <th className="text-left py-2 font-medium">Status</th>
                      <th className="text-right py-2 font-medium">Imported</th>
                      <th className="text-right py-2 font-medium">Skipped</th>
                      <th className="text-right py-2 font-medium">Errors</th>
                      <th className="text-left py-2 font-medium">Trigger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.logs.map((log) => (
                      <tr key={log.id} className="border-b border-border/40">
                        <td className="py-2 text-text-secondary">{formatTime(log.created_at)}</td>
                        <td className="py-2 text-text-primary">
                          {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              log.status === 'success'
                                ? 'bg-emerald-400/10 text-emerald-400'
                                : log.status === 'partial'
                                  ? 'bg-amber-400/10 text-amber-400'
                                  : 'bg-rose-400/10 text-rose-400'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2 text-right text-text-primary">{log.imported}</td>
                        <td className="py-2 text-right text-text-secondary">{log.skipped}</td>
                        <td className="py-2 text-right text-text-secondary">
                          {log.errors?.length ?? 0}
                        </td>
                        <td className="py-2 text-text-secondary">{log.triggered_by ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-text-secondary">No sync runs yet. Click &quot;Sync now&quot;.</p>
            )}
          </div>
        </>
      )}

      {/* HELP */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-2">How it works</h2>
        <ul className="space-y-1.5 text-xs text-text-secondary">
          <li>
            We call the official Buildium REST API at{' '}
            <code className="text-text-primary">https://api.buildium.com/v1</code> using your API
            key + secret.
          </li>
          <li>
            Sync order is properties → units → tenants → leases → work orders. Records reference
            their parent by external Buildium ID.
          </li>
          <li>
            Re-running a sync is idempotent — records are upserted on{' '}
            <code className="text-text-primary">(org_id, buildium_*_id)</code>.
          </li>
          <li>
            Buildium rate-limits at roughly 120 requests/minute. We pace requests at ~500ms apart
            and retry on the next sync if a page fails.
          </li>
          <li>
            Need help generating API credentials? See{' '}
            <Link
              href="https://developer.buildium.com/"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline inline-flex items-center gap-1"
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
