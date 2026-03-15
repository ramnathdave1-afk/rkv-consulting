'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Building2, MapPin, Zap, Search } from 'lucide-react';
import { PIPELINE_STAGES } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import type { PipelineStage } from '@/lib/types';

interface SiteListItem {
  id: string;
  name: string;
  state: string;
  county: string | null;
  target_mw: number | null;
  acreage: number | null;
  pipeline_stage: PipelineStage;
  composite_score: number | null;
}

export default function SitesPage() {
  const [sites, setSites] = useState<SiteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function fetchSites() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from('ghost_sites')
        .select('id, name, state, county, target_mw, acreage, pipeline_stage, site_scores(composite_score)')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      const mapped = (data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        name: s.name as string,
        state: s.state as string,
        county: s.county as string | null,
        target_mw: s.target_mw as number | null,
        acreage: s.acreage as number | null,
        pipeline_stage: s.pipeline_stage as PipelineStage,
        composite_score: (s.site_scores as Record<string, unknown>[] | null)?.[0]?.composite_score as number | null ?? null,
      }));

      setSites(mapped);
      setLoading(false);
    }

    fetchSites();
  }, [supabase]);

  const filtered = search
    ? sites.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.state.toLowerCase().includes(search.toLowerCase()),
      )
    : sites;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Sites</h1>
          <p className="text-sm text-text-secondary">{sites.length} sites tracked</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sites..."
          className="w-full rounded-lg border border-border bg-bg-primary pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {/* Sites table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">MW</th>
              <th className="px-4 py-3">Acres</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Stage</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6"><Skeleton className="h-4 w-full" /></td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No sites found</td></tr>
            )}
            {filtered.map((site) => {
              const stage = PIPELINE_STAGES.find((s) => s.value === site.pipeline_stage);
              return (
                <tr key={site.id} className="border-b border-border/50 hover:bg-bg-elevated/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/sites/${site.id}`} className="flex items-center gap-2 text-text-primary hover:text-accent transition-colors">
                      <Building2 size={14} className="text-text-muted" />
                      <span className="font-medium">{site.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {site.state}{site.county ? `, ${site.county}` : ''}
                  </td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{site.target_mw || '—'}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{site.acreage || '—'}</td>
                  <td className="px-4 py-3 font-mono text-accent">{site.composite_score ?? '—'}</td>
                  <td className="px-4 py-3">
                    {stage && <Badge color={stage.color} size="sm" dot>{stage.label}</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
