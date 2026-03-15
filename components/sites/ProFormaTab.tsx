'use client';

import React, { useState, useMemo } from 'react';
import type { Site } from '@/lib/types';

interface ProFormaTabProps {
  site: Site;
}

export function ProFormaTab({ site }: ProFormaTabProps) {
  const [landCostPerAcre, setLandCostPerAcre] = useState(15000);
  const [infraCostPerMW, setInfraCostPerMW] = useState(800000);
  const [gridInterconnect, setGridInterconnect] = useState(2500000);
  const [permitting, setPermitting] = useState(500000);

  const calc = useMemo(() => {
    const acreage = site.acreage || 100;
    const mw = site.target_capacity || 50;
    const landTotal = landCostPerAcre * acreage;
    const infraTotal = infraCostPerMW * mw;
    const totalCapex = landTotal + infraTotal + gridInterconnect + permitting;
    const costPerMW = mw > 0 ? totalCapex / mw : 0;
    const annualRevenue = mw * 0.85 * 8760 * 0.06; // 85% utilization, $0.06/kWh
    const irr = annualRevenue > 0 ? ((annualRevenue / totalCapex) * 100) : 0;
    const payback = annualRevenue > 0 ? totalCapex / annualRevenue : 0;

    return { landTotal, infraTotal, totalCapex, costPerMW, annualRevenue, irr, payback };
  }, [site.acreage, site.target_capacity, landCostPerAcre, infraCostPerMW, gridInterconnect, permitting]);

  function fmtUsd(n: number) {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inputs */}
        <div className="glass-card p-3 space-y-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Cost Inputs</p>

          <div className="space-y-2">
            {[
              { label: 'Land Cost ($/acre)', value: landCostPerAcre, set: setLandCostPerAcre, sub: `${site.acreage || 100} acres × $${landCostPerAcre.toLocaleString()} = ${fmtUsd(calc.landTotal)}` },
              { label: 'Infrastructure ($/MW)', value: infraCostPerMW, set: setInfraCostPerMW, sub: `${site.target_capacity || 50} MW × $${infraCostPerMW.toLocaleString()} = ${fmtUsd(calc.infraTotal)}` },
              { label: 'Grid Interconnection ($)', value: gridInterconnect, set: setGridInterconnect, sub: `Based on ${site.distance_to_substation_mi?.toFixed(1) || '—'} mi to substation` },
              { label: 'Permitting & Legal ($)', value: permitting, set: setPermitting, sub: 'Fixed estimate' },
            ].map((input) => (
              <div key={input.label}>
                <label className="text-[10px] text-text-muted">{input.label}</label>
                <input
                  type="number"
                  value={input.value}
                  onChange={(e) => input.set(Number(e.target.value) || 0)}
                  className="w-full mt-0.5 rounded border border-border bg-bg-primary px-2 py-1 text-xs font-mono text-text-primary outline-none focus:border-accent"
                />
                <p className="text-[9px] text-text-muted mt-0.5">{input.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="glass-card p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Total CAPEX</p>
            <p className="text-2xl font-display font-bold text-accent">{fmtUsd(calc.totalCapex)}</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-text-muted">Land</span>
                <span className="font-mono text-text-secondary">{fmtUsd(calc.landTotal)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-text-muted">Infrastructure</span>
                <span className="font-mono text-text-secondary">{fmtUsd(calc.infraTotal)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-text-muted">Grid Interconnection</span>
                <span className="font-mono text-text-secondary">{fmtUsd(gridInterconnect)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-text-muted">Permitting & Legal</span>
                <span className="font-mono text-text-secondary">{fmtUsd(permitting)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Cost/MW</p>
              <p className="text-sm font-display font-bold text-text-primary mt-1">{fmtUsd(calc.costPerMW)}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Est. IRR</p>
              <p className="text-sm font-display font-bold text-accent mt-1">{calc.irr.toFixed(1)}%</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Payback</p>
              <p className="text-sm font-display font-bold text-text-primary mt-1">{calc.payback.toFixed(1)} yr</p>
            </div>
          </div>

          <div className="glass-card p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Revenue Assumptions</p>
            <div className="space-y-0.5 text-[10px] text-text-secondary">
              <p>Capacity: {site.target_capacity || 50} MW at 85% utilization</p>
              <p>Power rate: $0.06/kWh (wholesale)</p>
              <p>Est. annual revenue: {fmtUsd(calc.annualRevenue)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
