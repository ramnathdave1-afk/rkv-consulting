'use client';

import React from 'react';
import { DollarSign, TrendingUp, Home, BarChart3 } from 'lucide-react';

interface ARVData {
  fromAVM: number;
  fromComps: number;
  high: number;
  low: number;
  medianPricePerSqft: number;
}

interface RentalStats {
  avgRent: number;
  medianRent: number;
  compCount: number;
}

interface ARVSummaryProps {
  arv: ARVData;
  rentalStats: RentalStats;
}

const fmt = (v: number) =>
  v >= 1000
    ? `$${(v / 1000).toFixed(v >= 1_000_000 ? 0 : 0)}k`
    : `$${v.toLocaleString()}`;

const fmtFull = (v: number) =>
  `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ARVSummary({ arv, rentalStats }: ARVSummaryProps) {
  const cards = [
    {
      label: 'ARV (AVM)',
      value: arv.fromAVM ? fmtFull(arv.fromAVM) : '—',
      sub: arv.high && arv.low ? `${fmt(arv.low)} – ${fmt(arv.high)}` : null,
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'ARV (Comps Median)',
      value: arv.fromComps ? fmtFull(arv.fromComps) : '—',
      sub: arv.fromComps && arv.fromAVM
        ? `${((arv.fromComps / arv.fromAVM - 1) * 100).toFixed(1)}% vs AVM`
        : null,
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Median $/sqft',
      value: arv.medianPricePerSqft ? `$${arv.medianPricePerSqft.toFixed(0)}` : '—',
      sub: 'Based on comp sales',
      icon: BarChart3,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Avg Rent',
      value: rentalStats.avgRent ? fmtFull(rentalStats.avgRent) : '—',
      sub: rentalStats.compCount
        ? `${rentalStats.compCount} comps | Median ${fmtFull(rentalStats.medianRent)}`
        : null,
      icon: Home,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-800 bg-[#111111] p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`${card.bg} rounded-lg p-2`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <span className="text-xs text-slate-400 font-medium">{card.label}</span>
          </div>
          <p className="text-xl font-bold text-white">{card.value}</p>
          {card.sub && (
            <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
