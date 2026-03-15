'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Play,
  Pause,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataSource, IngestionJob } from '@/lib/types';

type EnrichedSource = DataSource & { recent_jobs: IngestionJob[] };

const TYPE_COLORS: Record<string, string> = {
  parcel: 'text-blue-400 bg-blue-400/10',
  environmental: 'text-emerald-400 bg-emerald-400/10',
  energy: 'text-amber-400 bg-amber-400/10',
  infrastructure: 'text-purple-400 bg-purple-400/10',
  market: 'text-pink-400 bg-pink-400/10',
  zoning: 'text-cyan-400 bg-cyan-400/10',
  permit: 'text-orange-400 bg-orange-400/10',
};

const STATUS_CONFIG = {
  active: { icon: CheckCircle2, color: 'text-success', label: 'Active' },
  paused: { icon: Pause, color: 'text-text-muted', label: 'Paused' },
  error: { icon: XCircle, color: 'text-danger', label: 'Error' },
  setup: { icon: Settings, color: 'text-warning', label: 'Setup' },
};

const JOB_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  queued: { color: 'text-text-muted', label: 'Queued' },
  running: { color: 'text-accent', label: 'Running' },
  completed: { color: 'text-success', label: 'Completed' },
  failed: { color: 'text-danger', label: 'Failed' },
  cancelled: { color: 'text-text-muted', label: 'Cancelled' },
};

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatNumber(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DataSourcesPage() {
  const [sources, setSources] = useState<EnrichedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [triggering, setTriggering] = useState<Set<string>>(new Set());

  const fetchSources = useCallback(async () => {
    const res = await fetch('/api/data-sources');
    if (res.ok) {
      const data = await res.json();
      setSources(data.sources || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSources();
    const interval = setInterval(fetchSources, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchSources]);

  async function triggerIngestion(slug: string) {
    setTriggering((prev) => new Set(prev).add(slug));
    try {
      const res = await fetch(`/api/data-sources/${slug}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ states: ['AZ'], counties: ['Maricopa'] }),
      });
      if (res.ok) {
        await fetchSources();
      }
    } finally {
      setTriggering((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Summary stats
  const totalRecords = sources.reduce((sum, s) => sum + (s.total_records || 0), 0);
  const activeSources = sources.filter((s) => s.status === 'active').length;
  const errorSources = sources.filter((s) => s.status === 'error').length;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-text-primary">Data Sources</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manage external data connectors and ingestion pipelines
          </p>
        </div>
        <button
          onClick={fetchSources}
          className="flex items-center gap-1.5 rounded-lg bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Data Sources', value: sources.length, icon: Database },
          { label: 'Active', value: activeSources, icon: CheckCircle2 },
          { label: 'Errors', value: errorSources, icon: AlertTriangle },
          { label: 'Total Records', value: formatNumber(totalRecords), icon: Database },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon size={11} className="text-text-muted" />
              <span className="text-[10px] text-text-muted uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-lg font-display font-bold text-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Source List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => {
            const isExpanded = expanded.has(source.id);
            const statusConf = STATUS_CONFIG[source.status] || STATUS_CONFIG.setup;
            const StatusIcon = statusConf.icon;
            const isTriggering = triggering.has(source.slug);

            return (
              <div key={source.id} className="glass-card overflow-hidden">
                {/* Source Header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-bg-elevated/50 transition-colors"
                  onClick={() => toggleExpanded(source.id)}
                >
                  {isExpanded ? (
                    <ChevronDown size={12} className="text-text-muted shrink-0" />
                  ) : (
                    <ChevronRight size={12} className="text-text-muted shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary truncate">
                        {source.name}
                      </span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', TYPE_COLORS[source.source_type] || 'text-text-muted bg-bg-elevated')}>
                        {source.source_type}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5 truncate">
                      {source.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Status */}
                    <div className={cn('flex items-center gap-1 text-[10px] font-medium', statusConf.color)}>
                      <StatusIcon size={11} />
                      {statusConf.label}
                    </div>

                    {/* Last sync */}
                    <div className="text-right">
                      <p className="text-[10px] text-text-muted">Last sync</p>
                      <p className="text-[10px] text-text-secondary font-mono">
                        {timeAgo(source.last_sync_at)}
                      </p>
                    </div>

                    {/* Records */}
                    <div className="text-right min-w-[60px]">
                      <p className="text-[10px] text-text-muted">Records</p>
                      <p className="text-xs font-mono text-text-primary">
                        {formatNumber(source.total_records)}
                      </p>
                    </div>

                    {/* Trigger button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerIngestion(source.slug);
                      }}
                      disabled={isTriggering}
                      className="flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
                    >
                      {isTriggering ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Play size={10} />
                      )}
                      {isTriggering ? 'Running' : 'Run'}
                    </button>
                  </div>
                </div>

                {/* Expanded: Recent Jobs */}
                {isExpanded && (
                  <div className="border-t border-border px-3 py-2 bg-bg-primary/50">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Recent Jobs</p>

                    {source.recent_jobs.length === 0 ? (
                      <p className="text-xs text-text-muted py-2">No jobs yet. Click Run to start the first ingestion.</p>
                    ) : (
                      <div className="space-y-1">
                        {source.recent_jobs.map((job) => {
                          const jobConf = JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.queued;
                          return (
                            <div key={job.id} className="flex items-center gap-3 py-1 text-[10px]">
                              <span className={cn('font-medium min-w-[60px]', jobConf.color)}>
                                {jobConf.label}
                              </span>
                              <span className="text-text-muted">
                                {job.triggered_by}
                              </span>
                              <span className="font-mono text-text-secondary">
                                {job.records_fetched} fetched
                              </span>
                              <span className="font-mono text-success">
                                +{job.records_created + job.records_updated}
                              </span>
                              {job.records_errored > 0 && (
                                <span className="font-mono text-danger">
                                  {job.records_errored} errors
                                </span>
                              )}
                              <span className="text-text-muted ml-auto">
                                {formatDuration(job.duration_ms)}
                              </span>
                              <span className="text-text-muted">
                                {timeAgo(job.completed_at || job.created_at)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Config details */}
                    <div className="mt-3 pt-2 border-t border-border/50 grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[9px] text-text-muted uppercase tracking-wider">Provider</span>
                        <p className="text-xs text-text-primary font-mono">{source.provider}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-text-muted uppercase tracking-wider">Schedule</span>
                        <p className="text-xs text-text-primary font-mono">{source.refresh_schedule || 'Manual'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-text-muted uppercase tracking-wider">Coverage</span>
                        <p className="text-xs text-text-primary font-mono">
                          {source.coverage_states?.join(', ') || 'Nationwide'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
