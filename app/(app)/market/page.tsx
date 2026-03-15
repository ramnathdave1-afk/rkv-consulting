'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CongestionChart } from '@/components/market/CongestionChart';
import { UtilityRatesChart } from '@/components/market/UtilityRatesChart';
import { LandPriceHeatmap } from '@/components/market/LandPriceHeatmap';
import { Skeleton } from '@/components/ui/Skeleton';

interface MarketRow {
  region: string;
  state: string;
  avg_power_cost_kwh: number;
  avg_land_cost_acre: number;
  tax_incentive_score: number;
  fiber_density_score: number;
}

interface SubstationRow {
  region: string;
  capacity_mw: number;
  available_mw: number;
}

export default function MarketAnalyticsPage() {
  const [marketData, setMarketData] = useState<MarketRow[]>([]);
  const [substationData, setSubstationData] = useState<SubstationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [marketRes, subRes] = await Promise.all([
        supabase.from('market_intelligence').select('region, state, avg_power_cost_kwh, avg_land_cost_acre, tax_incentive_score, fiber_density_score').order('region'),
        supabase.from('substations').select('state, capacity_mw, available_mw'),
      ]);

      setMarketData((marketRes.data || []) as MarketRow[]);
      setSubstationData((subRes.data || []).map((s: Record<string, unknown>) => ({
        region: s.state as string,
        capacity_mw: s.capacity_mw as number,
        available_mw: s.available_mw as number,
      })));
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="font-display text-lg font-bold text-text-primary">Market Analytics</h1>
        <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">PJM Interconnection Territory — Real-Time Intelligence</p>
      </div>

      <CongestionChart data={substationData} />
      <UtilityRatesChart data={marketData} />
      <LandPriceHeatmap data={marketData} />
    </div>
  );
}
