'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import {
  Home,
  DollarSign,
  Ruler,
  BedDouble,
  Bath,
  MapPin,
  Footprints,
  Calendar,
  ExternalLink,
} from 'lucide-react';

// ── Types matching SerpAPI client shapes ──

interface PropertyResearch {
  estimatedValue: number | null;
  zestimate: number | null;
  lastSoldPrice: number | null;
  lastSoldDate: string | null;
  yearBuilt: number | null;
  lotSize: string | null;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  walkScore: number | null;
  schoolRating: string | null;
  sources: { title: string; link: string; snippet: string }[];
}

interface PropertyComp {
  address: string;
  price: number | null;
  pricePerSqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  soldDate: string | null;
  source: string;
  link: string;
  thumbnail: string | null;
}

interface CompsData {
  comps: PropertyComp[];
  medianPrice: number | null;
  medianPricePerSqft: number | null;
  avgPrice: number | null;
}

// ── Component Props ──

interface DealMarketDataProps {
  address: string;
  city: string;
  state: string;
  zip: string;
}

export function DealMarketData({ address, city, state, zip }: DealMarketDataProps) {
  const [research, setResearch] = useState<PropertyResearch | null>(null);
  const [compsData, setCompsData] = useState<CompsData | null>(null);
  const [loadingResearch, setLoadingResearch] = useState(true);
  const [loadingComps, setLoadingComps] = useState(true);
  const [errorResearch, setErrorResearch] = useState<string | null>(null);
  const [errorComps, setErrorComps] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !city || !state || !zip) return;

    setLoadingResearch(true);
    setLoadingComps(true);
    setErrorResearch(null);
    setErrorComps(null);

    const params = new URLSearchParams({ address, city, state, zip });

    fetch(`/api/market/research?${params}`)
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch research'); return r.json(); })
      .then((d) => setResearch(d))
      .catch((e) => setErrorResearch(e.message))
      .finally(() => setLoadingResearch(false));

    fetch(`/api/market/comps?${params}`)
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch comps'); return r.json(); })
      .then((d) => setCompsData(d))
      .catch((e) => setErrorComps(e.message))
      .finally(() => setLoadingComps(false));
  }, [address, city, state, zip]);

  return (
    <div className="space-y-6">
      {/* Property Research Section */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <MapPin size={12} />
          Property Research
        </h3>

        {loadingResearch ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : errorResearch ? (
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-red-400">{errorResearch}</p>
          </div>
        ) : research ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Estimated Value',
                  value: research.estimatedValue ? `$${research.estimatedValue.toLocaleString()}` : '--',
                  icon: Home,
                  color: '#00D4AA',
                },
                {
                  label: 'Zestimate',
                  value: research.zestimate ? `$${research.zestimate.toLocaleString()}` : '--',
                  icon: DollarSign,
                  color: '#3B82F6',
                },
                {
                  label: 'Last Sold',
                  value: research.lastSoldPrice ? `$${research.lastSoldPrice.toLocaleString()}` : '--',
                  icon: Calendar,
                  color: '#F59E0B',
                  sub: research.lastSoldDate || undefined,
                },
                {
                  label: 'Beds / Baths',
                  value: `${research.bedrooms ?? '--'} / ${research.bathrooms ?? '--'}`,
                  icon: BedDouble,
                  color: '#8B5CF6',
                },
                {
                  label: 'Sq Ft',
                  value: research.sqft ? research.sqft.toLocaleString() : '--',
                  icon: Ruler,
                  color: '#EF4444',
                },
                {
                  label: 'Walk Score',
                  value: research.walkScore !== null ? `${research.walkScore}/100` : '--',
                  icon: Footprints,
                  color: '#22C55E',
                },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="glass-card p-3"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <Icon size={12} style={{ color: item.color }} />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-text-muted">{item.label}</p>
                    </div>
                    <p className="text-sm font-bold text-text-primary">{item.value}</p>
                    {'sub' in item && item.sub && (
                      <p className="text-[10px] text-text-muted mt-0.5">{item.sub}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Additional details */}
            <div className="grid grid-cols-2 gap-3">
              {research.lotSize && (
                <div className="p-2.5 rounded-lg bg-bg-primary border border-border">
                  <p className="text-[10px] text-text-muted">Lot Size</p>
                  <p className="text-xs font-medium text-text-primary">{research.lotSize}</p>
                </div>
              )}
              {research.yearBuilt && (
                <div className="p-2.5 rounded-lg bg-bg-primary border border-border">
                  <p className="text-[10px] text-text-muted">Year Built</p>
                  <p className="text-xs font-medium text-text-primary">{research.yearBuilt}</p>
                </div>
              )}
              {research.schoolRating && (
                <div className="p-2.5 rounded-lg bg-bg-primary border border-border">
                  <p className="text-[10px] text-text-muted">School Rating</p>
                  <p className="text-xs font-medium text-text-primary">{research.schoolRating}</p>
                </div>
              )}
            </div>

            {/* Sources */}
            {research.sources.length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Sources</p>
                <div className="flex flex-wrap gap-1.5">
                  {research.sources.slice(0, 5).map((src, i) => (
                    <a
                      key={i}
                      href={src.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-bg-primary border border-border text-[10px] text-text-secondary hover:text-[#00D4AA] hover:border-[#00D4AA]/30 transition-colors"
                    >
                      {src.title.slice(0, 30)}
                      <ExternalLink size={8} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Market Comps Section */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Home size={12} />
          Market Comps
        </h3>

        {loadingComps ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
            <Skeleton className="h-48" />
          </div>
        ) : errorComps ? (
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-red-400">{errorComps}</p>
          </div>
        ) : compsData ? (
          <div className="space-y-3">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Median Price', value: compsData.medianPrice },
                { label: 'Avg Price', value: compsData.avgPrice },
                { label: 'Median $/sqft', value: compsData.medianPricePerSqft },
              ].map((item) => (
                <div key={item.label} className="glass-card p-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">{item.label}</p>
                  <p className="text-sm font-bold text-text-primary">
                    {item.value !== null ? `$${item.value.toLocaleString()}` : '--'}
                  </p>
                </div>
              ))}
            </div>

            {/* Comps table */}
            {compsData.comps.length > 0 && (
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h4 className="text-xs font-medium text-text-primary">
                    Comparable Sales ({compsData.comps.length})
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-2.5 text-[10px] font-medium text-text-muted uppercase">Address</th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-text-muted uppercase">Price</th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-text-muted uppercase">$/Sqft</th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-text-muted uppercase">Bed</th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-text-muted uppercase">Bath</th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-text-muted uppercase">Sqft</th>
                        <th className="px-4 py-2.5 text-[10px] font-medium text-text-muted uppercase">Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compsData.comps.map((comp, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                          <td className="px-4 py-2.5 text-text-primary font-medium">
                            {comp.link ? (
                              <a href={comp.link} target="_blank" rel="noopener noreferrer" className="hover:text-[#00D4AA] transition-colors flex items-center gap-1">
                                <span className="truncate max-w-[180px]">{comp.address}</span>
                                <ExternalLink size={10} className="shrink-0 opacity-50" />
                              </a>
                            ) : (
                              <span className="truncate max-w-[180px] block">{comp.address}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[#00D4AA] font-medium">
                            {comp.price !== null ? `$${comp.price.toLocaleString()}` : '--'}
                          </td>
                          <td className="px-4 py-2.5 text-text-secondary">
                            {comp.pricePerSqft !== null ? `$${comp.pricePerSqft}` : '--'}
                          </td>
                          <td className="px-4 py-2.5 text-text-secondary">{comp.bedrooms ?? '--'}</td>
                          <td className="px-4 py-2.5 text-text-secondary">{comp.bathrooms ?? '--'}</td>
                          <td className="px-4 py-2.5 text-text-secondary">
                            {comp.sqft !== null ? comp.sqft.toLocaleString() : '--'}
                          </td>
                          <td className="px-4 py-2.5 text-text-muted">{comp.soldDate || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
