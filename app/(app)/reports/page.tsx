'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { FileText, Download, MapPin, Calendar, Filter, BarChart3, ArrowUpDown } from 'lucide-react';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';
import { ScoreGauge } from '@/components/reports/ScoreGauge';
import { formatDistanceToNow } from 'date-fns';

interface SiteWithScore {
  id: string;
  name: string;
  state: string;
  county: string | null;
  target_capacity: number | null;
  pipeline_stage: string;
  created_at: string;
  composite_score: number | null;
  scored_at: string | null;
}

type SortField = 'name' | 'composite_score' | 'scored_at';

export default function ReportsPage() {
  const [sites, setSites] = useState<SiteWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scored' | 'unscored'>('all');
  const [sortField, setSortField] = useState<SortField>('composite_score');
  const [sortAsc, setSortAsc] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSites() {
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, name, state, county, target_capacity, pipeline_stage, created_at');

      if (!sitesData) { setLoading(false); return; }

      const { data: scores } = await supabase
        .from('site_scores')
        .select('site_id, composite_score, scored_at')
        .order('scored_at', { ascending: false });

      const scoreMap = new Map<string, { composite_score: number; scored_at: string }>();
      scores?.forEach((s: { site_id: string; composite_score: number; scored_at: string }) => {
        if (!scoreMap.has(s.site_id)) {
          scoreMap.set(s.site_id, { composite_score: s.composite_score, scored_at: s.scored_at });
        }
      });

      const combined = sitesData.map((site: { id: string; name: string; state: string; county: string | null; target_capacity: number | null; pipeline_stage: string; created_at: string }) => ({
        ...site,
        composite_score: scoreMap.get(site.id)?.composite_score ?? null,
        scored_at: scoreMap.get(site.id)?.scored_at ?? null,
      }));

      setSites(combined);
      setLoading(false);
    }
    fetchSites();
  }, [supabase]);

  const filtered = sites.filter((s) => {
    if (filter === 'scored') return s.composite_score !== null;
    if (filter === 'unscored') return s.composite_score === null;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  }

  async function handleExport(format: 'csv' | 'json') {
    const res = await fetch(`/api/export?format=${format}&type=sites`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meridian-node-sites.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Reports</h1>
          <p className="text-sm text-text-secondary">AI-powered portfolio analysis and site reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent transition-colors"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent transition-colors"
          >
            <Download size={12} /> Export JSON
          </button>
        </div>
      </div>

      {/* AI Insights */}
      <AIInsightsPanel />

      {/* Site Reports Table */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-accent" />
            <span className="text-xs font-semibold text-text-primary">Site Reports</span>
            <span className="text-[10px] text-text-muted">({filtered.length} sites)</span>
          </div>
          <div className="flex items-center gap-1">
            <Filter size={10} className="text-text-muted" />
            {(['all', 'scored', 'unscored'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  filter === f
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {f === 'all' ? 'All' : f === 'scored' ? 'Scored' : 'Unscored'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-text-muted mt-2">Loading sites...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={24} className="text-text-muted mx-auto mb-3" />
            <p className="text-xs text-text-primary mb-1">No sites found</p>
            <p className="text-[10px] text-text-muted">Add sites to generate reports</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="text-left py-2 px-4">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-accent transition-colors">
                      Site <ArrowUpDown size={9} />
                    </button>
                  </th>
                  <th className="text-center py-2 px-4">
                    <button onClick={() => toggleSort('composite_score')} className="flex items-center gap-1 mx-auto hover:text-accent transition-colors">
                      Score <ArrowUpDown size={9} />
                    </button>
                  </th>
                  <th className="text-left py-2 px-4">Location</th>
                  <th className="text-right py-2 px-4">Capacity</th>
                  <th className="text-left py-2 px-4">
                    <button onClick={() => toggleSort('scored_at')} className="flex items-center gap-1 hover:text-accent transition-colors">
                      Last Scored <ArrowUpDown size={9} />
                    </button>
                  </th>
                  <th className="text-right py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((site, i) => (
                  <motion.tr
                    key={site.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/30 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <a href={`/sites/${site.id}`} className="font-medium text-text-primary hover:text-accent transition-colors">
                        {site.name}
                      </a>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {site.composite_score !== null ? (
                        <div className="flex justify-center">
                          <ScoreGauge score={site.composite_score} size={32} strokeWidth={3} />
                        </div>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-text-secondary">
                      <div className="flex items-center gap-1">
                        <MapPin size={10} className="text-text-muted shrink-0" />
                        <span className="truncate">{site.state}{site.county ? `, ${site.county}` : ''}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-text-secondary">
                      {site.target_capacity ? `${site.target_capacity} MW` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-text-muted">
                      {site.scored_at ? (
                        <div className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDistanceToNow(new Date(site.scored_at), { addSuffix: true })}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/sites/${site.id}`}
                          className="rounded px-2 py-1 text-[10px] font-medium text-text-secondary border border-border hover:border-accent hover:text-accent transition-colors"
                        >
                          View
                        </a>
                        <button
                          onClick={async () => {
                            setExportingId(site.id);
                            const res = await fetch(`/api/reports/${site.id}/pdf`);
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${site.name.replace(/\s+/g, '-').toLowerCase()}-report.${res.headers.get('content-type')?.includes('pdf') ? 'pdf' : 'html'}`;
                            a.click();
                            URL.revokeObjectURL(url);
                            setExportingId(null);
                          }}
                          disabled={exportingId === site.id}
                          className="rounded px-2 py-1 text-[10px] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
                        >
                          {exportingId === site.id ? 'Generating...' : 'PDF'}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
