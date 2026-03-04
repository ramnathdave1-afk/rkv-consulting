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
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  Filter,
  Building2,
  Calculator,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDropzone } from 'react-dropzone';
import {
  LineChart,
  Line,
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
  city: string | null;
  state: string | null;
  zip: string | null;
  property_type: string;
  purchase_price: number | null;
  purchase_date: string | null;
  current_value: number | null;
  monthly_rent: number | null;
  mortgage_balance: number | null;
  mortgage_rate: number | null;
  mortgage_payment: number | null;
  mortgage_lender: string | null;
  mortgage_maturity_date: string | null;
  insurance_annual: number | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  tax_annual: number | null;
  hoa_monthly: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  year_built: number | null;
  notes: string | null;
  status: string;
  images: string[];
  created_at: string;
  updated_at: string;
}

interface Tenant {
  id: string;
  property_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  deposit_held: number | null;
  rent_due_day: number | null;
  notes: string | null;
  created_at: string;
}

interface RentPayment {
  id: string;
  tenant_id: string;
  property_id: string | null;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  late_fee_charged: number;
  notes: string | null;
  created_at: string;
}

interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  priority: string;
  contractor_id: string | null;
  contractor_name: string | null;
  contractor_phone: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  scheduled_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  property_id: string;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  receipt_url: string | null;
  tax_deductible: boolean;
  notes: string | null;
  created_at: string;
}

interface PropertyDocument {
  id: string;
  property_id: string | null;
  tenant_id: string | null;
  name: string;
  type: string | null;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  expires_at: string | null;
  tags: string[];
  signed: boolean;
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
  const mortgage = p.mortgage_payment || 0;
  const insurance = (p.insurance_annual || 0) / 12;
  const tax = (p.tax_annual || 0) / 12;
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
    (calcMonthlyExpenses(p) - (p.mortgage_payment || 0)) * 12;
  return (annualNoi / p.current_value) * 100;
}

