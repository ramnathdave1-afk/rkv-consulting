'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Building2,
  TrendingUp,
  DollarSign,
  MapPin,
  BarChart3,
  Home,
  Percent,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PortfolioProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  current_value: number;
  purchase_price: number;
  monthly_rent: number;
  mortgage_payment: number;
  taxes_monthly: number;
  insurance_monthly: number;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Public Portfolio Page                                               */
/* ------------------------------------------------------------------ */

export default function PublicPortfolioPage() {
  const params = useParams();
  const token = params.token as string;

  const supabase = createClient();
  const [properties, setProperties] = useState<PortfolioProperty[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPortfolio() {
      setLoading(true);

      // Look up the user by their portfolio sharing token
      // Token is the user ID for now (can be replaced with a dedicated sharing_tokens table)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', token)
        .single();

      if (!profile) {
        setError('Portfolio not found or sharing is disabled');
        setLoading(false);
        return;
      }

      setOwnerName(profile.full_name || 'Portfolio');

      const { data: props } = await supabase
        .from('properties')
        .select('id, address, city, state, zip, property_type, current_value, purchase_price, monthly_rent, mortgage_payment, taxes_monthly, insurance_monthly, status')
        .eq('user_id', profile.id)
        .order('current_value', { ascending: false });

      if (props) setProperties(props);
      setLoading(false);
    }

    fetchPortfolio();
  }, [token, supabase]);

  // Compute portfolio metrics
  const totalValue = properties.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalEquity = properties.reduce((sum, p) => sum + ((p.current_value || 0) - (p.purchase_price || 0)), 0);
  const totalMonthlyIncome = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);
  const totalMonthlyExpenses = properties.reduce((sum, p) =>
    sum + (p.mortgage_payment || 0) + (p.taxes_monthly || 0) + (p.insurance_monthly || 0), 0);
  const totalCashFlow = totalMonthlyIncome - totalMonthlyExpenses;
  const avgCapRate = totalValue > 0
    ? ((totalMonthlyIncome * 12 - totalMonthlyExpenses * 12) / totalValue * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted/40 mx-auto mb-4" />
          <p className="text-lg text-white font-display mb-2">Portfolio Unavailable</p>
          <p className="text-sm text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Top accent line */}
      <div className="h-[2px] bg-gradient-to-r from-gold via-gold-light to-transparent" />

      {/* Header */}
      <header className="border-b border-border" style={{ background: '#050505' }}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-gold" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-white">{ownerName}</h1>
              <p className="text-sm text-muted font-body">Real Estate Portfolio</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total Value', value: `$${(totalValue / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'text-green' },
            { label: 'Total Equity', value: `$${(totalEquity / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-gold' },
            { label: 'Properties', value: properties.length.toString(), icon: Home, color: 'text-gold-light' },
            { label: 'Monthly Income', value: `$${totalMonthlyIncome.toLocaleString()}`, icon: BarChart3, color: 'text-green' },
            { label: 'Cash Flow', value: `$${totalCashFlow.toLocaleString()}/mo`, icon: DollarSign, color: totalCashFlow >= 0 ? 'text-green' : 'text-red' },
            { label: 'Avg Cap Rate', value: `${avgCapRate.toFixed(1)}%`, icon: Percent, color: 'text-gold' },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('h-4 w-4', metric.color)} />
                  <span className="label text-muted">{metric.label}</span>
                </div>
                <p className="text-lg font-bold text-white font-mono">{metric.value}</p>
              </div>
            );
          })}
        </div>

        {/* Property Cards */}
        <h2 className="font-display font-semibold text-lg text-white mb-4">Properties</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => {
            const cashFlow = (property.monthly_rent || 0) -
              (property.mortgage_payment || 0) -
              (property.taxes_monthly || 0) -
              (property.insurance_monthly || 0);
            const equity = (property.current_value || 0) - (property.purchase_price || 0);

            return (
              <div key={property.id} className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-body font-medium text-white text-sm">{property.address}</p>
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {property.city}, {property.state} {property.zip}
                    </p>
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full uppercase',
                    property.status === 'occupied' ? 'bg-green/10 text-green' : 'bg-red/10 text-red',
                  )}>
                    {property.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <p className="label text-muted">Value</p>
                    <p className="text-sm font-bold text-white font-mono">${property.current_value?.toLocaleString() || '—'}</p>
                  </div>
                  <div>
                    <p className="label text-muted">Rent</p>
                    <p className="text-sm font-bold text-white font-mono">${property.monthly_rent?.toLocaleString() || '—'}/mo</p>
                  </div>
                  <div>
                    <p className="label text-muted">Cash Flow</p>
                    <p className={cn('text-sm font-bold font-mono', cashFlow >= 0 ? 'text-green' : 'text-red')}>
                      ${cashFlow.toLocaleString()}/mo
                    </p>
                  </div>
                  <div>
                    <p className="label text-muted">Equity</p>
                    <p className={cn('text-sm font-bold font-mono', equity >= 0 ? 'text-green' : 'text-red')}>
                      ${(equity / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/30">
                  <span className="text-[10px] text-muted uppercase font-body">{property.property_type}</span>
                </div>
              </div>
            );
          })}
        </div>

        {properties.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-muted/40 mx-auto mb-4" />
            <p className="text-sm text-muted">No properties in this portfolio</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-16" style={{ background: '#050505' }}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-deep">
            Powered by <span className="text-muted font-medium">RKV Consulting</span> · Portfolio Intelligence Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
