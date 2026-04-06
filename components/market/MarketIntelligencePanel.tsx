'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Home,
  DollarSign,
  Users,
  Percent,
  BarChart3,
  Newspaper,
  ExternalLink,
  BedDouble,
} from 'lucide-react';

// ── Types matching SerpAPI client shapes ──

interface MarketStats {
  medianHomePrice: number | null;
  medianRent: number | null;
  vacancyRate: string | null;
  appreciationRate: string | null;
  population: string | null;
  medianIncome: string | null;
  insights: string[];
}

interface MarketNewsItem {
  title: string;
  snippet: string;
  link: string;
  source: string;
  date: string | null;
  thumbnail: string | null;
}

interface RentalComp {
  address: string;
  rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  source: string;
  link: string;
}

interface RentalData {
  rentals: RentalComp[];
  medianRent: number | null;
  avgRent: number | null;
  lowRent: number | null;
  highRent: number | null;
}

// ── Tab type ──

type TabKey = 'stats' | 'rentals' | 'news';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'stats', label: 'Market Stats', icon: BarChart3 },
  { key: 'rentals', label: 'Rental Rates', icon: BedDouble },
  { key: 'news', label: 'Market News', icon: Newspaper },
];

// ── Component Props ──

interface MarketIntelligencePanelProps {
  city: string;
  state: string;
  zip?: string;
}

export function MarketIntelligencePanel({ city, state, zip }: MarketIntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('stats');
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [news, setNews] = useState<MarketNewsItem[]>([]);
  const [rentalData, setRentalData] = useState<RentalData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingRentals, setLoadingRentals] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [errorNews, setErrorNews] = useState<string | null>(null);
  const [errorRentals, setErrorRentals] = useState<string | null>(null);

  useEffect(() => {
    if (!city || !state) return;

    setLoadingStats(true);
    setLoadingNews(true);
    setLoadingRentals(true);
    setErrorStats(null);
    setErrorNews(null);
    setErrorRentals(null);

    fetch(`/api/market/stats?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`)
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch stats'); return r.json(); })
      .then((d) => setStats(d))
      .catch((e) => setErrorStats(e.message))
      .finally(() => setLoadingStats(false));

    fetch(`/api/market/news?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`)
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch news'); return r.json(); })
      .then((d) => setNews(d.news || []))
      .catch((e) => setErrorNews(e.message))
      .finally(() => setLoadingNews(false));

    const rentalParams = new URLSearchParams({ city, state, zip: zip || '' });
    if (!zip) rentalParams.delete('zip');
    fetch(`/api/market/rentals?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&zip=${encodeURIComponent(zip || '')}`)
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch rentals'); return r.json(); })
      .then((d) => setRentalData(d))
      .catch((e) => setErrorRentals(e.message))
      .finally(() => setLoadingRentals(false));
  }, [city, state, zip]);

  return (
    <div className="space-y-4">
      {/* Tab Buttons */}
      <div className="flex gap-1 p-1 rounded-lg bg-bg-primary border border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {loadingStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : errorStats ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-400">{errorStats}</p>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: 'Median Home Price',
                    value: stats.medianHomePrice ? `$${stats.medianHomePrice.toLocaleString()}` : '--',
                    icon: Home,
                    color: '#00D4AA',
                  },
                  {
                    label: 'Median Rent',
                    value: stats.medianRent ? `$${stats.medianRent.toLocaleString()}/mo` : '--',
                    icon: DollarSign,
                    color: '#3B82F6',
                  },
                  {
                    label: 'Vacancy Rate',
                    value: stats.vacancyRate || '--',
                    icon: Percent,
                    color: '#F59E0B',
                  },
                  {
                    label: 'Appreciation',
                    value: stats.appreciationRate || '--',
                    icon: TrendingUp,
                    color: '#22C55E',
                  },
                  {
                    label: 'Population',
                    value: stats.population || '--',
                    icon: Users,
                    color: '#8B5CF6',
                  },
                  {
                    label: 'Median Income',
                    value: stats.medianIncome || '--',
                    icon: DollarSign,
                    color: '#EF4444',
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="glass-card p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${item.color}15` }}
                        >
                          <Icon size={14} style={{ color: item.color }} />
                        </div>
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-text-muted">{item.label}</p>
                      <p className="text-lg font-bold text-text-primary mt-0.5">{item.value}</p>
                    </motion.div>
                  );
                })}
              </div>

              {stats.insights.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Market Insights</h4>
                  <div className="space-y-2">
                    {stats.insights.slice(0, 3).map((insight, i) => (
                      <p key={i} className="text-xs text-text-secondary leading-relaxed">
                        {insight}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </motion.div>
      )}

      {/* Rentals Tab */}
      {activeTab === 'rentals' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {loadingRentals ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
              <Skeleton className="h-48" />
            </div>
          ) : errorRentals ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-400">{errorRentals}</p>
            </div>
          ) : rentalData ? (
            <div className="space-y-4">
              {/* Rent summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Avg Rent', value: rentalData.avgRent },
                  { label: 'Median Rent', value: rentalData.medianRent },
                  { label: 'Low', value: rentalData.lowRent },
                  { label: 'High', value: rentalData.highRent },
                ].map((item) => (
                  <div key={item.label} className="glass-card p-3">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">{item.label}</p>
                    <p className="text-lg font-bold text-text-primary">
                      {item.value !== null ? `$${item.value.toLocaleString()}` : '--'}
                    </p>
                    <p className="text-[10px] text-text-muted">/month</p>
                  </div>
                ))}
              </div>

              {/* Rental comps list */}
              {rentalData.rentals.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h4 className="text-xs font-medium text-text-primary">Rental Comps ({rentalData.rentals.length})</h4>
                  </div>
                  <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
                    {rentalData.rentals.map((rental, i) => (
                      <div key={i} className="px-4 py-3 hover:bg-bg-elevated/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-text-primary truncate">{rental.address}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {rental.bedrooms !== null && (
                                <span className="text-[10px] text-text-muted">{rental.bedrooms} bd</span>
                              )}
                              {rental.bathrooms !== null && (
                                <span className="text-[10px] text-text-muted">{rental.bathrooms} ba</span>
                              )}
                              {rental.sqft !== null && (
                                <span className="text-[10px] text-text-muted">{rental.sqft.toLocaleString()} sqft</span>
                              )}
                              <span className="text-[10px] text-text-muted">{rental.source}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-[#00D4AA]">
                              {rental.rent !== null ? `$${rental.rent.toLocaleString()}` : '--'}
                            </span>
                            {rental.link && (
                              <a href={rental.link} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </motion.div>
      )}

      {/* News Tab */}
      {activeTab === 'news' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {loadingNews ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : errorNews ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-400">{errorNews}</p>
            </div>
          ) : news.length > 0 ? (
            <div className="glass-card overflow-hidden">
              <div className="divide-y divide-border/50 max-h-[480px] overflow-y-auto">
                {news.map((item, i) => (
                  <motion.a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="flex gap-3 px-4 py-3 hover:bg-bg-elevated/50 transition-colors group"
                  >
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text-primary group-hover:text-[#00D4AA] transition-colors line-clamp-2">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-text-secondary mt-1 line-clamp-2">{item.snippet}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-text-muted">{item.source}</span>
                        {item.date && (
                          <>
                            <span className="text-[10px] text-text-muted">-</span>
                            <span className="text-[10px] text-text-muted">{item.date}</span>
                          </>
                        )}
                        <ExternalLink size={10} className="text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 glass-card">
              <Newspaper size={24} className="mx-auto text-text-muted mb-2" />
              <p className="text-xs text-text-secondary">No news found for {city}, {state}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
