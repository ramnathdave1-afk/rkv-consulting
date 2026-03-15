'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Key,
  Plus,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiKeyData {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_rpm: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  requests_24h: number;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read']);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/api-keys');
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function createKey() {
    setCreating(true);
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newKeyName || 'API Key',
        scopes: newKeyScopes,
        rate_limit_rpm: 60,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setRevealedKey(data.key);
      setShowCreateForm(false);
      setNewKeyName('');
      await fetchKeys();
    }
    setCreating(false);
  }

  async function revokeKey(id: string) {
    await fetch('/api/api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await fetchKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-text-primary">API Keys</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manage API keys for the Meridian Node Developer API
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
        >
          <Plus size={12} /> Create Key
        </button>
      </div>

      {/* Revealed Key Banner */}
      {revealedKey && (
        <div className="glass-card p-4 border-accent/30">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-text-primary mb-1">
                Save your API key — it will not be shown again
              </p>
              <div className="flex items-center gap-2 bg-bg-primary rounded-lg px-3 py-2 border border-border">
                <code className="text-xs text-accent font-mono flex-1 break-all">{revealedKey}</code>
                <button
                  onClick={() => copyToClipboard(revealedKey)}
                  className="shrink-0 text-text-muted hover:text-accent transition-colors"
                >
                  {copied ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>
              <button
                onClick={() => setRevealedKey(null)}
                className="text-[10px] text-text-muted hover:text-text-secondary mt-2"
              >
                I&apos;ve saved it — dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="glass-card p-4 space-y-3">
          <p className="text-sm font-semibold text-text-primary">Create New API Key</p>
          <div>
            <label className="text-[10px] text-text-muted">Key Name</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production, Development"
              className="w-full mt-0.5 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">Scopes</label>
            <div className="flex gap-2 mt-1">
              {['read', 'write', 'admin'].map((scope) => (
                <button
                  key={scope}
                  onClick={() => {
                    setNewKeyScopes((prev) =>
                      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
                    );
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                    newKeyScopes.includes(scope)
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-bg-elevated border-border text-text-muted hover:text-text-secondary',
                  )}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createKey}
              disabled={creating}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
              Generate Key
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* API Base URL */}
      <div className="glass-card p-3">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">API Base URL</p>
        <code className="text-xs text-accent font-mono">https://meridiannode.io/api/v1</code>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <span className="text-text-muted">Parcels</span>
            <p className="font-mono text-text-secondary">/parcels</p>
          </div>
          <div>
            <span className="text-text-muted">Substations</span>
            <p className="font-mono text-text-secondary">/substations</p>
          </div>
          <div>
            <span className="text-text-muted">Zoning</span>
            <p className="font-mono text-text-secondary">/zoning</p>
          </div>
          <div>
            <span className="text-text-muted">Environmental</span>
            <p className="font-mono text-text-secondary">/environmental</p>
          </div>
          <div>
            <span className="text-text-muted">Feasibility</span>
            <p className="font-mono text-text-secondary">/feasibility</p>
          </div>
          <div>
            <span className="text-text-muted">Search</span>
            <p className="font-mono text-text-secondary">/search</p>
          </div>
        </div>
      </div>

      {/* Keys List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-accent" />
        </div>
      ) : keys.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Key size={24} className="text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-secondary">No API keys yet</p>
          <p className="text-xs text-text-muted mt-1">Create a key to start using the Meridian Node API</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="glass-card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-2 w-2 rounded-full',
                    key.is_active ? 'bg-success' : 'bg-text-muted',
                  )} />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{key.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-[10px] font-mono text-text-muted">{key.key_prefix}••••••••</code>
                      <div className="flex gap-1">
                        {key.scopes.map((scope) => (
                          <span key={scope} className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent font-medium">
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted">24h requests</p>
                    <p className="text-xs font-mono text-text-primary">{key.requests_24h}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted">Rate limit</p>
                    <p className="text-xs font-mono text-text-primary">{key.rate_limit_rpm}/min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted">Last used</p>
                    <p className="text-xs text-text-secondary">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  {key.is_active && (
                    <button
                      onClick={() => revokeKey(key.id)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 size={10} /> Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
