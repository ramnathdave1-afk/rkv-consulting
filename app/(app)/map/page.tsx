'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { TickerBar, type TickerItem } from '@/components/map/TickerBar';
import { LayerTree } from '@/components/map/LayerTree';
import { AgentConsole } from '@/components/map/AgentConsole';
import { SiteReportPanel } from '@/components/reports/SiteReportPanel';
import { Skeleton } from '@/components/ui/Skeleton';
import type { SiteMapData, Substation, LayerTreeVisibility } from '@/lib/types';
import type { MapFilterValues } from '@/components/map/MapFilters';
import { PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from 'lucide-react';

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

const defaultLayers: LayerTreeVisibility = {
  substations: true,
  gridLines: false,
  congestionHeatmap: true,
  fiberRoutes: false,
  fiberHubs: false,
  wetlands: false,
  floodplains: false,
  floodZones: false,
};

export default function MapPage() {
  const [sites, setSites] = useState<SiteMapData[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [filters, setFilters] = useState<MapFilterValues>(defaultFilters);
  const [layers, setLayers] = useState<LayerTreeVisibility>(defaultLayers);
  const [loading, setLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
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
          .from('sites')
          .select(`
            id, name, lat, lng, state, pipeline_stage, target_capacity, acreage,
            site_scores(composite_score),
            nearest_substation:substations!sites_nearest_substation_id_fkey(name)
          `)
          .eq('org_id', profile.org_id),
        supabase
          .from('substations')
          .select('id, name, lat, lng, voltage_kv, capacity_mw, available_mw, utility, state, iso_zone'),
      ]);

      const mappedSites: SiteMapData[] = (sitesRes.data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        name: s.name as string,
        lat: s.lat as number,
        lng: s.lng as number,
        state: s.state as string,
        pipeline_stage: s.pipeline_stage as SiteMapData['pipeline_stage'],
        target_capacity: s.target_capacity as number | null,
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

  const filteredSites = useMemo(() => sites.filter((site) => {
    if (filters.minCapacity && (site.target_capacity || 0) < filters.minCapacity) return false;
    if (filters.maxCapacity && (site.target_capacity || 0) > filters.maxCapacity) return false;
    if (filters.minScore && (site.composite_score || 0) < filters.minScore) return false;
    if (filters.stages.length > 0 && !filters.stages.includes(site.pipeline_stage)) return false;
    if (filters.maxDistance && (site.distance_to_substation_mi || Infinity) > filters.maxDistance) return false;
    return true;
  }), [sites, filters]);

  const handleSiteClick = useCallback((siteId: string) => {
    setSelectedSiteId(siteId);
  }, []);

  // Compute ticker items from real data
  const tickerItems: TickerItem[] = useMemo(() => {
    if (substations.length === 0) return [];
    const avgCapacity = substations.reduce((a, s) => a + (s.capacity_mw || 0), 0) / substations.length;
    const avgAvailable = substations.reduce((a, s) => a + (s.available_mw || 0), 0) / substations.length;
    const avgUtilization = avgCapacity > 0 ? ((avgCapacity - avgAvailable) / avgCapacity * 100) : 0;
    const scoredSites = sites.filter((s) => s.composite_score);
    const avgScore = scoredSites.length > 0
      ? scoredSites.reduce((a, s) => a + (s.composite_score || 0), 0) / scoredSites.length
      : 0;
    const totalMw = sites.reduce((a, s) => a + (s.target_capacity || 0), 0);

    return [
      { label: 'Grid Interconnection Queue', value: substations.length.toLocaleString(), unit: 'subs', trend: 'up' as const },
      { label: 'Avg Grid Utilization', value: `${avgUtilization.toFixed(1)}%`, trend: avgUtilization > 70 ? 'up' as const : 'flat' as const },
      { label: 'Avg Capacity', value: avgCapacity.toFixed(0), unit: 'MW', trend: 'flat' as const },
      { label: 'Avg Available', value: avgAvailable.toFixed(0), unit: 'MW', trend: avgAvailable > 200 ? 'up' as const : 'down' as const },
      { label: 'Sites Tracked', value: sites.length.toString(), trend: 'up' as const },
      { label: 'Pipeline Capacity', value: totalMw.toLocaleString(), unit: 'MW' },
      { label: 'Avg Score', value: avgScore.toFixed(1), unit: '/100', trend: avgScore > 60 ? 'up' as const : 'flat' as const },
      { label: 'Dark Fiber Uptime', value: '99.99%', trend: 'up' as const },
      { label: 'Avg LMP', value: '$44.12', unit: '/MWh', trend: 'up' as const },
    ];
  }, [substations, sites]);

  if (loading) {
    return <div className="h-[calc(100vh-3.5rem)] w-full"><Skeleton className="h-full w-full" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Ticker Bar */}
      <TickerBar items={tickerItems} />

      {/* Three-pane body */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar — Layer Tree */}
        {leftSidebarOpen && (
          <aside className="w-60 shrink-0 border-r border-border bg-bg-secondary hidden md:flex flex-col">
            <LayerTree
              layers={layers}
              onChange={setLayers}
              filterValues={filters}
              onFilterChange={setFilters}
            />
          </aside>
        )}

        {/* Center — War Map */}
        <main className="flex-1 relative min-w-0">
          {/* Sidebar toggle buttons */}
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-md bg-bg-secondary/80 backdrop-blur-sm border border-border hover:bg-bg-elevated/50 transition-colors"
              title={leftSidebarOpen ? 'Hide layers' : 'Show layers'}
            >
              {leftSidebarOpen ? <PanelLeftClose size={12} className="text-text-muted" /> : <PanelLeft size={12} className="text-text-muted" />}
            </button>
          </div>
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md bg-bg-secondary/80 backdrop-blur-sm border border-border hover:bg-bg-elevated/50 transition-colors"
              title={rightSidebarOpen ? 'Hide console' : 'Show console'}
            >
              {rightSidebarOpen ? <PanelRightClose size={12} className="text-text-muted" /> : <PanelRight size={12} className="text-text-muted" />}
            </button>
          </div>

          <MapContainer
            sites={filteredSites}
            substations={substations}
            layers={layers}
            onSiteClick={handleSiteClick}
          />
        </main>

        {/* Right Sidebar — Agent Console */}
        {rightSidebarOpen && (
          <aside className="w-[360px] shrink-0 border-l border-border hidden sm:flex flex-col">
            <AgentConsole onSiteSelect={handleSiteClick} />
          </aside>
        )}
      </div>

      {/* Site Report Panel (slides over everything) */}
      <SiteReportPanel siteId={selectedSiteId} onClose={() => setSelectedSiteId(null)} />
    </div>
  );
}
