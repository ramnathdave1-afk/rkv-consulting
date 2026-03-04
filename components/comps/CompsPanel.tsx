'use client';

import React, { useState, useCallback } from 'react';
import { Search, Loader2, TrendingUp, Home, Building, type LucideIcon } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import ARVSummary from './ARVSummary';
import CompsTable from './CompsTable';
import CompsMap from './CompsMap';

interface SaleComp {
  address: string;
  salePrice: number;
  saleDate: string;
  beds: number;
  baths: number;
  sqft: number;
  pricePerSqft: number;
  yearBuilt: number;
  lat: number;
  lng: number;
}

interface RentalComp {
  address: string;
  rent: number;
  beds: number;
  baths: number;
  sqft: number;
  distance: number;
  daysOnMarket: number;
  lat: number;
  lng: number;
}

interface ActiveListing {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  daysOnMarket: number;
  lat: number;
  lng: number;
  imgSrc: string | null;
  homeType: string;
}

interface CompsResponse {
  subject: { address: string; coords: { lat: number; lng: number } | null };
  salesComps: SaleComp[];
  rentalComps: RentalComp[];
  activeListings: ActiveListing[];
  arv: { fromAVM: number; fromComps: number; high: number; low: number; medianPricePerSqft: number };
  rentalStats: { avgRent: number; medianRent: number; compCount: number };
}

type Tab = 'sales' | 'rentals' | 'active';

const fmt = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const SALES_COLUMNS = [
  { key: 'address' as const, label: 'Address' },
  { key: 'salePrice' as const, label: 'Sale Price', align: 'right' as const, format: (v: unknown) => fmt(v as number) },
  { key: 'saleDate' as const, label: 'Date' },
  { key: 'beds' as const, label: 'Beds', align: 'right' as const },
  { key: 'baths' as const, label: 'Baths', align: 'right' as const },
  { key: 'sqft' as const, label: 'Sqft', align: 'right' as const, format: (v: unknown) => (v as number).toLocaleString() },
  { key: 'pricePerSqft' as const, label: '$/sqft', align: 'right' as const, format: (v: unknown) => `$${(v as number).toFixed(0)}` },
];

const RENTAL_COLUMNS = [
  { key: 'address' as const, label: 'Address' },
  { key: 'rent' as const, label: 'Rent', align: 'right' as const, format: (v: unknown) => fmt(v as number) },
  { key: 'beds' as const, label: 'Beds', align: 'right' as const },
  { key: 'baths' as const, label: 'Baths', align: 'right' as const },
  { key: 'sqft' as const, label: 'Sqft', align: 'right' as const, format: (v: unknown) => (v as number).toLocaleString() },
  { key: 'distance' as const, label: 'Distance', align: 'right' as const, format: (v: unknown) => `${(v as number).toFixed(1)} mi` },
];

const LISTING_COLUMNS = [
  { key: 'address' as const, label: 'Address' },
  { key: 'price' as const, label: 'Price', align: 'right' as const, format: (v: unknown) => fmt(v as number) },
  { key: 'beds' as const, label: 'Beds', align: 'right' as const },
  { key: 'baths' as const, label: 'Baths', align: 'right' as const },
  { key: 'sqft' as const, label: 'Sqft', align: 'right' as const, format: (v: unknown) => (v as number).toLocaleString() },
  { key: 'homeType' as const, label: 'Type' },
  { key: 'daysOnMarket' as const, label: 'DOM', align: 'right' as const },
];

export default function CompsPanel() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompsResponse | null>(null);
  const [tab, setTab] = useState<Tab>('sales');

  const handleSearch = useCallback(async () => {
    if (!address.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/comps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result);
      const total = result.salesComps.length + result.rentalComps.length + result.activeListings.length;
      toast.success(`Found ${total} comparables`);
    } catch {
      toast.error('Failed to fetch comparables. Check API keys.');
    } finally {
      setLoading(false);
    }
  }, [address]);

  const mapPoints = data
    ? [
        ...data.salesComps.map((c) => ({ lat: c.lat, lng: c.lng, label: c.address, type: 'sale' as const })),
        ...data.rentalComps.map((c) => ({ lat: c.lat, lng: c.lng, label: c.address, type: 'rental' as const })),
        ...data.activeListings.map((c) => ({ lat: c.lat, lng: c.lng, label: c.address, type: 'listing' as const })),
      ]
    : [];

  const tabs: { key: Tab; label: string; icon: LucideIcon; count: number }[] = [
    { key: 'sales', label: 'Sales Comps', icon: TrendingUp, count: data?.salesComps.length || 0 },
    { key: 'rentals', label: 'Rental Comps', icon: Home, count: data?.rentalComps.length || 0 },
    { key: 'active', label: 'Active Listings', icon: Building, count: data?.activeListings.length || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter property address (e.g., 123 Main St, Phoenix, AZ 85001)"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#111111] border border-slate-800 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]/50"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !address.trim()}
          className="px-6 py-2.5 rounded-lg bg-[#c9a84c] text-black font-medium text-sm hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {data && (
        <>
          {/* ARV Summary Cards */}
          <ARVSummary arv={data.arv} rentalStats={data.rentalStats} />

          {/* Map */}
          <CompsMap subject={data.subject.coords} points={mapPoints} />

          {/* Tab Navigation */}
          <div className="rounded-xl border border-slate-800 bg-[#111111] overflow-hidden">
            <div className="flex border-b border-slate-800">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                    tab === t.key
                      ? 'text-[#c9a84c] border-b-2 border-[#c9a84c] bg-[#c9a84c]/5'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab === t.key ? 'bg-[#c9a84c]/20 text-[#c9a84c]' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {t.count}
                  </span>
                </button>
                );
              })}
            </div>

            <div className="p-4">
              {tab === 'sales' && (
                <CompsTable
                  data={data.salesComps}
                  columns={SALES_COLUMNS}
                  emptyMessage="No sales comps found. Try a different address or larger radius."
                />
              )}
              {tab === 'rentals' && (
                <CompsTable
                  data={data.rentalComps}
                  columns={RENTAL_COLUMNS}
                  emptyMessage="No rental comps found. Ensure RENTCAST_API_KEY is configured."
                />
              )}
              {tab === 'active' && (
                <CompsTable
                  data={data.activeListings}
                  columns={LISTING_COLUMNS}
                  emptyMessage="No active listings found. Ensure RAPIDAPI_KEY is configured."
                />
              )}
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="rounded-xl border border-slate-800 bg-[#111111] p-16 text-center">
          <Search className="w-10 h-10 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Comps & ARV Analysis</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Enter a property address to pull comparable sales, rental comps, and active listings
            with an automated ARV estimate.
          </p>
        </div>
      )}
    </div>
  );
}
