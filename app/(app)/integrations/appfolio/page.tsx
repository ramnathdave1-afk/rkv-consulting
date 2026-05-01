'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  UploadCloud,
  XCircle,
} from 'lucide-react';

type Entity = 'properties' | 'units' | 'tenants' | 'leases' | 'work_orders';

interface ConfigState {
  enabled: boolean;
  sftp_host: string | null;
  sftp_user: string | null;
  sftp_password_set: boolean;
  webhook_secret_set: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_summary: Record<string, unknown> | null;
}

interface SyncResult {
  entity: Entity;
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

interface LogRow {
  id: string;
  entity_type: string;
  status: string;
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  triggered_by: string;
  created_at: string;
}

const ENTITIES: { id: Entity; label: string; help: string }[] = [
  { id: 'properties', label: 'Properties', help: 'Sync first — required for units & work orders' },
  { id: 'units', label: 'Units', help: 'Requires Properties already synced' },
  { id: 'tenants', label: 'Tenants', help: 'Sync before Leases' },
  { id: 'leases', label: 'Leases', help: 'Requires Tenants and Units already synced' },
  { id: 'work_orders', label: 'Work Orders', help: 'Requires Properties already synced' },
];

export default function AppFolioIntegrationPage() {
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Entity | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sftpHost, setSftpHost] = useState('');
  const [sftpUser, setSftpUser] = useState('');
  const [sftpPassword, setSftpPassword] = useState('');

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/integrations/appfolio/webhook`
      : '/api/integrations/appfolio/webhook';

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfgRes, logsRes] = await Promise.all([
        fetch('/api/integrations/appfolio/config').then((r) => r.json()),
        fetch('/api/integrations/appfolio/logs?limit=25').then((r) => r.json()),
      ]);
      if (cfgRes.config) {
        setConfig(cfgRes.config);
        setSftpHost(cfgRes.config.sftp_host || '');
        setSftpUser(cfgRes.config.sftp_user || '');
      }
      if (logsRes.logs) setLogs(logsRes.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveConfig = async (rotate = false) => {
    setSavingConfig(true);
    setError(null);
    setOneTimeSecret(null);
    try {
      const body: Record<string, unknown> = {
        enabled: true,
        sftp_host: sftpHost,
        sftp_user: sftpUser,
        rotate_webhook_secret: rotate,
      };
      if (sftpPassword) body.sftp_password = sftpPassword;
      const res = await fetch('/api/integrations/appfolio/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      if (json.webhook_secret) setOneTimeSecret(json.webhook_secret);
      setSftpPassword('');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleUpload = async (entity: Entity, file: File) => {
    setUploading(entity);
    setError(null);
    setLastResult(null);
    try {
      const form = new FormData();
      form.append('entity', entity);
      form.append('file', file);
      const res = await fetch('/api/integrations/appfolio/upload', {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setLastResult(json.result);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setUploading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const isConnected = config?.enabled === true;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/integrations" className="hover:text-[#020617] transition-colors">
              Integrations
            </Link>
            <span>/</span>
            <span>AppFolio</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold text-[#020617]">AppFolio Integration</h1>
            {isConnected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle2 size={10} />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                <AlertCircle size={10} />
                Not connected
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Sync properties, units, tenants, leases, and work orders from AppFolio via CSV upload or scheduled SFTP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#020617] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          {isConnected && (
            <button
              onClick={() => saveConfig(false)}
              className="inline-flex items-center rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <XCircle size={14} className="text-rose-600" />
          <div className="text-xs text-rose-700">{error}</div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h2 className="font-display text-sm font-semibold text-[#020617] mb-2">How AppFolio sync works</h2>
        <p className="text-xs text-slate-500 mb-3">
          AppFolio doesn&apos;t expose a public OAuth API. The realistic path for SMB property managers is:
        </p>
        <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
          <li>
            <strong className="text-[#020617]">Manual upload</strong> — In AppFolio go to Reports → run the
            Properties / Units / Tenants / Leases / Work Orders report → Export to CSV → drop the file
            into the matching uploader below. Sync is idempotent on AppFolio IDs.
          </li>
          <li>
            <strong className="text-[#020617]">Scheduled SFTP</strong> — In AppFolio configure a Realtime
            export to push CSVs nightly to our SFTP endpoint. Configure host/user/password below.
            (SFTP polling worker is provisioned separately — contact support for activation.)
          </li>
          <li>
            <strong className="text-[#020617]">Webhooks</strong> — For the few events AppFolio webhooks
            (work order updates, payments), point your AppFolio admin at the webhook URL below using the
            generated secret as the HMAC key.
          </li>
        </ol>
      </div>

      {/* Manual Upload — 5 tiles */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h2 className="font-display text-sm font-semibold text-[#020617] mb-1">Manual CSV upload</h2>
        <p className="text-xs text-slate-500 mb-4">Drop a file onto a tile to sync that entity.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ENTITIES.map((e) => (
            <UploadTile
              key={e.id}
              entity={e.id}
              label={e.label}
              help={e.help}
              busy={uploading === e.id}
              onFile={(f) => handleUpload(e.id, f)}
            />
          ))}
        </div>

        {lastResult && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-[#020617] mb-1">
              Last upload: {lastResult.entity}
            </div>
            <div className="text-xs text-slate-600">
              Imported {lastResult.imported} · Updated {lastResult.updated} · Skipped {lastResult.skipped}
              {lastResult.errors.length > 0 && ` · ${lastResult.errors.length} errors`}
            </div>
            {lastResult.errors.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-amber-700 cursor-pointer">View errors</summary>
                <ul className="mt-2 space-y-1 text-[11px] text-slate-600 max-h-40 overflow-y-auto">
                  {lastResult.errors.slice(0, 50).map((er, i) => (
                    <li key={i}>
                      Row {er.row}: {er.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* SFTP config */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h2 className="font-display text-sm font-semibold text-[#020617] mb-3">Scheduled SFTP (optional)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-600 mb-1 block">SFTP Host</label>
            <input
              value={sftpHost}
              onChange={(e) => setSftpHost(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-[#020617] focus:outline-none focus:ring-2 focus:ring-[#0369A1] focus:border-transparent transition-all"
              placeholder="sftp.appfolio.com"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-600 mb-1 block">SFTP User</label>
            <input
              value={sftpUser}
              onChange={(e) => setSftpUser(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-[#020617] focus:outline-none focus:ring-2 focus:ring-[#0369A1] focus:border-transparent transition-all"
              placeholder="username"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-600 mb-1 block">
              SFTP Password{' '}
              {config?.sftp_password_set && <span className="text-emerald-700">(set)</span>}
            </label>
            <input
              type="password"
              value={sftpPassword}
              onChange={(e) => setSftpPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-[#020617] focus:outline-none focus:ring-2 focus:ring-[#0369A1] focus:border-transparent transition-all"
              placeholder={config?.sftp_password_set ? '••••••••' : 'password'}
            />
          </div>
        </div>
        <button
          onClick={() => saveConfig(false)}
          disabled={savingConfig}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#0369A1] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0284C7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {savingConfig && <Loader2 size={12} className="animate-spin" />}
          Save SFTP config
        </button>
      </div>

      {/* Webhook */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h2 className="font-display text-sm font-semibold text-[#020617] mb-3">Webhook</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-slate-600 mb-1 block">Webhook URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-[#020617] font-mono">
                {webhookUrl}
              </code>
              <button
                onClick={() => copyToClipboard(webhookUrl)}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Copy URL"
              >
                <Copy size={12} className="text-[#020617]" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Configure this URL in AppFolio with HMAC-SHA256 signing using the secret below.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-600 mb-1 block">Webhook Secret</label>
            {oneTimeSecret ? (
              <div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 font-mono break-all">
                    {oneTimeSecret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(oneTimeSecret)}
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Copy size={12} className="text-[#020617]" />
                  </button>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  Save this now — it won&apos;t be shown again. Paste it into AppFolio webhook config.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {config?.webhook_secret_set
                    ? '•••••••••••••••• (set — rotate to view a new one)'
                    : 'Not generated yet'}
                </div>
                <button
                  onClick={() => saveConfig(true)}
                  disabled={savingConfig}
                  className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#020617] hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {config?.webhook_secret_set ? 'Rotate secret' : 'Generate secret'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync history */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h2 className="font-display text-sm font-semibold text-[#020617] mb-3">Recent syncs</h2>
        {loading ? (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : logs.length === 0 ? (
          <div className="text-xs text-slate-500">No syncs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide text-[10px]">When</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide text-[10px]">Entity</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide text-[10px]">Status</th>
                  <th className="py-2 px-3 text-right font-semibold uppercase tracking-wide text-[10px]">Imported</th>
                  <th className="py-2 px-3 text-right font-semibold uppercase tracking-wide text-[10px]">Updated</th>
                  <th className="py-2 px-3 text-right font-semibold uppercase tracking-wide text-[10px]">Skipped</th>
                  <th className="py-2 px-3 text-right font-semibold uppercase tracking-wide text-[10px]">Errors</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide text-[10px]">Source</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-sky-50/50 transition-colors">
                    <td className="py-2 px-3 text-[#020617]">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3 text-[#020617]">{l.entity_type}</td>
                    <td className="py-2 px-3">
                      <StatusPill status={l.status} />
                    </td>
                    <td className="py-2 px-3 text-right text-[#020617]">{l.imported}</td>
                    <td className="py-2 px-3 text-right text-[#020617]">{l.updated}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{l.skipped}</td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {Array.isArray(l.errors) ? l.errors.length : 0}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{l.triggered_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    partial: 'bg-amber-50 text-amber-700 border-amber-100',
    failed: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  const cls = map[status] || 'bg-slate-50 text-slate-600 border-slate-100';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}
    >
      {status}
    </span>
  );
}

function UploadTile({
  entity,
  label,
  help,
  busy,
  onFile,
}: {
  entity: Entity;
  label: string;
  help: string;
  busy: boolean;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onClick={() => !busy && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 cursor-pointer ${
        dragOver
          ? 'border-[#0369A1] bg-sky-50/50'
          : 'border-slate-200 hover:border-[#0369A1] hover:bg-sky-50/50'
      } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
      data-entity={entity}
    >
      {busy ? (
        <Loader2 size={28} className="mx-auto text-[#0369A1] mb-2 animate-spin" />
      ) : (
        <UploadCloud size={28} className="mx-auto text-slate-400 mb-2" />
      )}
      <p className="font-display font-semibold text-sm text-[#020617]">{label}</p>
      <p className="text-xs text-slate-500 mt-1">{busy ? 'Uploading…' : help}</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
