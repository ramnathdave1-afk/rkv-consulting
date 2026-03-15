'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { MapFilters, type MapFilterValues } from '@/components/map/MapFilters';
import { SiteReportPanel } from '@/components/reports/SiteReportPanel';
import { Skeleton } from '@/components/ui/Skeleton';
import type { SiteMapData, Substation } from '@/lib/types';

const MapContainer = dynamic(
  () => import('@/components/map/MapContainer').then((m) => m.MapContainer),
  { ssr: false, loading: () => <div className="h-full w-full bg-bg-primary animate-pulse" /> },
);

const defaultFilters: MapFilterValues = {
  minCapacity: null,
  maxCapacity: null,
  minScore: null,
  stages: [],
  maxDistance: null,
};

export default function MapPage() {
  const [sites, setSites] = useState<SiteMapData[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [filters, setFilters] = useState<MapFilterValues>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchMapData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const [sitesRes, subsRes] = await Promise.all([
        supabase
          .from('ghost_sites')
          .select(`
            id, name, lat, lng, state, pipeline_stage, target_mw, acreage,
            site_scores(composite_score),
            nearest_substation:substations!ghost_sites_nearest_substation_id_fkey(name)
          `)
          .eq('org_id', profile.org_id),
        supabase
          .from('substations')
          .select('id, name, lat, lng, voltage_kv, capacity_mw, available_mw, utility, state, pjm_zone'),
      ]);

      const mappedSites: SiteMapData[] = (sitesRes.data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        name: s.name as string,
        lat: s.lat as number,
        lng: s.lng as number,
        state: s.state as string,
        pipeline_stage: s.pipeline_stage as SiteMapData['pipeline_stage'],
        target_mw: s.target_mw as number | null,
        acreage: s.acreage as number | null,
        composite_score: (s.site_scores as Record<string, unknown>[] | null)?.[0]?.composite_score as number | null ?? null,
        nearest_substation_name: (s.nearest_substation as Record<string, unknown> | null)?.name as string | null ?? null,
        distance_to_substation_mi: null,
      }));

      setSites(mappedSites);
      setSubstations((subsRes.data || []) as Substation[]);
      setLoading(false);
    }

    fetchMapData();
  }, [supabase]);

  // Apply client-side filters
  const filteredSites = sites.filter((site) => {
    if (filters.minCapacity && (site.target_mw || 0) < filters.minCapacity) return false;
    if (filters.maxCapacity && (site.target_mw || 0) > filters.maxCapacity) return false;
    if (filters.minScore && (site.composite_score || 0) < filters.minScore) return false;
    if (filters.stages.length > 0 && !filters.stages.includes(site.pipeline_stage)) return false;
    if (filters.maxDistance && (site.distance_to_substation_mi || Infinity) > filters.maxDistance) return false;
    return true;
  });

  const handleSiteClick = useCallback((siteId: string) => {
    setSelectedSiteId(siteId);
  }, []);

  if (loading) {
    return <div className="h-[calc(100vh-3.5rem)] w-full"><Skeleton className="h-full w-full" /></div>;
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full">
      <MapContainer
        sites={filteredSites}
        substations={substations}
        onSiteClick={handleSiteClick}
      />
      <MapFilters filters={filters} onChange={setFilters} />
      <SiteReportPanel siteId={selectedSiteId} onClose={() => setSelectedSiteId(null)} />
    </div>
  );
}