function calcEquity(p: Property): number {
  return (p.current_value || 0) - (p.mortgage_balance || 0);
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

function tenantDisplayName(t: Tenant): string {
  const parts = [t.first_name, t.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unnamed Tenant';
}

function calcMortgageTermRemaining(p: Property): string {
  if (!p.mortgage_maturity_date) return '--';
  const days = daysUntil(p.mortgage_maturity_date);
  if (days === null || days <= 0) return 'Matured';
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years}y ${months}mo`;
  return `${months}mo`;
}

/* ------------------------------------------------------------------ */
/*  Recharts theme                                                     */
/* ------------------------------------------------------------------ */

const CHART_GOLD = '#c9a84c';
const CHART_GREEN = '#c9a84c';
const CHART_RED = '#DC2626';
const CHART_MUTED = '#4A6080';
const CHART_BORDER = '#1e1e1e';
const PIE_COLORS = ['#c9a84c', '#c9a84c', '#DC2626', '#3B82F6', '#A855F7', '#F97316', '#06B6D4'];

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg px-3 py-2 shadow-card rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      <p className="text-xs text-muted mb-1 font-mono">{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="text-sm font-medium font-mono" style={{ color: item.color }}>
          {item.name}: {fmt(item.value)}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
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
/*  Metric Card (used in Overview header row)                          */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-4',
        'hover:border-gold/30 hover:shadow-glow-sm transition-all duration-200',
      )}
      style={{ background: '#111111', border: '1px solid #1e1e1e' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted" />
        <span className="label">{label}</span>
      </div>
      <p className={cn('text-xl font-bold font-mono', color || 'text-white')}>{value}</p>
    </div>
  );
}

/* ================================================================== */
/*  TAB 1: OVERVIEW                                                    */
/* ================================================================== */

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
  const cashFlow = calcCashFlow(property);
  const capRate = calcCapRate(property);
  const equity = calcEquity(property);

  return (
    <div className="space-y-6">
      {/* ---- Metrics cards row ---- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Current Value" value={fmt(property.current_value)} icon={DollarSign} />
        <MetricCard
          label="Monthly Rent"
          value={fmt(property.monthly_rent)}
          icon={TrendingUp}
          color="text-green"
        />
        <MetricCard
          label="Monthly Cash Flow"
          value={fmt(cashFlow)}
          icon={BarChart3}
          color={cashFlow >= 0 ? 'text-green' : 'text-red'}
        />
        <MetricCard label="Cap Rate" value={fmtPct(capRate)} icon={Percent} />
        <MetricCard label="Equity" value={fmt(equity)} icon={DollarSign} color="text-gold" />
        <MetricCard
          label="LTV"
          value={fmtPct(ltv)}
          icon={Percent}
          color={ltv !== null && ltv > 80 ? 'text-red' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Mortgage Details ---- */}
        <Card>
          <div className="p-5">
            <h3 className="label mb-4 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-gold" />
              Mortgage Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Lender</span>
                <span className="text-white font-medium">{property.mortgage_lender || '--'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Interest Rate</span>
                <span className="text-white font-mono">
                  {property.mortgage_rate ? `${property.mortgage_rate}%` : '--'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Remaining Balance</span>
                <span className="text-white font-medium font-mono">{fmt(property.mortgage_balance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Monthly Payment</span>
                <span className="text-white font-medium font-mono">{fmt(property.mortgage_payment)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Term Remaining</span>
                <span className="text-white font-mono">{calcMortgageTermRemaining(property)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted">LTV Ratio</span>
                <span
                  className={cn(
                    'font-medium font-mono',
                    ltv && ltv > 80 ? 'text-red' : 'text-white',
                  )}
                >
                  {fmtPct(ltv)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* ---- Insurance ---- */}
        {property.insurance_annual ? (
          <Card
            className={cn(
              insuranceDaysLeft !== null &&
                insuranceDaysLeft <= 60 &&
                insuranceDaysLeft > 0 &&
                'border-gold/30',
              insuranceDaysLeft !== null && insuranceDaysLeft <= 0 && 'border-red/30',
            )}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="label flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-gold" />
                  Insurance
                </h3>
                {insuranceDaysLeft !== null && insuranceDaysLeft <= 60 && insuranceDaysLeft > 0 && (
                  <Badge variant="warning" size="sm" dot>
                    Expires in {insuranceDaysLeft}d
                  </Badge>
                )}
                {insuranceDaysLeft !== null && insuranceDaysLeft <= 0 && (
                  <Badge variant="danger" size="sm" dot>
                    Expired
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Annual Premium</span>
                  <span className="text-white font-medium font-mono">{fmt(property.insurance_annual)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Monthly (est.)</span>
                  <span className="text-white font-mono">
                    {fmt(Math.round((property.insurance_annual || 0) / 12))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Provider</span>
                  <span className="text-white">{property.insurance_provider || '--'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Policy #</span>
                  <span className="text-white">{property.insurance_policy_number || '--'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Expires</span>
                  <span className="text-white">{fmtDate(property.insurance_expiry)}</span>
                </div>
              </div>
              {insuranceDaysLeft !== null && insuranceDaysLeft > 0 && insuranceDaysLeft <= 60 && (
                <div className="mt-4 bg-gold/10 border border-gold/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gold">
                      Insurance expires in {insuranceDaysLeft} days. Contact{' '}
                      {property.insurance_provider || 'your provider'} to renew.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-5">
              <h3 className="label mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gold" />
                Insurance
              </h3>
              <p className="text-sm text-muted font-mono">No insurance information on file</p>
            </div>
          </Card>
        )}

        {/* ---- Property Details ---- */}
        <Card>
          <div className="p-5">
            <h3 className="label mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gold" />
              Property Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Type</span>
                <span className="text-white">{formatPropertyType(property.property_type)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Bedrooms</span>
                <span className="text-white font-mono">{property.bedrooms ?? '--'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Bathrooms</span>
                <span className="text-white font-mono">{property.bathrooms ?? '--'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Square Feet</span>
                <span className="text-white font-mono">
                  {property.sqft ? property.sqft.toLocaleString() : '--'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Year Built</span>
                <span className="text-white font-mono">{property.year_built ?? '--'}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted">Purchase Price</span>
                <span className="text-white font-medium font-mono">{fmt(property.purchase_price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Purchase Date</span>
                <span className="text-white">{fmtDate(property.purchase_date)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ---- Tax & HOA ---- */}
        <Card>
          <div className="p-5">
            <h3 className="label mb-4 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-gold" />
              Tax & HOA
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Annual Property Tax</span>
                <span className="text-white font-medium font-mono">{fmt(property.tax_annual)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Monthly Tax (est.)</span>
                <span className="text-white font-mono">{fmt(Math.round((property.tax_annual || 0) / 12))}</span>
              </div>
              {(property.hoa_monthly || 0) > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted">HOA Monthly</span>
                  <span className="text-white font-mono">{fmt(property.hoa_monthly)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted">Total Monthly Expenses</span>
                <span className="text-red font-medium font-mono">
                  {fmt(Math.round(calcMonthlyExpenses(property)))}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ---- Notes ---- */}
      <Card className="lg:col-span-2">
        <div className="p-5">
          <h3 className="label mb-4 flex items-center gap-2">
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
            <Button
              variant="primary"
              size="sm"
              onClick={onSaveNotes}
              loading={savingNotes}
              icon={<Save className="h-3.5 w-3.5" />}
            >
              Save Notes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  TAB 2: PERFORMANCE                                                 */
/* ================================================================== */

function PerformanceTab({ property }: { property: Property }) {
  const cashFlow = calcCashFlow(property);
  const equity = calcEquity(property);

  /* -- Monthly cash flow line chart (12 months) -- */
  const cashFlowData = useMemo(() => {
    const data: { month: string; cashFlow: number }[] = [];
    const now = new Date();
    const monthly = calcCashFlow(property);

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      data.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        cashFlow: Math.round(monthly),
      });
    }

    return data;
  }, [property]);

  /* -- Equity growth curve -- */
  const equityData = useMemo(() => {
    const data: { month: string; equity: number }[] = [];
    const purchasePrice = property.purchase_price || property.current_value || 0;
    const currentValue = property.current_value || purchasePrice;
    const mortgageStart = property.mortgage_balance
      ? property.mortgage_balance + (property.mortgage_payment || 0) * 12 * 2
      : 0;
    const start = property.purchase_date
      ? new Date(property.purchase_date)
      : new Date(property.created_at);
    const now = new Date();
    const totalMonths = monthsBetween(start.toISOString(), now.toISOString());

    for (let i = 0; i <= Math.min(totalMonths, 48); i += Math.max(1, Math.floor(totalMonths / 24))) {
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

  /* -- Annual income vs expenses bar chart -- */
  const incomeVsExpenseData = useMemo(() => {
    const annualRent = (property.monthly_rent || 0) * 12;
    const annualMortgage = (property.mortgage_payment || 0) * 12;
    const annualInsurance = property.insurance_annual || 0;
    const annualTax = property.tax_annual || 0;
    const annualHoa = (property.hoa_monthly || 0) * 12;

    return [
      { name: 'Rental Income', income: annualRent, expenses: 0 },
      { name: 'Mortgage', income: 0, expenses: annualMortgage },
      { name: 'Insurance', income: 0, expenses: annualInsurance },
      { name: 'Property Tax', income: 0, expenses: annualTax },
      { name: 'HOA', income: 0, expenses: annualHoa },
    ];
  }, [property]);

  /* -- Key metrics -- */
  const purchasePrice = property.purchase_price || 0;
  const currentValue = property.current_value || 0;
  const start = property.purchase_date
    ? new Date(property.purchase_date)
    : new Date(property.created_at);
  const yearsHeld = Math.max(0.1, (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
  const totalCashReceived = cashFlow * yearsHeld * 12;
  const totalEquityGained = equity - (purchasePrice - (property.mortgage_balance || 0));
  const totalReturn =
    purchasePrice > 0 ? ((totalCashReceived + totalEquityGained) / purchasePrice) * 100 : 0;
  const annualizedROI = yearsHeld > 0 ? totalReturn / yearsHeld : 0;

  /* -- Approximate IRR estimate (simplified) -- */
  const irrEstimate = useMemo(() => {
    if (purchasePrice === 0 || yearsHeld < 0.1) return null;
    const downPayment = purchasePrice - (property.mortgage_balance || 0);
    if (downPayment <= 0) return null;
    const annualCash = cashFlow * 12;
    const terminalValue = currentValue - (property.mortgage_balance || 0);
    const totalGain = annualCash * yearsHeld + terminalValue - downPayment;
    const irr = Math.pow(1 + totalGain / downPayment, 1 / yearsHeld) - 1;
    return isFinite(irr) ? irr * 100 : null;
  }, [purchasePrice, yearsHeld, cashFlow, currentValue, property.mortgage_balance]);

  /* -- "What if I sold today" -- */
  const closingCosts = currentValue * 0.06;
  const mortgagePayoff = property.mortgage_balance || 0;
  const netProceeds = currentValue - closingCosts - mortgagePayoff;
  const capitalGains = currentValue - purchasePrice;

  return (
    <div className="space-y-6">
      {/* Cash Flow Line Chart */}
      <Card>
        <div className="p-5">
          <h3 className="label mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gold" />
            Monthly Cash Flow (12 months)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_BORDER} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: CHART_MUTED, fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: CHART_MUTED, fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="cashFlow"
                  name="Cash Flow"
                  stroke={CHART_GOLD}
                  strokeWidth={2.5}
                  dot={{ fill: CHART_GOLD, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: CHART_GOLD }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Growth */}
        <Card>
          <div className="p-5">
            <h3 className="label mb-4">Equity Growth</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_BORDER} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: CHART_MUTED, fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: CHART_MUTED, fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    name="Equity"
                    stroke={CHART_GREEN}
                    fill={`${CHART_GREEN}20`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Annual Income vs Expenses */}
        <Card>
          <div className="p-5">
            <h3 className="label mb-4">
              Annual Income vs Expenses
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeVsExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_BORDER} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: CHART_MUTED, fontSize: 10 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: CHART_MUTED, fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" name="Income" fill={CHART_GREEN} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill={CHART_RED} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Key Metrics + "What if I sold today" */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-5">
            <h3 className="label mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gold" />
              Investment Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">IRR Estimate</span>
                <span
                  className={cn(
                    'font-bold font-mono',
                    irrEstimate && irrEstimate >= 0 ? 'text-green' : 'text-red',
                  )}
                >
                  {fmtPct(irrEstimate)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Time Held</span>
                <span className="text-white font-mono">{yearsHeld.toFixed(1)} years</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total Cash Received (est.)</span>
                <span className="text-green font-medium font-mono">
                  {fmt(Math.round(totalCashReceived))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total Equity Gained</span>
                <span className="text-white font-medium font-mono">
                  {fmt(Math.round(totalEquityGained))}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted">Total Return</span>
                <span
                  className={cn('font-bold font-mono', totalReturn >= 0 ? 'text-green' : 'text-red')}
                >
                  {fmtPct(totalReturn)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Annualized ROI</span>
                <span
                  className={cn('font-bold font-mono', annualizedROI >= 0 ? 'text-green' : 'text-red')}
                >
                  {fmtPct(annualizedROI)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-gold/20">
          <div className="p-5">
            <h3 className="label mb-4 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              What if I sold today?
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Estimated Sale Price</span>
                <span className="text-white font-medium font-mono">{fmt(currentValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Closing Costs (6%)</span>
                <span className="text-red font-mono">-{fmt(Math.round(closingCosts))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Mortgage Payoff</span>
                <span className="text-red font-mono">-{fmt(mortgagePayoff)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-white font-semibold">Net Proceeds</span>
                <span
                  className={cn(
                    'text-xl font-bold font-mono',
                    netProceeds >= 0 ? 'text-green' : 'text-red',
                  )}
                >
                  {fmt(Math.round(netProceeds))}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted">Capital Gains (est.)</span>
                <span
                  className={cn('font-medium font-mono', capitalGains >= 0 ? 'text-gold' : 'text-red')}
                >
                  {capitalGains >= 0 ? '+' : ''}
                  {fmt(Math.round(capitalGains))}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  TAB 3: TENANTS                                                     */
/* ================================================================== */

function TenantsTab({
  tenants,
  payments,
}: {
  tenants: Tenant[];
  payments: RentPayment[];
}) {
  if (tenants.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="No tenants"
        description="This unit is currently vacant. Add a tenant to start tracking payments."
        action={{
          label: 'Add Tenant',
          onClick: () => { window.location.href = '/tenants' },
          icon: <Plus />,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Lease Timeline Bars */}
      <Card>
        <div className="p-5">
          <h3 className="label mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gold" />
            Lease Timeline
          </h3>
          <div className="space-y-4">
            {tenants.map((tenant) => {
              const leaseStart = tenant.lease_start ? new Date(tenant.lease_start) : null;
              const leaseEnd = tenant.lease_end ? new Date(tenant.lease_end) : null;
              const now = new Date();

              let leaseProgress = 0;
              let daysRemaining = 0;
              let barColor = 'from-green to-green/80'; // >90 days

              if (leaseStart && leaseEnd) {
                const totalDays =
                  (leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24);
                const elapsed =
                  (now.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24);
                leaseProgress = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
                daysRemaining = Math.max(
                  0,
                  Math.ceil((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
                );

                if (daysRemaining < 30) {
                  barColor = 'from-red to-red/80';
                } else if (daysRemaining < 90) {
                  barColor = 'from-gold to-gold-light';
                }
              }

              return (
                <div key={tenant.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">
                        {tenantDisplayName(tenant)}
                      </span>
                      <Badge
                        variant={tenant.status === 'active' ? 'success' : 'warning'}
                        size="sm"
                        dot
                        className="font-mono text-[10px]"
                      >
                        {tenant.status === 'active' && <span className="pulse-dot mr-1" />}
                        {tenant.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted font-mono">
                      {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Lease ended'}
                    </span>
                  </div>
                  <div className="relative h-3 bg-deep rounded-full overflow-hidden border border-border">
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 bg-gradient-to-r rounded-full transition-all duration-500',
                        barColor,
                      )}
                      style={{ width: `${leaseProgress}%` }}
                    />
                    <div
                      className="absolute top-0 h-full w-0.5 bg-white"
                      style={{ left: `${leaseProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>{fmtDate(tenant.lease_start)}</span>
                    <span>{fmtDate(tenant.lease_end)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Tenant Info Cards */}
      {tenants.map((tenant) => {
        const tenantPayments = payments.filter((p) => p.tenant_id === tenant.id);

        return (
          <div key={tenant.id} className="space-y-4">
            {/* Contact info + actions */}
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="label flex items-center gap-2">
                    <Users className="h-4 w-4 text-gold" />
                    {tenantDisplayName(tenant)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={tenant.status === 'active' ? 'success' : 'warning'}
                      size="sm"
                      dot
                      className="font-mono text-[10px]"
                    >
                      {tenant.status === 'active' && <span className="pulse-dot mr-1" />}
                      {tenant.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-muted">Email</span>
                    <p className="text-sm text-white truncate">{tenant.email || '--'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Phone</span>
                    <p className="text-sm text-white">{tenant.phone || '--'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Rent Amount</span>
                    <p className="text-sm text-green font-medium font-mono">
                      {fmt(tenant.monthly_rent)}/mo
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Security Deposit</span>
                    <p className="text-sm text-white font-mono">{fmt(tenant.security_deposit)}</p>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  {tenant.email && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Mail className="h-3.5 w-3.5" />}
                      onClick={() => window.open(`mailto:${tenant.email}`)}
                    >
                      Email
                    </Button>
                  )}
                  {tenant.phone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Phone className="h-3.5 w-3.5" />}
                      onClick={() => window.open(`tel:${tenant.phone}`)}
                    >
                      Call
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Payment History */}
            <Card>
              <div className="p-5">
                <h3 className="label mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gold" />
                  Payment History - {tenantDisplayName(tenant)}
                </h3>
                {tenantPayments.length === 0 ? (
                  <p className="text-sm text-muted py-4 text-center font-mono">No payment records yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-3 py-2 label">
                            Due Date
                          </th>
                          <th className="text-right px-3 py-2 label">
                            Amount Due
                          </th>
                          <th className="text-right px-3 py-2 label">
                            Amount Paid
                          </th>
                          <th className="text-left px-3 py-2 label">
                            Paid Date
                          </th>
                          <th className="text-right px-3 py-2 label">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenantPayments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="border-b border-border/50 hover:bg-white/5"
                          >
                            <td className="px-3 py-2.5 text-white">
                              {fmtDate(payment.due_date)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-white font-medium font-mono">
                              {fmt(payment.amount_due)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-white font-mono">
                              {fmt(payment.amount_paid)}
                            </td>
                            <td className="px-3 py-2.5 text-muted">
                              {fmtDate(payment.paid_date)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Badge
                                variant={
                                  payment.status === 'paid'
                                    ? 'success'
                                    : payment.status === 'pending'
                                      ? 'warning'
                                      : 'danger'
                                }
                                size="sm"
                                className="font-mono text-[10px]"
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
      })}
    </div>
  );
}

/* ================================================================== */
/*  TAB 4: MAINTENANCE                                                 */
/* ================================================================== */

function MaintenanceTab({ requests }: { requests: MaintenanceRequest[] }) {
  /* Status pipeline counts */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [requests]);

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<Wrench />}
        title="No maintenance requests"
        description="All clear -- no open maintenance requests for this property."
        action={{
          label: 'New Request',
          onClick: () => { window.location.href = '/maintenance' },
          icon: <Plus />,
        }}
      />
    );
  }

  const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    open: 'warning',
    in_progress: 'default',
    scheduled: 'info',
    completed: 'success',
    canceled: 'danger',
  };

  const priorityColors: Record<string, 'danger' | 'warning' | 'info'> = {
    urgent: 'danger',
    high: 'danger',
    normal: 'warning',
    medium: 'warning',
    low: 'info',
  };

  const statusOrder = ['open', 'in_progress', 'scheduled', 'completed', 'canceled'];
  const totalCost = requests.reduce(
    (sum, r) => sum + (r.actual_cost || r.estimated_cost || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Status Pipeline Visualization */}
      <Card>
        <div className="p-5">
          <h3 className="label mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gold" />
            Status Pipeline
          </h3>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {statusOrder.map((status, idx) => {
              const count = statusCounts[status] || 0;
              if (count === 0 && status !== 'open' && status !== 'completed') return null;

              return (
                <React.Fragment key={status}>
                  {idx > 0 && (
                    <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />
                  )}
                  <div
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 rounded-lg border flex-shrink-0',
                      count > 0
                        ? 'bg-card border-border'
                        : 'bg-deep/50 border-border/50',
                    )}
                  >
                    <Badge variant={statusColors[status] || 'info'} size="sm" className="font-mono text-[10px]">
                      {status.replace('_', ' ')}
                    </Badge>
                    <span
                      className={cn(
                        'text-lg font-bold font-mono',
                        count > 0 ? 'text-white' : 'text-muted',
                      )}
                    >
                      {count}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted">Total Maintenance Cost</span>
            <span className="text-lg font-bold font-mono text-white">{fmt(totalCost)}</span>
          </div>
        </div>
      </Card>

      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <h3 className="label">All Requests</h3>
        <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
          New Request
        </Button>
      </div>

      {/* Maintenance Request Cards */}
      {requests.map((req) => (
        <Card key={req.id}>
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="text-sm font-semibold text-white truncate">{req.title}</h4>
                  <Badge variant={statusColors[req.status] || 'info'} size="sm" className="font-mono text-[10px]">
                    {req.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant={priorityColors[req.priority] || 'info'} size="sm" className="font-mono text-[10px]">
                    {req.priority}
                  </Badge>
                  {req.category && (
                    <Badge variant="info" size="sm">
                      {req.category}
                    </Badge>
                  )}
                </div>
                {req.description && (
                  <p className="text-xs text-muted line-clamp-2 mb-2">{req.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created {fmtDate(req.created_at)}
                  </span>
                  {req.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Scheduled {fmtDate(req.scheduled_date)}
                    </span>
                  )}
                  {req.completed_date && (
                    <span className="flex items-center gap-1 text-green">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed {fmtDate(req.completed_date)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4 space-y-1">
                {(req.actual_cost || req.estimated_cost) && (
                  <p className="text-sm text-white font-medium font-mono">
                    {fmt(req.actual_cost || req.estimated_cost)}
                    {!req.actual_cost && req.estimated_cost && (
                      <span className="text-xs text-muted ml-1">(est.)</span>
                    )}
                  </p>
                )}
                {req.contractor_name && (
                  <div className="text-right">
                    <p className="text-xs text-muted">Contractor</p>
                    <p className="text-xs text-white">{req.contractor_name}</p>
                    {req.contractor_phone && (
                      <p className="text-[10px] text-muted">{req.contractor_phone}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  TAB 5: FINANCIALS                                                  */
/* ================================================================== */

function FinancialsTab({
  property,
  transactions,
}: {
  property: Property;
  transactions: Transaction[];
}) {
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category));
    return ['all', ...Array.from(cats)];
  }, [transactions]);

  const filtered =
    categoryFilter === 'all'
      ? transactions
      : transactions.filter((t) => t.category === categoryFilter);

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
    const headers = 'Date,Category,Type,Amount,Description,Tax Deductible\n';
    const rows = filtered
      .map(
        (t) =>
          `${t.date},${t.category},${t.type},${t.amount},"${t.description || ''}",${t.tax_deductible ? 'Yes' : 'No'}`,
      )
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
            <p className="label mb-1">Total Income</p>
            <p className="text-xl font-bold font-mono text-green">
              {fmt(monthlyPnL.income)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="label mb-1">Total Expenses</p>
            <p className="text-xl font-bold font-mono text-red">
              {fmt(monthlyPnL.expenses)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="label mb-1">Net P&L</p>
            <p
              className={cn(
                'text-xl font-bold font-mono',
                monthlyPnL.net >= 0 ? 'text-green' : 'text-red',
              )}
            >
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
              <h3 className="label mb-4">
                Category Breakdown
              </h3>
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
                      contentStyle={{
                        background: '#111111',
                        border: '1px solid #1e1e1e',
                        borderRadius: 8,
                      }}
                      itemStyle={{ color: '#f5f5f5' }}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-xs text-text">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )}

        {/* Transactions table */}
        <Card className={expenseData.length === 0 ? 'lg:col-span-2' : ''}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="label">Transactions</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCsv}
                  icon={<Download className="h-3.5 w-3.5" />}
                >
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
                    'px-3 py-1.5 rounded-lg text-[10px] font-body font-medium uppercase tracking-wider transition-colors',
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
              <p className="text-sm text-muted py-6 text-center font-body">No transactions found</p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 label">
                        Date
                      </th>
                      <th className="text-left px-3 py-2 label">
                        Category
                      </th>
                      <th className="text-left px-3 py-2 label">
                        Description
                      </th>
                      <th className="text-right px-3 py-2 label">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((txn) => (
                      <tr
                        key={txn.id}
                        className="border-b border-border/50 hover:bg-white/5"
                      >
                        <td className="px-3 py-2.5 text-muted">{fmtDate(txn.date)}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="info" size="sm">
                            {txn.category}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-text truncate max-w-[200px]">
                          {txn.description || '--'}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-medium font-mono',
                            txn.type === 'income' ? 'text-green' : 'text-red',
                          )}
                        >
                          {txn.type === 'income' ? '+' : '-'}
                          {fmt(txn.amount)}
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

/* ================================================================== */
/*  TAB 6: DOCUMENTS                                                   */
/* ================================================================== */

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
  const [typeFilter, setTypeFilter] = useState('all');

  const documentTypes = useMemo(() => {
    const types = new Set(documents.map((d) => d.type || 'unknown'));
    return ['all', ...Array.from(types)];
  }, [documents]);

  const filteredDocs =
    typeFilter === 'all'
      ? documents
      : documents.filter((d) => (d.type || 'unknown') === typeFilter);

  /* Expiration alerts (90 days) */
  const expiringDocs = useMemo(() => {
    return documents.filter((d) => {
      if (!d.expires_at) return false;
      const days = daysUntil(d.expires_at);
      return days !== null && days <= 90 && days > 0;
    });
  }, [documents]);

  const expiredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (!d.expires_at) return false;
      const days = daysUntil(d.expires_at);
      return days !== null && days <= 0;
    });
  }, [documents]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
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

          await supabase.from('documents').insert({
            property_id: propertyId,
            user_id: user.id,
            name: file.name,
            type: file.name.split('.').pop() || 'unknown',
            mime_type: file.type || 'application/octet-stream',
            file_url: urlData?.publicUrl || null,
            file_size: file.size,
          });
        }
      }

      setUploading(false);
      onRefresh();
    },
    [supabase, propertyId, onRefresh],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const mimeLabels: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'Image',
    'image/png': 'Image',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'text/csv': 'CSV',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  };

  return (
    <div className="space-y-6">
      {/* Expiration Alerts */}
      {(expiringDocs.length > 0 || expiredDocs.length > 0) && (
        <Card className="border-gold/30">
          <div className="p-4">
            <h4 className="label mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Document Alerts
            </h4>
            <div className="space-y-2">
              {expiredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between text-sm bg-red/5 border border-red/20 rounded-lg px-3 py-2"
                >
                  <span className="text-white">{doc.name}</span>
                  <Badge variant="danger" size="sm">
                    Expired
                  </Badge>
                </div>
              ))}
              {expiringDocs.map((doc) => {
                const days = daysUntil(doc.expires_at);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between text-sm bg-gold/5 border border-gold/20 rounded-lg px-3 py-2"
                  >
                    <span className="text-white">{doc.name}</span>
                    <Badge variant="warning" size="sm">
                      Expires in {days}d
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

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
          {uploading
            ? 'Uploading...'
            : isDragActive
              ? 'Drop files here'
              : 'Drop documents here or click to browse'}
        </p>
        <p className="text-xs text-muted mt-1">PDF, images, spreadsheets, and more</p>
      </div>

      {/* Type filter */}
      {documentTypes.length > 2 && (
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted mr-1" />
          {documentTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-body font-medium uppercase tracking-wider transition-colors',
                typeFilter === type
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-muted hover:text-white hover:bg-white/5',
              )}
            >
              {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Documents list */}
      {filteredDocs.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center font-body">No documents uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => {
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted">{fmtDate(doc.created_at)}</p>
                        {doc.file_size && (
                          <span className="text-xs text-muted">
                            {(doc.file_size / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="info" size="sm">
                      {doc.mime_type
                        ? mimeLabels[doc.mime_type] || doc.mime_type.split('/').pop() || 'File'
                        : doc.type || 'File'}
                    </Badge>
                    {doc.signed && (
                      <Badge variant="success" size="sm">
                        Signed
                      </Badge>
                    )}
                    {expiresIn !== null && expiresIn <= 90 && expiresIn > 0 && (
                      <Badge variant="warning" size="sm">
                        Expires in {expiresIn}d
                      </Badge>
                    )}
                    {expiresIn !== null && expiresIn <= 0 && (
                      <Badge variant="danger" size="sm">
                        Expired
                      </Badge>
                    )}
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
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

/* ================================================================== */
/*  MAIN PAGE COMPONENT                                                */
/* ================================================================== */

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const propertyId = params.id as string;

  /* ---- State ---- */
  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
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
        .from('documents')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false }),
    ]);

    setTenants(tenantsRes.data || []);
    setMaintenance(maintenanceRes.data || []);
    setTransactions(transactionsRes.data || []);
    setDocuments(documentsRes.data || []);

    // Fetch rent_payments for all tenants
    const tenantIds = (tenantsRes.data || []).map((t: Tenant) => t.id);
    if (tenantIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from('rent_payments')
        .select('*')
        .in('tenant_id', tenantIds)
        .order('due_date', { ascending: false });
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
        <Link
          href="/properties"
          className="text-sm text-gold hover:text-gold-light transition-colors"
        >
          Back to Portfolio
        </Link>
      </div>
    );
  }

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
            <Badge variant="info" className="font-mono text-[10px]">{formatPropertyType(property.property_type)}</Badge>
            <Badge variant={property.status === 'active' ? 'success' : 'warning'} dot className="font-mono text-[10px]">
              {property.status === 'active' && <span className="pulse-dot mr-1" />}
              {property.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" icon={<Edit3 className="h-4 w-4" />}>
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteConfirm(true)}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Delete
            </Button>
          </div>
        </div>
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
          <PerformanceTab property={property} />
        </TabsContent>

        <TabsContent value="tenants">
          <TenantsTab tenants={tenants} payments={payments} />
        </TabsContent>

        <TabsContent value="maintenance">
          <MaintenanceTab requests={maintenance} />
        </TabsContent>

        <TabsContent value="financials">
          <FinancialsTab property={property} transactions={transactions} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab documents={documents} propertyId={propertyId} onRefresh={fetchData} />
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
            <h3 className="font-display font-bold text-lg text-white mb-2">Delete Property</h3>
            <p className="font-body text-sm text-muted mb-6">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">{property.address}</span>? This action
              cannot be undone. All associated tenants, transactions, and documents will also be
              removed.
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
