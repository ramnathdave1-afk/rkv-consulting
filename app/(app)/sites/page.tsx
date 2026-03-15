'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SiteDataTable, type SiteRow } from '@/components/sites/SiteDataTable';
import { ComparisonPanel } from '@/components/sites/ComparisonPanel';
import { Skeleton } from '@/components/ui/Skeleton';
import { GitCompareArrows } from 'lucide-react';
import type { PipelineStage } from '@/lib/types';

export default function SitesPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSites, setSelectedSites] = useState<SiteRow[]>([]);
  const [comparing, setComparing] = useState(false);
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
        .from('sites')
        .select('id, name, state, county, target_capacity, acreage, zoning, pipeline_stage, distance_to_substation_mi, site_scores(composite_score, risk_score)')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      const mapped: SiteRow[] = (data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        name: s.name as string,
        state: s.state as string,
        county: s.county as string | null,
        target_capacity: s.target_capacity as number | null,
        acreage: s.acreage as number | null,
        zoning: s.zoning as string | null,
        pipeline_stage: s.pipeline_stage as PipelineStage,
        distance_to_substation_mi: s.distance_to_substation_mi as number | null,
        composite_score: (s.site_scores as Record<string, unknown>[] | null)?.[0]?.composite_score as number | null ?? null,
        risk_score: (s.site_scores as Record<string, unknown>[] | null)?.[0]?.risk_score as number | null ?? null,
      }));

      setSites(mapped);
      setLoading(false);
    }

    fetchSites();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-text-primary">Site Portfolio</h1>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">{sites.length} sites tracked</p>
        </div>
        {selectedSites.length >= 2 && (
          <button
            onClick={() => setComparing(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/20 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
          >
            <GitCompareArrows size={13} />
            Compare {selectedSites.length} Sites
          </button>
        )}
      </div>

      <SiteDataTable data={sites} onSelectionChange={setSelectedSites} />

      {comparing && selectedSites.length >= 2 && (
        <ComparisonPanel sites={selectedSites} onClose={() => setComparing(false)} />
      )}
    </div>
  );
}
