'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Home,
  DollarSign,
  TrendingUp,
  Percent,
  BarChart3,
  Edit3,
  Trash2,
  Landmark,
  ShieldCheck,
  Receipt,
  FileText,
  Users,
  Wrench,
  Plus,
  Download,
  Upload,
  AlertCircle,
  StickyNote,
  Save,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDropzone } from 'react-dropzone';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Property {
  id: string;
  user_id: string;
  address: string;
  unit: string | null;
  property_type: string;
  purchase_price: number | null;
  purchase_date: string | null;
  current_value: number | null;
  monthly_rent: number | null;
  mortgage_balance: number | null;
  mortgage_rate: number | null;
  monthly_mortgage_payment: number | null;
  mortgage_lender: string | null;
  insurance_annual: number | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  property_tax_annual: number | null;
  hoa_monthly: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  year_built: number | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Tenant {
  id: string;
  property_id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  rent_amount: number | null;
  deposit_amount: number | null;
  created_at: string;
}

interface MaintenanceRequest {
  id: string;
  property_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  cost: number | null;
  created_at: string;
  resolved_at: string | null;
}

interface Transaction {
  id: string;
  property_id: string;
  category: string;
  type: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

interface PropertyDocument {
  id: string;
  property_id: string;
  name: string;
  type: string;
  url: string | null;
  expires_at: string | null;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  tenant_id: string;
  amount: number;
  date: string;
  status: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helper functions                                                   */
/* ------------------------------------------------------------------ */

function fmt(n: number | null | undefined, prefix = '$'): string {
  if (n === null || n === undefined) return '--';
  return `${prefix}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '--';
  return `${n.toFixed(1)}%`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function calcMonthlyExpenses(p: Property): number {
  const mortgage = p.monthly_mortgage_payment || 0;
  const insurance = (p.insurance_annual || 0) / 12;
  const tax = (p.property_tax_annual || 0) / 12;
  const hoa = p.hoa_monthly || 0;
  return mortgage + insurance + tax + hoa;
}

function calcCashFlow(p: Property): number {
  return (p.monthly_rent || 0) - calcMonthlyExpenses(p);
}

function calcCapRate(p: Property): number | null {
  if (!p.current_value || p.current_value === 0) return null;
  const annualNoi =
    (p.monthly_rent || 0) * 12 -
    (calcMonthlyExpenses(p) - (p.monthly_mortgage_payment || 0)) * 12;
  return (annualNoi / p.current_value) * 100;
}

function calcEquity(p: Property): number {
  return (p.current_value || 0) - (p.mortgage_balance || 0);
}

function calcCashOnCashReturn(p: Property): number | null {
  if (!p.purchase_price || p.purchase_price === 0) return null;
  const downPayment = p.purchase_price - (p.mortgage_balance || 0);
  if (downPayment <= 0) return null;
  const annualCashFlow = calcCashFlow(p) * 12;
  return (annualCashFlow / downPayment) * 100;
}

function calcLTV(p: Property): number | null {
  if (!p.current_value || p.current_value === 0) return null;
  return ((p.mortgage_balance || 0) / p.current_value) * 100;
}

function formatPropertyType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function monthsBetween(d1: string, d2: string): number {
  const start = new Date(d1);
  const end = new Date(d2);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

/* ------------------------------------------------------------------ */
/*  Recharts theme                                                     */
/* ------------------------------------------------------------------ */

const CHART_GOLD = '#C9A84C';
const CHART_GREEN = '#22C55E';
const CHART_RED = '#EF4444';
const CHART_MUTED = '#6B7280';
const CHART_BORDER = '#1E2530';
const PIE_COLORS = ['#C9A84C', '#22C55E', '#EF4444', '#3B82F6', '#A855F7', '#F97316', '#06B6D4'];

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-card">
      <p className="text-xs text-muted mb-1">{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: item.color }}>
          {item.name}: {fmt(item.value)}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton for detail page                                   */
/* ------------------------------------------------------------------ */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton variant="text" height="20px" width="120px" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" height="32px" width="300px" />
        <div className="flex gap-2">
          <Skeleton variant="text" height="40px" width="80px" className="rounded-lg" />
          <Skeleton variant="text" height="40px" width="80px" className="rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="card" height="90px" />
        ))}
      </div>
      <Skeleton variant="text" height="48px" width="100%" className="rounded-lg" />
      <Skeleton variant="card" height="400px" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview Tab                                                       */
/* ------------------------------------------------------------------ */

function OverviewTab({
  property,
  notes,
  setNotes,
  onSaveNotes,
  savingNotes,
}: {
  property: Property;
  notes: string;
  setNotes: (v: string) => void;
  onSaveNotes: () => void;
  savingNotes: boolean;
}) {
  const ltv = calcLTV(property);
  const insuranceDaysLeft = daysUntil(property.insurance_expiry);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Property Details */}
      <Card>
        <div className="p-5">
          <h3 className="font-display font-semibold text-white text-base mb-4 flex items-center gap-2">
            <Home className="h-4 w-4 text-gold" />
            Property Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Address</span>
              <span className="text-white font-medium">{property.address}{property.unit ? `, ${property.unit}` : ''}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Type</span>
              <span className="text-white">{formatPropertyType(property.property_type)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Bedrooms / Bathrooms</span>
              <span className="text-white">{property.bedrooms ?? '--'} bd / {property.bathrooms ?? '--'} ba</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Sqft</span>
              <span className="text-white">{property.sqft ? property.sqft.toLocaleString() : '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Year Built</span>
              <span className="text-white">{property.year_built ?? '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Purchase Price</span>
              <span className="text-white font-medium">{fmt(property.purchase_price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Purchase Date</span>
              <span className="text-white">{fmtDate(property.purchase_date)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Mortgage */}
      <Card>
        <div className="p-5">
          <h3 className="font-display font-semibold text-white text-base mb-4 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-gold" />
            Mortgage
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Balance</span>
              <span className="text-white font-medium">{fmt(property.mortgage_balance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Rate</span>
              <span className="text-white">{property.mortgage_rate ? `${property.mortgage_rate}%` : '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Monthly Payment</span>
              <span className="text-white font-medium">{fmt(property.monthly_mortgage_payment)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Lender</span>
              <span className="text-white">{property.mortgage_lender || '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">LTV</span>
              <span className={cn('font-medium', ltv && ltv > 80 ? 'text-red' : 'text-white')}>
                {fmtPct(ltv)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Insurance */}
      <Card>
        <div className="p-5">
          <h3 className="font-display font-semibold text-white text-base mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold" />
            Insurance
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Annual Premium</span>
              <span className="text-white font-medium">{fmt(property.insurance_annual)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Provider</span>
              <span className="text-white">{property.insurance_provider || '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Policy Number</span>
              <span className="text-white">{property.insurance_policy_number || '--'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Expires</span>
              <span className="flex items-center gap-2">
                <span className="text-white">{fmtDate(property.insurance_expiry)}</span>
                {insuranceDaysLeft !== null && insuranceDaysLeft <= 60 && insuranceDaysLeft > 0 && (
                  <Badge variant="warning" size="sm">{insuranceDaysLeft}d left</Badge>
                )}
                {insuranceDaysLeft !== null && insuranceDaysLeft <= 0 && (
                  <Badge variant="danger" size="sm">Expired</Badge>
                )}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tax */}
      <Card>
        <div className="p-5">
          <h3 className="font-display font-semibold text-white text-base mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gold" />
            Property Tax
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Annual Amount</span>
              <span className="text-white font-medium">{fmt(property.property_tax_annual)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Monthly (est.)</span>
              <span className="text-white">{fmt((property.property_tax_annual || 0) / 12)}</span>
            </div>
            {property.hoa_monthly && property.hoa_monthly > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted">HOA Monthly</span>
                <span className="text-white">{fmt(property.hoa_monthly)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card className="lg:col-span-2">
        <div className="p-5">
          <h3 className="font-display font-semibold text-white text-base mb-4 flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-gold" />
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this property..."
            className={cn(
              'w-full min-h-[120px] bg-deep text-white font-body text-sm',
              'border border-border rounded-lg p-3',
              'placeholder:text-muted/60 resize-y',
              'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40',
            )}
          />
          <div className="mt-3 flex justify-end">
            <Button variant="primary" size="sm" onClick={onSaveNotes} loading={savingNotes} icon={<Save className="h-3.5 w-3.5" />}>
              Save Notes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Performance Tab                                                    */
/* ------------------------------------------------------------------ */

function PerformanceTab({ property, transactions: _transactions }: { property: Property; transactions: Transaction[] }) {
  const cashFlow = calcCashFlow(property);
  const equity = calcEquity(property);

  /* Generate monthly cash flow data (simulated from purchase to now with 12mo projection) */
  const cashFlowData = useMemo(() => {
    const data: { month: string; cashFlow: number; projected?: boolean }[] = [];
    const start = property.purchase_date ? new Date(property.purchase_date) : new Date(property.created_at);
    const now = new Date();
    const monthsHeld = monthsBetween(start.toISOString(), now.toISOString());
    const monthly = calcCashFlow(property);

    // Historical
    for (let i = 0; i <= Math.min(monthsHeld, 24); i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      // Add slight variation for realism
      const variation = 1 + (Math.sin(i * 0.7) * 0.08);
      data.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        cashFlow: Math.round(monthly * variation),
      });
    }

    // Projected (12 months, dashed)
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + i);
      const growth = 1 + i * 0.005;
      data.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        cashFlow: Math.round(monthly * growth),
        projected: true,
      });
    }

    return data;
  }, [property]);

  /* Equity growth data */
  const equityData = useMemo(() => {
    const data: { month: string; equity: number }[] = [];
    const purchasePrice = property.purchase_price || property.current_value || 0;
    const currentValue = property.current_value || purchasePrice;
    const mortgageStart = property.mortgage_balance
      ? property.mortgage_balance + ((property.monthly_mortgage_payment || 0) * 12 * 2)
      : 0;
    const start = property.purchase_date ? new Date(property.purchase_date) : new Date(property.created_at);
    const now = new Date();
    const totalMonths = monthsBetween(start.toISOString(), now.toISOString());

    for (let i = 0; i <= Math.min(totalMonths, 36); i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      const progress = totalMonths > 0 ? i / totalMonths : 1;
      const valueAtTime = purchasePrice + (currentValue - purchasePrice) * progress;
      const mortgageAtTime = mortgageStart - (mortgageStart - (property.mortgage_balance || 0)) * progress;
      data.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        equity: Math.round(Math.max(0, valueAtTime - mortgageAtTime)),
      });
    }
    return data;
  }, [property]);

  /* Annual income vs expenses */
  const incomeVsExpenseData = useMemo(() => {
    const annualRent = (property.monthly_rent || 0) * 12;
    const annualMortgage = (property.monthly_mortgage_payment || 0) * 12;
    const annualInsurance = property.insurance_annual || 0;
    const annualTax = property.property_tax_annual || 0;
    const annualHoa = (property.hoa_monthly || 0) * 12;

    return [
      { name: 'Rental Income', income: annualRent, expenses: 0 },
      { name: 'Mortgage', income: 0, expenses: annualMortgage },
      { name: 'Insurance', income: 0, expenses: annualInsurance },
      { name: 'Property Tax', income: 0, expenses: annualTax },
      { name: 'HOA', income: 0, expenses: annualHoa },
    ];
  }, [property]);

  /* Summary metrics */
  const purchasePrice = property.purchase_price || 0;
  const currentValue = property.current_value || 0;
  const start = property.purchase_date ? new Date(property.purchase_date) : new Date(property.created_at);
  const yearsHeld = Math.max(0.1, (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
  const totalCashReceived = cashFlow * yearsHeld * 12;
  const totalEquityGained = equity - (purchasePrice - (property.mortgage_balance || 0));
  const totalReturn = purchasePrice > 0 ? ((totalCashReceived + totalEquityGained) / purchasePrice) * 100 : 0;
  const annualizedROI = yearsHeld > 0 ? totalReturn / yearsHeld : 0;

  /* "What if I sold today" */
  const closingCosts = currentValue * 0.06;
  const mortgagePayoff = property.mortgage_balance || 0;
  const netProceeds = currentValue - closingCosts - mortgagePayoff;

  return (
    <div className="space-y-6">
      {/* Cash Flow Chart */}
      <Card>
        <div className="p-5">
          <h3 className="font-display font-semibold text-white text-base mb-4">Monthly Cash Flow</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_BORDER} />
                <XAxis dataKey="month" tick={{ fill: CHART_MUTED, fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: CHART_MUTED, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="cashFlow"
                  stroke={CHART_GOLD}
                  fill={`${CHART_GOLD}20`}
                  strokeWidth={2}
                  strokeDasharray="0"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Growth */}
        <Card>
          <div className="p-5">
            <h3 className="font-display font-semibold text-white text-base mb-4">Equity Growth</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_BORDER} />
                  <XAxis dataKey="month" tick={{ fill: CHART_MUTED, fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: CHART_MUTED, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="equity" stroke={CHART_GREEN} fill={`${CHART_GREEN}20`} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Income vs Expenses */}
        <Card>
          <div className="p-5">
            <h3 className="font-display font-semibold text-white text-base mb-4">Annual Income vs Expenses</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeVsExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_BORDER} />
                  <XAxis dataKey="name" tick={{ fill: CHART_MUTED, fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: CHART_MUTED, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill={CHART_GREEN} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill={CHART_RED} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Summary metrics + "What if I sold today" */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-5">
            <h3 className="font-display font-semibold text-white text-base mb-4">Investment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total Cash Invested</span>
                <span className="text-white font-medium">{fmt(purchasePrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total Cash Received (est.)</span>
                <span className="text-green font-medium">{fmt(Math.round(totalCashReceived))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total Equity Gained</span>
                <span className="text-white font-medium">{fmt(Math.round(totalEquityGained))}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted">Total Return</span>
                <span className={cn('font-bold', totalReturn >= 0 ? 'text-green' : 'text-red')}>
                  {fmtPct(totalReturn)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Annualized ROI</span>
                <span className={cn('font-bold', annualizedROI >= 0 ? 'text-green' : 'text-red')}>
                  {fmtPct(annualizedROI)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Time Held</span>
                <span className="text-white">{yearsHeld.toFixed(1)} years</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-gold/20">
          <div className="p-5">
            <h3 className="font-display font-semibold text-gold text-base mb-4">
              What if I sold today?
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Estimated Sale Price</span>
                <span className="text-white font-medium">{fmt(currentValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Closing Costs (6%)</span>
                <span className="text-red">-{fmt(Math.round(closingCosts))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Mortgage Payoff</span>
                <span className="text-red">-{fmt(mortgagePayoff)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-white font-semibold">Net Proceeds</span>
                <span className={cn('text-xl font-bold font-display', netProceeds >= 0 ? 'text-green' : 'text-red')}>
                  {fmt(Math.round(netProceeds))}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tenants Tab                                                        */
/* ------------------------------------------------------------------ */

function TenantsTab({
  property: _property,
  tenants,
  payments,
  onRefresh: _onRefresh,
}: {
  property: Property;
  tenants: Tenant[];
  payments: PaymentRecord[];
  onRefresh: () => void;
}) {
  const activeTenant = tenants.find((t) => t.status === 'active');

  if (!activeTenant && tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-5 bg-gold/10 text-gold border border-gold/20">
          <Users className="h-7 w-7 stroke-[1.5]" />
        </div>
        <h3 className="font-display font-semibold text-lg text-white mb-2">No tenant</h3>
        <p className="text-sm text-muted mb-6">This unit is currently vacant. Add a tenant to start tracking payments.</p>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
          Add Tenant
        </Button>
      </div>
    );
  }

  const tenant = activeTenant || tenants[0];
  const leaseStart = tenant.lease_start ? new Date(tenant.lease_start) : null;
  const leaseEnd = tenant.lease_end ? new Date(tenant.lease_end) : null;
  const now = new Date();

  let leaseProgress = 0;
  let daysRemaining = 0;
  if (leaseStart && leaseEnd) {
    const totalDays = (leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24);
    const elapsed = (now.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24);
    leaseProgress = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
    daysRemaining = Math.max(0, Math.ceil((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const tenantPayments = payments.filter((p) => p.tenant_id === tenant.id);

  return (
    <div className="space-y-6">
      {/* Tenant Card */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-gold" />
              Current Tenant
            </h3>
            <Badge variant={tenant.status === 'active' ? 'success' : 'warning'} dot>
              {tenant.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-muted">Name</span>
              <p className="text-sm text-white font-medium">{tenant.name}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Email</span>
              <p className="text-sm text-white">{tenant.email || '--'}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Phone</span>
              <p className="text-sm text-white">{tenant.phone || '--'}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Rent Amount</span>
              <p className="text-sm text-green font-medium">{fmt(tenant.rent_amount)}/mo</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Lease Timeline */}
      {leaseStart && leaseEnd && (
        <Card>
          <div className="p-5">
            <h3 className="font-display font-semibold text-white text-base mb-4">Lease Timeline</h3>
            <div className="flex items-center justify-between text-xs text-muted mb-2">
              <span>{fmtDate(tenant.lease_start)}</span>
              <span>{daysRemaining} days remaining</span>
              <span>{fmtDate(tenant.lease_end)}</span>
            </div>
            <div className="relative h-3 bg-deep rounded-full overflow-hidden border border-border">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold to-gold-light rounded-full transition-all duration-500"
                style={{ width: `${leaseProgress}%` }}
              />
              {/* Today marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-white"
                style={{ left: `${leaseProgress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted">
              <span>Start</span>
              <span className="text-gold font-medium">Today</span>
              <span>End</span>
            </div>
          </div>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <div className="p-5">
          <h3 className="font-display font-semibold text-white text-base mb-4">Payment History</h3>
          {tenantPayments.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">No payment records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2 text-xs text-muted font-medium">Date</th>
                    <th className="text-right px-3 py-2 text-xs text-muted font-medium">Amount</th>
                    <th className="text-right px-3 py-2 text-xs text-muted font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/50 hover:bg-white/5">
                      <td className="px-3 py-2.5 text-white">{fmtDate(payment.date)}</td>
                      <td className="px-3 py-2.5 text-right text-white font-medium">{fmt(payment.amount)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Badge
                          variant={
                            payment.status === 'paid' ? 'success' :
                            payment.status === 'late' ? 'warning' : 'danger'
                          }
                          size="sm"
                        >
                          {payment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Maintenance Tab                                                    */
/* ------------------------------------------------------------------ */

function MaintenanceTab({ requests, onRefresh: _onRefresh }: { requests: MaintenanceRequest[]; onRefresh: () => void }) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-5 bg-gold/10 text-gold border border-gold/20">
          <Wrench className="h-7 w-7 stroke-[1.5]" />
        </div>
        <h3 className="font-display font-semibold text-lg text-white mb-2">No maintenance requests</h3>
        <p className="text-sm text-muted mb-6">All clear -- no open maintenance requests for this property.</p>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
          New Request
        </Button>
      </div>
    );
  }

  const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    open: 'warning',
    in_progress: 'default',
    completed: 'success',
    canceled: 'danger',
  };

  const priorityColors: Record<string, 'danger' | 'warning' | 'info'> = {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-semibold text-white text-base">Maintenance Requests</h3>
        <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
          New Request
        </Button>
      </div>

      {requests.map((req) => (
        <Card key={req.id}>
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-white truncate">{req.title}</h4>
                  <Badge variant={statusColors[req.status] || 'info'} size="sm">
                    {req.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant={priorityColors[req.priority] || 'info'} size="sm">
                    {req.priority}
                  </Badge>
                </div>
                {req.description && (
                  <p className="text-xs text-muted line-clamp-2">{req.description}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                {req.cost && (
                  <p className="text-sm text-white font-medium">{fmt(req.cost)}</p>
                )}
                <p className="text-xs text-muted">{fmtDate(req.created_at)}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Financials Tab                                                     */
/* ------------------------------------------------------------------ */

function FinancialsTab({
  property,
  transactions,
  onRefresh: _onRefresh,
}: {
  property: Property;
  transactions: Transaction[];
  onRefresh: () => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category));
    return ['all', ...Array.from(cats)];
  }, [transactions]);

  const filtered = categoryFilter === 'all' ? transactions : transactions.filter((t) => t.category === categoryFilter);

  /* Expense donut data */
  const expenseData = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });
    return Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  /* Monthly P&L */
  const monthlyPnL = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income: totalIncome, expenses: totalExpenses, net: totalIncome - totalExpenses };
  }, [transactions]);

  /* CSV export */
  function handleExportCsv() {
    const headers = 'Date,Category,Type,Amount,Description\n';
    const rows = filtered
      .map((t) => `${t.date},${t.category},${t.type},${t.amount},"${t.description || ''}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `property-transactions-${property.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Monthly P&L Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-xs text-muted mb-1">Total Income</p>
            <p className="text-xl font-bold font-display text-green">{fmt(monthlyPnL.income)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-xs text-muted mb-1">Total Expenses</p>
            <p className="text-xl font-bold font-display text-red">{fmt(monthlyPnL.expenses)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-xs text-muted mb-1">Net P&L</p>
            <p className={cn('text-xl font-bold font-display', monthlyPnL.net >= 0 ? 'text-green' : 'text-red')}>
              {fmt(monthlyPnL.net)}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Donut */}
        {expenseData.length > 0 && (
          <Card>
            <div className="p-5">
              <h3 className="font-display font-semibold text-white text-base mb-4">Expense Breakdown</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expenseData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) => fmt(value ?? 0)}
                      contentStyle={{ background: '#111620', border: '1px solid #1E2530', borderRadius: 8 }}
                      itemStyle={{ color: '#F0EDE8' }}
                    />
                    <Legend
                      formatter={(value: string) => <span className="text-xs text-text">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )}

        {/* Transactions list */}
        <Card className={expenseData.length === 0 ? 'lg:col-span-2' : ''}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white text-base">Transactions</h3>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
                  Add Transaction
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExportCsv} icon={<Download className="h-3.5 w-3.5" />}>
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1 mb-4 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    categoryFilter === cat
                      ? 'bg-gold/10 text-gold border border-gold/20'
                      : 'text-muted hover:text-white hover:bg-white/5',
                  )}
                >
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted py-6 text-center">No transactions found.</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-xs text-muted font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-xs text-muted font-medium">Category</th>
                      <th className="text-left px-3 py-2 text-xs text-muted font-medium">Description</th>
                      <th className="text-right px-3 py-2 text-xs text-muted font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((txn) => (
                      <tr key={txn.id} className="border-b border-border/50 hover:bg-white/5">
                        <td className="px-3 py-2.5 text-muted">{fmtDate(txn.date)}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="info" size="sm">{txn.category}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-text truncate max-w-[200px]">{txn.description || '--'}</td>
                        <td className={cn('px-3 py-2.5 text-right font-medium', txn.type === 'income' ? 'text-green' : 'text-red')}>
                          {txn.type === 'income' ? '+' : '-'}{fmt(txn.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Documents Tab                                                      */
/* ------------------------------------------------------------------ */

function DocumentsTab({
  documents,
  propertyId,
  onRefresh,
}: {
  documents: PropertyDocument[];
  propertyId: string;
  onRefresh: () => void;
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUploading(false);
        return;
      }

      for (const file of acceptedFiles) {
        const filePath = `${user.id}/${propertyId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

          await supabase.from('property_documents').insert({
            property_id: propertyId,
            user_id: user.id,
            name: file.name,
            type: file.type || 'unknown',
            url: urlData?.publicUrl || null,
          });
        }
      }

      setUploading(false);
      onRefresh();
    },
    [supabase, propertyId, onRefresh],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const typeLabels: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'Image',
    'image/png': 'Image',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'text/csv': 'CSV',
  };

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center',
          'min-h-[160px] border-2 border-dashed rounded-xl p-6',
          'transition-colors cursor-pointer',
          isDragActive
            ? 'border-gold bg-gold/5'
            : 'border-border hover:border-gold/30 hover:bg-white/[0.02]',
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="h-8 w-8 text-gold animate-spin mb-2" />
        ) : (
          <Upload className="h-8 w-8 text-muted mb-2" />
        )}
        <p className="text-sm text-white font-medium">
          {uploading ? 'Uploading...' : isDragActive ? 'Drop files here' : 'Drop documents here or click to browse'}
        </p>
        <p className="text-xs text-muted mt-1">PDF, images, spreadsheets, and more</p>
      </div>

      {/* Documents list */}
      {documents.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const expiresIn = daysUntil(doc.expires_at);
            return (
              <Card key={doc.id}>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted">{fmtDate(doc.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="info" size="sm">
                      {typeLabels[doc.type] || doc.type.split('/').pop() || 'File'}
                    </Badge>
                    {expiresIn !== null && expiresIn <= 30 && expiresIn > 0 && (
                      <Badge variant="warning" size="sm">Expires in {expiresIn}d</Badge>
                    )}
                    {expiresIn !== null && expiresIn <= 0 && (
                      <Badge variant="danger" size="sm">Expired</Badge>
                    )}
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-muted hover:text-gold hover:bg-gold/10 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE COMPONENT                                                */
/* ------------------------------------------------------------------ */

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const propertyId = params.id as string;

  /* ---- State ---- */
  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  /* ---- Fetch data ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in');
      setLoading(false);
      return;
    }

    // Fetch property
    const { data: propData, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (propError || !propData) {
      setError('Property not found');
      setLoading(false);
      return;
    }

    setProperty(propData);
    setNotes(propData.notes || '');

    // Fetch related data in parallel
    const [tenantsRes, maintenanceRes, transactionsRes, documentsRes] = await Promise.all([
      supabase
        .from('tenants')
        .select('*')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('maintenance_requests')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false }),
      supabase
        .from('transactions')
        .select('*')
        .eq('property_id', propertyId)
        .order('date', { ascending: false }),
      supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false }),
    ]);

    setTenants(tenantsRes.data || []);
    setMaintenance(maintenanceRes.data || []);
    setTransactions(transactionsRes.data || []);
    setDocuments(documentsRes.data || []);

    // Fetch payments for all tenants
    const tenantIds = (tenantsRes.data || []).map((t: Tenant) => t.id);
    if (tenantIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .in('tenant_id', tenantIds)
        .order('date', { ascending: false });
      setPayments(paymentsData || []);
    }

    setLoading(false);
  }, [supabase, propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- Save notes ---- */
  async function handleSaveNotes() {
    if (!property) return;
    setSavingNotes(true);
    await supabase.from('properties').update({ notes }).eq('id', property.id);
    setSavingNotes(false);
  }

  /* ---- Delete property ---- */
  async function handleDelete() {
    if (!property) return;
    setDeleting(true);
    await supabase.from('properties').delete().eq('id', property.id);
    setDeleting(false);
    router.push('/properties');
  }

  /* ---- Loading ---- */
  if (loading) {
    return <DetailSkeleton />;
  }

  /* ---- Error ---- */
  if (error || !property) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="h-12 w-12 text-red mb-4" />
        <h2 className="font-display font-bold text-xl text-white mb-2">
          {error || 'Property not found'}
        </h2>
        <Link href="/properties" className="text-sm text-gold hover:text-gold-light transition-colors">
          Back to Portfolio
        </Link>
      </div>
    );
  }

  /* ---- Computed metrics ---- */
  const cashFlow = calcCashFlow(property);
  const capRate = calcCapRate(property);
  const cashOnCash = calcCashOnCashReturn(property);
  const equity = calcEquity(property);

  const keyMetrics = [
    { label: 'Current Value', value: fmt(property.current_value), icon: DollarSign },
    { label: 'Monthly Rent', value: fmt(property.monthly_rent), icon: TrendingUp, color: 'text-green' },
    { label: 'Monthly Cash Flow', value: fmt(cashFlow), icon: BarChart3, color: cashFlow >= 0 ? 'text-green' : 'text-red' },
    { label: 'Cap Rate', value: fmtPct(capRate), icon: Percent },
    { label: 'Cash on Cash', value: fmtPct(cashOnCash), icon: Percent },
    { label: 'Total Equity', value: fmt(equity), icon: DollarSign },
  ];

  return (
    <>
      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <div className="mb-6">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          My Portfolio
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-display font-bold text-2xl text-white truncate">
              {property.address}
              {property.unit ? `, ${property.unit}` : ''}
            </h1>
            <Badge variant="info">{formatPropertyType(property.property_type)}</Badge>
            <Badge variant={property.status === 'active' ? 'success' : 'warning'} dot>
              {property.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" icon={<Edit3 className="h-4 w-4" />}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)} icon={<Trash2 className="h-4 w-4" />}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  KEY METRICS                                                  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {keyMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                'bg-card border border-border rounded-xl p-4',
                'hover:border-gold/30 hover:shadow-glow-sm transition-all duration-200',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted" />
                <span className="text-xs text-muted font-medium">{metric.label}</span>
              </div>
              <p className={cn('text-xl font-bold font-display', metric.color || 'text-white')}>
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/*  TABS                                                         */}
      {/* ============================================================ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" icon={<Home className="h-4 w-4" />}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" icon={<TrendingUp className="h-4 w-4" />}>
            Performance
          </TabsTrigger>
          <TabsTrigger value="tenants" icon={<Users className="h-4 w-4" />}>
            Tenants
          </TabsTrigger>
          <TabsTrigger value="maintenance" icon={<Wrench className="h-4 w-4" />}>
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="financials" icon={<Receipt className="h-4 w-4" />}>
            Financials
          </TabsTrigger>
          <TabsTrigger value="documents" icon={<FileText className="h-4 w-4" />}>
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            property={property}
            notes={notes}
            setNotes={setNotes}
            onSaveNotes={handleSaveNotes}
            savingNotes={savingNotes}
          />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab property={property} transactions={transactions} />
        </TabsContent>

        <TabsContent value="tenants">
          <TenantsTab
            property={property}
            tenants={tenants}
            payments={payments}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="maintenance">
          <MaintenanceTab requests={maintenance} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="financials">
          <FinancialsTab
            property={property}
            transactions={transactions}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab
            documents={documents}
            propertyId={propertyId}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/*  DELETE CONFIRMATION MODAL                                     */}
      {/* ============================================================ */}
      <Modal open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <ModalContent maxWidth="sm">
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red/10 border border-red/20">
              <Trash2 className="h-5 w-5 text-red" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">
              Delete Property
            </h3>
            <p className="font-body text-sm text-muted mb-6">
              Are you sure you want to delete <span className="text-white font-medium">{property.address}</span>?
              This action cannot be undone. All associated tenants, transactions, and documents will also be removed.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                Delete Property
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}
