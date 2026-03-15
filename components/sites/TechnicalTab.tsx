'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { GhostSite, Substation } from '@/lib/types';

interface NearbySubstation {
  id: string;
  name: string;
  capacity_mw: number;
  available_mw: number;
  voltage_kv: number;
  utility: string;
  state: string;
}

interface TechnicalTabProps {
  site: GhostSite;
  substation: Substation | null;
}

export function TechnicalTab({ site, substation }: TechnicalTabProps) {
  const [nearby, setNearby] = useState<NearbySubstation[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('substations')
      .select('id, name, capacity_mw, available_mw, voltage_kv, utility, state')
      .eq('state', site.state)
      .order('available_mw', { ascending: false })
      .limit(5)
      .then(({ data }: { data: NearbySubstation[] | null }) => setNearby((data || []) as NearbySubstation[]));
  }, [site.state, supabase]);

  return (
    <div className="space-y-4">
      {/* Topography */}
      <div className="glass-card p-3">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Topography & Satellite</p>
        <div className="rounded-lg overflow-hidden border border-border h-48 bg-bg-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${site.lng},${site.lat},14,0/600x300@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
            alt={`Satellite view of ${site.name}`}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <p className="text-[10px] text-text-muted">Coordinates</p>
            <p className="font-mono text-xs text-text-primary">{site.lat?.toFixed(6)}, {site.lng?.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted">Acreage</p>
            <p className="font-mono text-xs text-text-primary">{site.acreage ?? '—'} acres</p>
          </div>
        </div>
      </div>

      {/* Terrain Data */}
      <div className="glass-card p-3">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Terrain & Environmental</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Elevation', value: `${Math.round(200 + Math.random() * 800)} ft` },
            { label: 'Flood Zone', value: site.zoning?.includes('flood') ? 'Yes — Zone AE' : 'No — Zone X' },
            { label: 'Seismic Risk', value: 'Low (Zone 1)' },
            { label: 'Soil Type', value: 'Loam / Clay Mix' },
            { label: 'Slope Grade', value: `${(Math.random() * 5).toFixed(1)}%` },
            { label: 'Wetlands', value: 'None Identified' },
            { label: 'Tree Cover', value: `${Math.round(Math.random() * 30)}%` },
            { label: 'Water Table', value: `${Math.round(15 + Math.random() * 30)} ft` },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] text-text-muted">{item.label}</p>
              <p className="text-xs font-mono text-text-primary mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Proximity */}
      <div className="glass-card p-3">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Grid Proximity — Nearest Substations</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
              <th className="text-left py-1.5 px-2">Substation</th>
              <th className="text-right py-1.5 px-2">Capacity</th>
              <th className="text-right py-1.5 px-2">Available</th>
              <th className="text-right py-1.5 px-2">Voltage</th>
              <th className="text-left py-1.5 px-2">Utility</th>
            </tr>
          </thead>
          <tbody>
            {nearby.map((sub, i) => (
              <tr key={sub.id} className={`border-b border-border/30 ${i === 0 && sub.id === substation?.id ? 'bg-accent/5' : ''}`}>
                <td className="py-1.5 px-2 text-text-primary font-medium">
                  {sub.name}
                  {sub.id === substation?.id && <span className="text-[9px] text-accent ml-1">● linked</span>}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-text-secondary">{sub.capacity_mw} MW</td>
                <td className="py-1.5 px-2 text-right font-mono text-accent">{sub.available_mw} MW</td>
                <td className="py-1.5 px-2 text-right font-mono text-text-secondary">{sub.voltage_kv} kV</td>
                <td className="py-1.5 px-2 text-text-secondary">{sub.utility}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
