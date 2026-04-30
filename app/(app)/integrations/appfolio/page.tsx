'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
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
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <Link href="/integrations" className="hover:text-text-primary">Integrations</Link>
            <span>/</span>
            <span>AppFolio</span>
          </div>
          <h1 className="font-display text-xl font-bold text-text-primary">AppFolio</h1>
          <p className="text-sm text-text-secondary mt-1">
            Sync properties, units, tenants, leases, and work orders from AppFolio via CSV upload or scheduled SFTP.
          </p>
        </div>
        <button
          onClick={loadAll}
          className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Status banner */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/10">
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Connected</div>
                <div className="text-xs text-text-secondary">
                  {config?.last_sync_at
                    ? `Last sync: ${new Date(config.last_sync_at).toLocaleString()}`
                    : 'No syncs yet — upload a CSV below to get started'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/10">
                <AlertCircle size={16} className="text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Not connected</div>
                <div className="text-xs text-text-secondary">
                  Configure SFTP or upload a CSV below to enable.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="glass-card p-3 border border-red-400/30 bg-red-400/5 flex items-center gap-2">
          <XCircle size={14} className="text-red-400" />
          <div className="text-xs text-red-300">{error}</div>
        </div>
      )}

      {/* Documentation */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-2">How AppFolio sync works</h2>
        <p className="text-xs text-text-secondary mb-3">
          AppFolio doesn&apos;t expose a public OAuth API. The realistic path for SMB property managers is:
        </p>
        <ol className="text-xs text-text-secondary space-y-2 list-decimal list-inside">
          <li>
            <strong className="text-text-primary">Manual upload</strong> — In AppFolio go to Reports → run the
            Properties / Units / Tenants / Leases / Work Orders report → Export to CSV → drop the file
            into the matching uploader below. Sync is idempotent on AppFolio IDs.
          </li>
          <li>
            <strong className="text-text-primary">Scheduled SFTP</strong> — In AppFolio configure a Realtime
            export to push CSVs nightly to our SFTP endpoint. Configure host/user/password below.
            (SFTP polling worker is provisioned separately — contact support for activation.)
          </li>
          <li>
            <strong className="text-text-primary">Webhooks</strong> — For the few events AppFolio webhooks
            (work order updates, payments), point your AppFolio admin at the webhook URL below using the
            generated secret as the HMAC key.
          </li>
        </ol>
      </div>

      {/* Manual Upload */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Manual CSV upload</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ENTITIES.map((e) => (
            <UploadCard
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
          <div className="mt-4 rounded-lg border border-border bg-bg-elevated p-3">
            <div className="text-xs font-semibold text-text-primary mb-1">
              Last upload: {lastResult.entity}
            </div>
            <div className="text-xs text-text-secondary">
              Imported {lastResult.imported} · Updated {lastResult.updated} · Skipped {lastResult.skipped}
              {lastResult.errors.length > 0 && ` · ${lastResult.errors.length} errors`}
            </div>
            {lastResult.errors.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-amber-400 cursor-pointer">View errors</summary>
                <ul className="mt-2 space-y-1 text-[11px] text-text-secondary max-h-40 overflow-y-auto">
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
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Scheduled SFTP (optional)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-text-secondary mb-1 block">SFTP Host</label>
            <input
              value={sftpHost}
              onChange={(e) => setSftpHost(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text-primary"
              placeholder="sftp.appfolio.com"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-secondary mb-1 block">SFTP User</label>
            <input
              value={sftpUser}
              onChange={(e) => setSftpUser(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text-primary"
              placeholder="username"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-secondary mb-1 block">
              SFTP Password {config?.sftp_password_set && <span className="text-emerald-400">(set)</span>}
            </label>
            <input
              type="password"
              value={sftpPassword}
              onChange={(e) => setSftpPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text-primary"
              placeholder={config?.sftp_password_set ? '••••••••' : 'password'}
            />
          </div>
        </div>
        <button
          onClick={() => saveConfig(false)}
          disabled={savingConfig}
          className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-60 flex items-center gap-1.5"
        >
          {savingConfig && <Loader2 size={12} className="animate-spin" />}
          Save SFTP config
        </button>
      </div>

      {/* Webhook */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Webhook</h2>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-text-secondary mb-1 block">Webhook URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text-primary font-mono">
                {webhookUrl}
              </code>
              <button
                onClick={() => copyToClipboard(webhookUrl)}
                className="rounded-md border border-border bg-bg-elevated p-1.5 hover:bg-bg-tertiary transition-colors"
                title="Copy URL"
              >
                <Copy size={12} className="text-text-primary" />
              </button>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              Configure this URL in AppFolio with HMAC-SHA256 signing using the secret below.
            </p>
          </div>

          <div>
            <label className="text-[11px] text-text-secondary mb-1 block">Webhook Secret</label>
            {oneTimeSecret ? (
              <div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-2 py-1.5 text-xs text-emerald-300 font-mono break-all">
                    {oneTimeSecret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(oneTimeSecret)}
                    className="rounded-md border border-border bg-bg-elevated p-1.5 hover:bg-bg-tertiary transition-colors"
                  >
                    <Copy size={12} className="text-text-primary" />
                  </button>
                </div>
                <p className="text-[11px] text-amber-400 mt-1">
                  Save this now — it won&apos;t be shown again. Paste it into AppFolio webhook config.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text-secondary">
                  {config?.webhook_secret_set
                    ? '•••••••••••••••• (set — rotate to view a new one)'
                    : 'Not generated yet'}
                </div>
                <button
                  onClick={() => saveConfig(true)}
                  disabled={savingConfig}
                  className="rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-60"
                >
                  {config?.webhook_secret_set ? 'Rotate secret' : 'Generate secret'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync history */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Recent syncs</h2>
        {loading ? (
          <div className="text-xs text-text-secondary flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : logs.length === 0 ? (
          <div className="text-xs text-text-secondary">No syncs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-secondary">
                  <th className="py-2 pr-2 font-medium">When</th>
                  <th className="py-2 pr-2 font-medium">Entity</th>
                  <th className="py-2 pr-2 font-medium">Status</th>
                  <th className="py-2 pr-2 font-medium">Imported</th>
                  <th className="py-2 pr-2 font-medium">Updated</th>
                  <th className="py-2 pr-2 font-medium">Skipped</th>
                  <th className="py-2 pr-2 font-medium">Errors</th>
                  <th className="py-2 pr-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="py-2 pr-2 text-text-primary">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-2 text-text-primary">{l.entity_type}</td>
                    <td className="py-2 pr-2">
                      <StatusPill status={l.status} />
                    </td>
                    <td className="py-2 pr-2 text-text-primary">{l.imported}</td>
                    <td className="py-2 pr-2 text-text-primary">{l.updated}</td>
                    <td className="py-2 pr-2 text-text-primary">{l.skipped}</td>
                    <td className="py-2 pr-2 text-text-primary">
                      {Array.isArray(l.errors) ? l.errors.length : 0}
                    </td>
                    <td className="py-2 pr-2 text-text-secondary">{l.triggered_by}</td>
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
    success: 'bg-emerald-400/10 text-emerald-400',
    partial: 'bg-amber-400/10 text-amber-400',
    failed: 'bg-red-400/10 text-red-400',
  };
  const cls = map[status] || 'bg-bg-elevated text-text-secondary';
  return <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{status}</span>;
}

function UploadCard({
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
      className={`rounded-lg border border-dashed p-3 transition-colors ${
        dragOver ? 'border-accent bg-accent/5' : 'border-border bg-bg-elevated'
      }`}
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
    >
      <div className="flex items-center gap-2 mb-1">
        <FileSpreadsheet size={14} className="text-accent" />
        <div className="text-xs font-semibold text-text-primary">{label}</div>
      </div>
      <p className="text-[11px] text-text-secondary mb-2">{help}</p>
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
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        {busy ? 'Uploading…' : 'Upload CSV'}
      </button>
    </div>
  );
}
