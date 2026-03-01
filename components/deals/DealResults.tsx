'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ScenarioCards, type ScenarioData } from '@/components/deals/ScenarioCards';
import { ProjectionChart, type ProjectionYearData } from '@/components/deals/ProjectionChart';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend as ReLegend,
} from 'recharts';
import {
  LayoutDashboard,
  Wallet,
  LineChart as LineChartIcon,
  Table2,
  Activity,
  Ratio,
  Brain,
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  FileDown,
  MapPin,
  Sparkles,
  Grid3X3,
  CalendarRange,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Shield,
  Target,
  Loader2,
} from 'lucide-react';
import type { DealFormData } from '@/components/deals/DealForm';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AmortizationRow {
  year: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AnalysisResults {
  /* Core metrics */
  capRate: number;
  cashOnCash: number;
  monthlyCashFlow: number;
  annualNOI: number;
  grm: number;
  cashRequired: number;
  loanAmount: number;
  monthlyMortgage: number;
  dscr: number;
  ltv: number;
  onePercentRule: boolean;
  breakEvenOccupancy: number;
  debtYield: number;
  breakEvenRatio: number;
  operatingExpenseRatio: number;

  /* AI */
  aiScore: number;
  aiRecommendation: 'BUY' | 'PASS' | 'ANALYZE FURTHER';
  ai_recommendation: string;
  ai_reasoning: string;
  redFlags: string[];

  /* Scenarios */
  scenarios: {
    conservative: ScenarioData;
    base: ScenarioData;
    aggressive: ScenarioData;
  };

  /* Projections */
  projections: ProjectionYearData[];

  /* Amortization */
  amortization: AmortizationRow[];

  /* Sensitivity */
  sensitivityGrid: number[][];

  /* Market averages (for comparison) */
  marketAvg: {
    capRate: number;
    cashOnCash: number;
    grm: number;
    dscr: number;
  };
}

export interface DealResultsProps {
  results: AnalysisResults;
  dealData: DealFormData;
  onAddToPipeline?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt$(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}K`;
  return `${value < 0 ? '-' : ''}$${abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtFull$(value: number): string {
  return `${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function scoreColor(score: number): string {
  if (score >= 70) return '#c9a84c';
  if (score >= 40) return '#c9a84c';
  return '#DC2626';
}

/* ------------------------------------------------------------------ */
/*  Donut custom label (for the expense chart)                         */
/* ------------------------------------------------------------------ */

const EXPENSE_COLORS = ['#c9a84c', '#DC2626', '#c9a84c', '#4A6080', '#c9a84c'];

/* ------------------------------------------------------------------ */
/*  Tab 1: Dashboard                                                   */
/* ------------------------------------------------------------------ */

function DashboardTab({ results, dealData: _dealData }: DealResultsProps) {
  const metrics = [
    {
      label: 'Cap Rate',
      value: fmtPct(results.capRate),
      vs: `Market avg: ${fmtPct(results.marketAvg.capRate)}`,
      good: results.capRate >= results.marketAvg.capRate,
    },
    {
      label: 'Cash on Cash Return',
      value: fmtPct(results.cashOnCash),
      vs: `Market avg: ${fmtPct(results.marketAvg.cashOnCash)}`,
      good: results.cashOnCash >= results.marketAvg.cashOnCash,
    },
    {
      label: 'Monthly Cash Flow',
      value: fmtFull$(results.monthlyCashFlow),
      vs: results.monthlyCashFlow >= 0 ? 'Positive cash flow' : 'Negative cash flow',
      good: results.monthlyCashFlow >= 0,
    },
    {
      label: 'Net Operating Income',
      value: fmtFull$(results.annualNOI),
      vs: 'Annual',
      good: results.annualNOI > 0,
    },
    {
      label: 'Gross Rent Multiplier',
      value: results.grm.toFixed(1),
      vs: `Market avg: ${results.marketAvg.grm.toFixed(1)}`,
      good: results.grm <= results.marketAvg.grm,
    },
    {
      label: 'Cash Required to Close',
      value: fmtFull$(results.cashRequired),
      vs: 'Down payment + closing + rehab',
      good: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 6 metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <Card key={m.label} variant="default" padding="md" className="rounded-lg">
            <p className="label mb-1">{m.label}</p>
            <p className={cn('text-xl font-mono font-bold', m.good ? 'text-green' : 'text-red')}>
              {m.value}
            </p>
            <p className="text-[11px] text-muted font-body mt-1.5 flex items-center gap-1">
              {m.good ? (
                <CheckCircle2 className="w-3 h-3 text-green shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 text-red shrink-0" />
              )}
              {m.vs}
            </p>
          </Card>
        ))}
      </div>

      {/* Scenario Cards */}
      <div>
        <h3 className="label mb-3">Scenario Analysis</h3>
        <ScenarioCards scenarios={results.scenarios} />
      </div>

      {/* Quick checks row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1% Rule */}
        <Card variant="default" padding="sm">
          <div className="flex items-center gap-3 px-2">
            {results.onePercentRule ? (
              <CheckCircle2 className="w-5 h-5 text-green shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red shrink-0" />
            )}
            <div>
              <p className="text-xs text-muted font-body">1% Rule</p>
              <p className={cn('text-sm font-body font-medium', results.onePercentRule ? 'text-green' : 'text-red')}>
                {results.onePercentRule ? 'PASS' : 'FAIL'}
              </p>
            </div>
          </div>
        </Card>

        {/* Break-even occupancy */}
        <Card variant="default" padding="sm">
          <div className="flex items-center gap-3 px-2">
            <Activity className="w-5 h-5 text-gold shrink-0" />
            <div>
              <p className="text-xs text-muted font-body">Break-Even Occupancy</p>
              <p className="text-sm font-body font-medium text-white">{fmtPct(results.breakEvenOccupancy)}</p>
            </div>
          </div>
        </Card>

        {/* DSCR */}
        <Card variant="default" padding="sm">
          <div className="flex items-center gap-3 px-2">
            <Ratio className="w-5 h-5 text-gold shrink-0" />
            <div>
              <p className="text-xs text-muted font-body">DSCR</p>
              <p className={cn('text-sm font-body font-medium', results.dscr >= 1.25 ? 'text-green' : results.dscr >= 1.0 ? 'text-gold' : 'text-red')}>
                {results.dscr.toFixed(2)}x
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Cash Flow                                                   */
/* ------------------------------------------------------------------ */

function CashFlowTab({ results, dealData }: DealResultsProps) {
  const effectiveRent = dealData.expectedMonthlyRent * (1 - dealData.vacancyRate / 100);

  const incomeItems = [
    { label: 'Gross Monthly Rent', value: dealData.expectedMonthlyRent },
    { label: `Vacancy Loss (${dealData.vacancyRate}%)`, value: -(dealData.expectedMonthlyRent * dealData.vacancyRate / 100) },
    { label: 'Effective Gross Income', value: effectiveRent, highlight: true },
  ];

  const expenseItems = [
    { label: 'Mortgage Payment (P&I)', value: results.monthlyMortgage },
    { label: 'Operating Expenses', value: dealData.monthlyOperatingExpenses },
  ];

  const totalExpenses = results.monthlyMortgage + dealData.monthlyOperatingExpenses;
  const netCashFlow = effectiveRent - totalExpenses;

  /* Donut chart data: approximate annual expense breakdown */
  const annualMortgage = results.monthlyMortgage * 12;
  const annualOpex = dealData.monthlyOperatingExpenses * 12;
  /* Estimate breakdowns within opex */
  const estTax = annualOpex * 0.35;
  const estInsurance = annualOpex * 0.2;
  const estMaintenance = annualOpex * 0.25;
  const estManagement = annualOpex * 0.2;

  const donutData = [
    { name: 'Mortgage', value: Math.round(annualMortgage) },
    { name: 'Tax (est.)', value: Math.round(estTax) },
    { name: 'Insurance (est.)', value: Math.round(estInsurance) },
    { name: 'Maintenance (est.)', value: Math.round(estMaintenance) },
    { name: 'Management (est.)', value: Math.round(estManagement) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income */}
        <Card variant="default" padding="md">
          <h4 className="label mb-4">Monthly Income</h4>
          <div className="space-y-2.5">
            {incomeItems.map((item) => (
              <div
                key={item.label}
                className={cn(
                  'flex items-center justify-between',
                  item.highlight && 'pt-2 mt-2 border-t border-border',
                )}
              >
                <span className={cn('text-xs font-body', item.highlight ? 'text-white font-medium' : 'text-muted')}>
                  {item.label}
                </span>
                <span
                  className={cn(
                    'text-sm font-mono font-medium tabular-nums',
                    item.value < 0 ? 'text-red' : item.highlight ? 'text-gold' : 'text-white',
                  )}
                >
                  {fmtFull$(item.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Expenses */}
        <Card variant="default" padding="md">
          <h4 className="label mb-4">Monthly Expenses</h4>
          <div className="space-y-2.5">
            {expenseItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted font-body">{item.label}</span>
                <span className="text-sm font-mono font-medium tabular-nums text-red">
                  -{fmtFull$(item.value)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
              <span className="text-xs text-white font-body font-medium">Total Expenses</span>
              <span className="text-sm font-mono font-medium tabular-nums text-red">
                -{fmtFull$(totalExpenses)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Net cash flow highlight */}
      <Card
        variant="default"
        padding="lg"
        className={cn(
          'border-2',
          netCashFlow >= 0 ? 'border-green/30' : 'border-red/30',
        )}
      >
        <div className="text-center">
          <p className="text-xs text-muted font-body mb-1">Net Monthly Cash Flow</p>
          <p className={cn('text-3xl font-mono font-bold', netCashFlow >= 0 ? 'text-green' : 'text-red')}>
            {fmtFull$(netCashFlow)}
          </p>
          <p className="text-xs text-muted font-body mt-1">
            Annual: {fmtFull$(netCashFlow * 12)}
          </p>
        </div>
      </Card>

      {/* Expense donut */}
      <Card variant="default" padding="md">
        <h4 className="label mb-4">Annual Expense Breakdown</h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {donutData.map((_, index) => (
                  <Cell key={index} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip
                contentStyle={{
                  backgroundColor: '#111111',
                  border: '1px solid #1e1e1e',
                  borderRadius: '8px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  color: '#f5f5f5',
                }}
                formatter={(value: number | undefined) => fmtFull$(value ?? 0)}
              />
              <ReLegend
                wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3: Projection                                                  */
/* ------------------------------------------------------------------ */

function ProjectionTab({ results }: { results: AnalysisResults }) {
  /* Key milestones */
  const milestones = useMemo(() => {
    const items: Array<{ year: number; description: string; value: string }> = [];

    for (const p of results.projections) {
      if (p.cashFlow > 0 && (items.length === 0 || !items.find((i) => i.description.includes('positive')))) {
        items.push({ year: p.year, description: 'First year of positive cumulative cash flow', value: fmt$(p.cashFlow) });
      }
      if (p.totalWealth >= 100_000 && !items.find((i) => i.description.includes('100K'))) {
        items.push({ year: p.year, description: 'Total wealth reaches $100K', value: fmt$(p.totalWealth) });
      }
      if (p.totalWealth >= 500_000 && !items.find((i) => i.description.includes('500K'))) {
        items.push({ year: p.year, description: 'Total wealth reaches $500K', value: fmt$(p.totalWealth) });
      }
      if (p.totalWealth >= 1_000_000 && !items.find((i) => i.description.includes('$1M'))) {
        items.push({ year: p.year, description: 'Total wealth reaches $1M', value: fmt$(p.totalWealth) });
      }
    }

    return items.slice(0, 5);
  }, [results.projections]);

  return (
    <div className="space-y-6">
      <ProjectionChart data={results.projections} />

      {milestones.length > 0 && (
        <Card variant="default" padding="md">
          <h4 className="label mb-4">Key Milestones</h4>
          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold/10 text-gold text-xs font-display font-bold shrink-0">
                  Y{m.year}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-body truncate">{m.description}</p>
                </div>
                <span className="text-sm text-gold font-mono font-medium tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 4: Amortization                                                */
/* ------------------------------------------------------------------ */

function AmortizationTab({ results }: { results: AnalysisResults }) {
  const totalInterest = results.amortization.reduce((sum, r) => sum + r.interest, 0);
  const originalBalance = results.amortization.length > 0
    ? results.amortization[0].balance + results.amortization[0].principal
    : 0;

  /* Equity milestones */
  const milestones = [25, 50, 75, 100];
  const milestoneYears: Record<number, number | null> = { 25: null, 50: null, 75: null, 100: null };

  let cumulativePrincipal = 0;
  for (const row of results.amortization) {
    cumulativePrincipal += row.principal;
    const equityPct = originalBalance > 0 ? (cumulativePrincipal / originalBalance) * 100 : 0;
    for (const ms of milestones) {
      if (milestoneYears[ms] === null && equityPct >= ms) {
        milestoneYears[ms] = row.year;
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card variant="default" padding="sm">
          <p className="text-xs text-muted font-body px-2">Cumulative Interest</p>
          <p className="text-lg font-mono font-bold text-red px-2">{fmtFull$(totalInterest)}</p>
        </Card>
        <Card variant="default" padding="sm">
          <p className="text-xs text-muted font-body px-2">Original Loan</p>
          <p className="text-lg font-mono font-bold text-white px-2">{fmtFull$(originalBalance)}</p>
        </Card>
      </div>

      {/* Equity milestones */}
      <div className="flex items-center gap-2 flex-wrap">
        {milestones.map((ms) => (
          <div key={ms} className="flex items-center gap-1.5 px-3 py-1.5 bg-deep rounded-lg border border-border">
            <span className="text-xs text-gold font-body font-medium">{ms}% equity:</span>
            <span className="text-xs text-white font-body">
              {milestoneYears[ms] !== null ? `Year ${milestoneYears[ms]}` : 'N/A'}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-deep border-b border-border">
              <th className="text-left px-4 py-3 label">Year</th>
              <th className="text-right px-4 py-3 label">Payment</th>
              <th className="text-right px-4 py-3 label">Principal</th>
              <th className="text-right px-4 py-3 label">Interest</th>
              <th className="text-right px-4 py-3 label">Balance</th>
            </tr>
          </thead>
          <tbody>
            {results.amortization.map((row) => (
              <tr
                key={row.year}
                className={cn(
                  'border-b border-border/50 transition-colors',
                  'hover:bg-deep/50',
                  milestones.some((ms) => milestoneYears[ms] === row.year) && 'bg-gold/5',
                )}
              >
                <td className="px-4 py-2.5 text-white font-medium">{row.year}</td>
                <td className="px-4 py-2.5 text-right text-white tabular-nums">{fmtFull$(row.payment)}</td>
                <td className="px-4 py-2.5 text-right text-green tabular-nums">{fmtFull$(row.principal)}</td>
                <td className="px-4 py-2.5 text-right text-red tabular-nums">{fmtFull$(row.interest)}</td>
                <td className="px-4 py-2.5 text-right text-muted tabular-nums">{fmtFull$(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 5: Sensitivity                                                 */
/* ------------------------------------------------------------------ */

function SensitivityTab({ results, dealData: _dealData }: DealResultsProps) {
  const rentLabels = ['-10%', '-5%', 'Base', '+5%', '+10%'];
  const expLabels = ['-10%', '-5%', 'Base', '+5%', '+10%'];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted font-body">
        Monthly cash flow at different rent vs. expense scenarios. Green = positive, Red = negative.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-deep border-b border-border">
              <th className="px-3 py-3 text-left label">Rent \ Expenses</th>
              {expLabels.map((label) => (
                <th key={label} className="px-3 py-3 text-center label">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.sensitivityGrid.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50">
                <td className={cn('px-3 py-2.5 font-medium', ri === 2 ? 'text-gold' : 'text-white')}>
                  {rentLabels[ri]}
                </td>
                {row.map((val, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      'px-3 py-2.5 text-center tabular-nums font-medium',
                      val >= 0 ? 'text-green' : 'text-red',
                      ri === 2 && ci === 2 && 'bg-gold/10 text-gold',
                    )}
                  >
                    {fmtFull$(Math.round(val))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 6: Ratios                                                      */
/* ------------------------------------------------------------------ */

function RatiosTab({ results }: { results: AnalysisResults }) {
  const ratios = [
    { label: 'Cap Rate', value: fmtPct(results.capRate), benchmark: '5.0% - 10.0%', good: results.capRate >= 5 },
    { label: 'Cash on Cash', value: fmtPct(results.cashOnCash), benchmark: '8.0% - 12.0%', good: results.cashOnCash >= 8 },
    { label: 'Gross Rent Multiplier', value: results.grm.toFixed(1), benchmark: '< 15.0', good: results.grm < 15 },
    { label: 'DSCR', value: results.dscr.toFixed(2) + 'x', benchmark: '> 1.25x', good: results.dscr >= 1.25 },
    { label: 'LTV', value: fmtPct(results.ltv), benchmark: '< 80.0%', good: results.ltv <= 80 },
    { label: 'Debt Yield', value: fmtPct(results.debtYield), benchmark: '> 10.0%', good: results.debtYield >= 10 },
    { label: 'Break-Even Ratio', value: fmtPct(results.breakEvenRatio), benchmark: '< 85.0%', good: results.breakEvenRatio < 85 },
    { label: 'Operating Expense Ratio', value: fmtPct(results.operatingExpenseRatio), benchmark: '35% - 45%', good: results.operatingExpenseRatio <= 45 },
  ];

  return (
    <div className="space-y-3">
      {ratios.map((r) => (
        <Card key={r.label} variant="default" padding="sm">
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-sm text-white font-body font-medium">{r.label}</p>
              <p className="text-xs text-muted font-body mt-0.5">Benchmark: {r.benchmark}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('text-lg font-mono font-bold tabular-nums', r.good ? 'text-green' : 'text-red')}>
                {r.value}
              </span>
              <Badge variant={r.good ? 'success' : 'danger'} size="sm">
                {r.good ? 'Above' : 'Below'}
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 7: AI Analysis                                                 */
/* ------------------------------------------------------------------ */

function AIAnalysisTab({ results }: { results: AnalysisResults }) {
  const hasContent = results.ai_recommendation || results.ai_reasoning;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-6 h-6 text-gold" />
          <span className="font-display font-semibold text-white">Generating AI analysis</span>
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
        <p className="text-xs text-muted font-body">Analyzing market data, comps, and risk factors...</p>
      </div>
    );
  }

  /* Parse strengths / risks from ai_reasoning (expected format with bullet sections) */
  const strengthsSection = results.ai_reasoning?.split('RISKS:')[0]?.replace('STRENGTHS:', '').trim() || '';
  const risksSection = results.ai_reasoning?.split('RISKS:')[1]?.split('MARKET CONTEXT:')[0]?.trim() || '';
  const marketContext = results.ai_reasoning?.split('MARKET CONTEXT:')[1]?.split('SUGGESTED OFFER:')[0]?.trim() || '';
  const suggestedOffer = results.ai_reasoning?.split('SUGGESTED OFFER:')[1]?.trim() || '';

  const strengths = strengthsSection.split('\n').filter((s) => s.trim().length > 0);
  const risks = risksSection.split('\n').filter((s) => s.trim().length > 0);

  return (
    <div className="space-y-6">
      {/* Recommendation */}
      <Card variant="default" padding="lg">
        <h4 className="label mb-3">AI Recommendation</h4>
        <p className="text-sm text-white font-body leading-relaxed">
          {results.ai_recommendation || 'Based on the metrics, this deal warrants further analysis before making a decision.'}
        </p>
      </Card>

      {/* Strengths */}
      <Card variant="default" padding="md">
        <h4 className="label !text-green mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Deal Strengths
        </h4>
        <ul className="space-y-2">
          {(strengths.length > 0 ? strengths : ['Positive cash flow potential', 'Below market asking price', 'Strong rental demand in area']).map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green mt-1.5 shrink-0" />
              <span className="text-sm text-white font-body">{s.replace(/^[-*]\s*/, '')}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Risks */}
      <Card variant="default" padding="md">
        <h4 className="label !text-red mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Deal Risks
        </h4>
        <ul className="space-y-2">
          {(risks.length > 0 ? risks : ['Market volatility risk', 'Rehab cost overrun potential', 'Interest rate sensitivity']).map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red mt-1.5 shrink-0" />
              <span className="text-sm text-white font-body">{r.replace(/^[-*]\s*/, '')}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Market context */}
      {marketContext && (
        <Card variant="default" padding="md">
          <h4 className="label mb-3">Market Context</h4>
          <p className="text-sm text-muted font-body leading-relaxed">{marketContext}</p>
        </Card>
      )}

      {/* Suggested offer */}
      {suggestedOffer && (
        <Card variant="default" padding="md" className="border-gold/30">
          <h4 className="label mb-2">Suggested Offer Price</h4>
          <p className="text-xl font-mono font-bold text-gold">{suggestedOffer}</p>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 8: Compare                                                     */
/* ------------------------------------------------------------------ */

function CompareTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 mb-5">
        <GitCompare className="w-7 h-7 text-gold" />
      </div>
      <h3 className="font-display font-semibold text-lg text-white mb-2">Compare Deals</h3>
      <p className="text-sm text-muted font-body mb-6 text-center max-w-sm">
        Save multiple deals to compare them side by side here.
      </p>

      {/* Column headers placeholder */}
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-4 gap-3">
          <div className="text-xs text-muted font-body font-medium px-3 py-2">Metric</div>
          {['Deal 1', 'Deal 2', 'Deal 3'].map((d) => (
            <div
              key={d}
              className="flex items-center justify-center h-20 rounded-xl border border-dashed border-border text-xs text-muted font-body"
            >
              {d}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 9: Claude AI Deep Analysis                                     */
/* ------------------------------------------------------------------ */

interface AIDeepAnalysisSection {
  title: string;
  content: string[];
}

function parseAIResponse(text: string): AIDeepAnalysisSection[] {
  const sections: AIDeepAnalysisSection[] = [];
  const sectionHeaders = [
    'Investment Summary',
    'Risk Factors',
    'Market Context',
    'Recommendation',
  ];

  /* Try to split on ## headers first (markdown) */
  let remaining = text;

  for (let i = 0; i < sectionHeaders.length; i++) {
    const header = sectionHeaders[i];
    /* Match various header patterns: ## Header, **Header**, HEADER:, Header: */
    const patterns = [
      new RegExp(`##\\s*${header}[:\\s]*\\n`, 'i'),
      new RegExp(`\\*\\*${header}\\*\\*[:\\s]*\\n`, 'i'),
      new RegExp(`${header.toUpperCase()}:[\\s]*\\n`, 'i'),
      new RegExp(`${header}:[\\s]*\\n`, 'i'),
    ];

    let matchIndex = -1;
    let matchLength = 0;

    for (const pattern of patterns) {
      const match = remaining.match(pattern);
      if (match && match.index !== undefined) {
        if (matchIndex === -1 || match.index < matchIndex) {
          matchIndex = match.index;
          matchLength = match[0].length;
        }
      }
    }

    if (matchIndex !== -1) {
      remaining = remaining.slice(matchIndex + matchLength);

      /* Find where next section starts */
      let nextStart = remaining.length;
      for (let j = i + 1; j < sectionHeaders.length; j++) {
        const nextHeader = sectionHeaders[j];
        const nextPatterns = [
          new RegExp(`##\\s*${nextHeader}`, 'i'),
          new RegExp(`\\*\\*${nextHeader}\\*\\*`, 'i'),
          new RegExp(`${nextHeader.toUpperCase()}:`, 'i'),
          new RegExp(`${nextHeader}:`, 'i'),
        ];
        for (const np of nextPatterns) {
          const nm = remaining.match(np);
          if (nm && nm.index !== undefined && nm.index < nextStart) {
            nextStart = nm.index;
          }
        }
      }

      const sectionText = remaining.slice(0, nextStart).trim();
      const lines = sectionText
        .split('\n')
        .map((l) => l.replace(/^[-*•]\s*/, '').trim())
        .filter((l) => l.length > 0);

      sections.push({ title: header, content: lines });
    }
  }

  /* Fallback: if no sections parsed, split into 4 equal parts */
  if (sections.length === 0) {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const chunkSize = Math.max(1, Math.ceil(lines.length / 4));
    for (let i = 0; i < sectionHeaders.length; i++) {
      const chunk = lines.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length > 0) {
        sections.push({
          title: sectionHeaders[i],
          content: chunk.map((l) => l.replace(/^[-*•]\s*/, '').trim()),
        });
      }
    }
  }

  return sections;
}

function ShimmerBlock({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-md overflow-hidden relative"
          style={{
            backgroundColor: 'rgba(13, 32, 64, 0.3)',
            width: i === lines - 1 ? '60%' : '100%',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.08) 40%, rgba(201,168,76,0.15) 50%, rgba(201,168,76,0.08) 60%, transparent 100%)',
              animation: 'skeleton-scan 2s ease-in-out infinite',
            }}
          />
        </div>
      ))}
    </div>
  );
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'Investment Summary': <DollarSign className="w-4 h-4" />,
  'Risk Factors': <Shield className="w-4 h-4" />,
  'Market Context': <TrendingUp className="w-4 h-4" />,
  'Recommendation': <Target className="w-4 h-4" />,
};

const SECTION_COLORS: Record<string, string> = {
  'Investment Summary': '#c9a84c',
  'Risk Factors': '#DC2626',
  'Market Context': '#c9a84c',
  'Recommendation': '#D4A843',
};

function ClaudeAIDeepAnalysisTab({ results, dealData }: DealResultsProps) {
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const dealPayload = {
        propertyAddress: dealData.propertyAddress,
        propertyType: dealData.propertyType,
        askingPrice: dealData.askingPrice,
        downPaymentPct: dealData.downPaymentPct,
        interestRate: dealData.interestRate,
        loanTerm: dealData.loanTerm,
        expectedMonthlyRent: dealData.expectedMonthlyRent,
        vacancyRate: dealData.vacancyRate,
        monthlyOperatingExpenses: dealData.monthlyOperatingExpenses,
        rehabEstimate: dealData.rehabEstimate,
        afterRepairValue: dealData.afterRepairValue,
        annualAppreciation: dealData.annualAppreciation,
        annualRentGrowth: dealData.annualRentGrowth,
        /* Calculated metrics */
        capRate: results.capRate,
        cashOnCash: results.cashOnCash,
        monthlyCashFlow: results.monthlyCashFlow,
        annualNOI: results.annualNOI,
        dscr: results.dscr,
        grm: results.grm,
        ltv: results.ltv,
        loanAmount: results.loanAmount,
        monthlyMortgage: results.monthlyMortgage,
        cashRequired: results.cashRequired,
        onePercentRule: results.onePercentRule,
        breakEvenOccupancy: results.breakEvenOccupancy,
        debtYield: results.debtYield,
        aiScore: results.aiScore,
        aiRecommendation: results.aiRecommendation,
      };

      const res = await fetch('/api/ai/deal-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dealPayload,
          deepAnalysisMode: true,
          requestFormat: 'structured_text',
          sections: ['Investment Summary', 'Risk Factors', 'Market Context', 'Recommendation'],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Analysis failed (${res.status})`);
      }

      const data = await res.json();
      /* The API returns { analysis: { summary, risks, opportunities, ... } } */
      const analysis = data.analysis;

      /* Build structured text from the analysis object */
      let text = '';
      if (analysis.summary) {
        text += `## Investment Summary\n${analysis.summary}\n\n`;
      } else {
        text += `## Investment Summary\n- Purchase price: $${dealData.askingPrice.toLocaleString()} | Cap Rate: ${results.capRate.toFixed(2)}% | Cash-on-Cash: ${results.cashOnCash.toFixed(2)}%\n- Monthly Cash Flow: $${results.monthlyCashFlow.toLocaleString()} | Annual NOI: $${results.annualNOI.toLocaleString()}\n- DSCR: ${results.dscr.toFixed(2)}x | GRM: ${results.grm.toFixed(1)}\n\n`;
      }

      if (analysis.risks && Array.isArray(analysis.risks)) {
        text += `## Risk Factors\n${analysis.risks.map((r: string) => `- ${r}`).join('\n')}\n\n`;
      } else {
        text += `## Risk Factors\n- Market volatility and interest rate fluctuation risk\n- Vacancy exceeding projected ${dealData.vacancyRate}% could erode returns\n- Maintenance and capex overruns on ${dealData.propertyType} property\n\n`;
      }

      if (analysis.score !== undefined) {
        text += `## Market Context\n- AI Investment Score: ${analysis.score}/100 (Grade: ${analysis.grade || 'N/A'})\n`;
        if (analysis.scenarios?.base) {
          text += `- Base scenario projects ${analysis.scenarios.base.cash_on_cash_return?.toFixed(1) || results.cashOnCash.toFixed(1)}% cash-on-cash return\n`;
          text += `- 5-year equity projection: $${(analysis.scenarios.base.five_year_equity || 0).toLocaleString()}\n`;
        }
        text += `- Break-even occupancy: ${results.breakEvenOccupancy.toFixed(1)}% | Debt yield: ${results.debtYield.toFixed(1)}%\n\n`;
      } else {
        text += `## Market Context\n- Property listed at $${dealData.askingPrice.toLocaleString()} in ${dealData.propertyAddress || 'target market'}\n- Break-even occupancy: ${results.breakEvenOccupancy.toFixed(1)}%\n- Debt yield: ${results.debtYield.toFixed(1)}%\n\n`;
      }

      if (analysis.recommendation) {
        const recMap: Record<string, string> = {
          strong_buy: 'STRONG BUY',
          buy: 'BUY',
          hold: 'HOLD / ANALYZE FURTHER',
          pass: 'PASS',
          strong_pass: 'STRONG PASS',
        };
        text += `## Recommendation\n- Verdict: ${recMap[analysis.recommendation] || analysis.recommendation}\n`;
        if (analysis.opportunities && Array.isArray(analysis.opportunities)) {
          text += analysis.opportunities.map((o: string) => `- ${o}`).join('\n') + '\n';
        }
      } else {
        text += `## Recommendation\n- ${results.aiRecommendation}: ${results.ai_recommendation}\n`;
      }

      setAiResponse(text);
      setHasGenerated(true);
    } catch (err) {
      console.error('[ClaudeAIDeepAnalysis] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate analysis');
      /* Fallback: use the local analysis data */
      const fallbackText = [
        `## Investment Summary`,
        `- This ${dealData.propertyType.replace('-', ' ')} property at $${dealData.askingPrice.toLocaleString()} generates $${results.monthlyCashFlow.toLocaleString()}/mo cash flow.`,
        `- Cap Rate: ${results.capRate.toFixed(2)}% | Cash-on-Cash: ${results.cashOnCash.toFixed(2)}% | Annual NOI: $${results.annualNOI.toLocaleString()}`,
        `- Total cash required: $${results.cashRequired.toLocaleString()} (${dealData.downPaymentPct}% down + closing + rehab)`,
        ``,
        `## Risk Factors`,
        ...(results.redFlags.length > 0
          ? results.redFlags.map((f) => `- ${f}`)
          : ['- Standard market and interest rate risk applies']),
        ``,
        `## Market Context`,
        `- DSCR: ${results.dscr.toFixed(2)}x | GRM: ${results.grm.toFixed(1)} | LTV: ${results.ltv.toFixed(1)}%`,
        `- Break-even occupancy: ${results.breakEvenOccupancy.toFixed(1)}% | Debt yield: ${results.debtYield.toFixed(1)}%`,
        `- 1% Rule: ${results.onePercentRule ? 'PASS' : 'FAIL'}`,
        ``,
        `## Recommendation`,
        `- Verdict: ${results.aiRecommendation}`,
        `- ${results.ai_recommendation}`,
      ].join('\n');
      setAiResponse(fallbackText);
      setHasGenerated(true);
    } finally {
      setIsLoading(false);
    }
  }, [results, dealData]);

  const sections = useMemo(() => {
    if (!aiResponse) return [];
    return parseAIResponse(aiResponse);
  }, [aiResponse]);

  /* If not yet generated, show the generate button */
  if (!hasGenerated && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 mb-5">
          <Sparkles className="w-7 h-7 text-gold" />
        </div>
        <h3 className="font-display font-semibold text-lg text-white mb-2">Claude AI Deep Analysis</h3>
        <p className="text-sm text-muted font-body mb-6 text-center max-w-md">
          Get an in-depth AI-powered investment analysis powered by Claude.
          Includes investment summary, risk assessment, market context, and actionable recommendation.
        </p>
        <Button
          variant="primary"
          size="lg"
          icon={<Sparkles className="w-4 h-4" />}
          onClick={fetchAnalysis}
        >
          Generate AI Analysis
        </Button>
      </div>
    );
  }

  /* Loading state with shimmer */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
          <span className="font-display font-semibold text-white">Claude is analyzing this deal...</span>
        </div>
        {['Investment Summary', 'Risk Factors', 'Market Context', 'Recommendation'].map((title) => (
          <Card key={title} variant="default" padding="md">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-6 h-6 rounded-md"
                style={{ backgroundColor: 'rgba(13, 32, 64, 0.4)' }}
              />
              <div
                className="h-4 w-32 rounded"
                style={{ backgroundColor: 'rgba(13, 32, 64, 0.4)' }}
              />
            </div>
            <ShimmerBlock lines={title === 'Investment Summary' ? 5 : 3} />
          </Card>
        ))}
      </div>
    );
  }

  /* Error state */
  if (error && !aiResponse) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="w-8 h-8 text-red mb-4" />
        <h3 className="font-display font-semibold text-white mb-2">Analysis Failed</h3>
        <p className="text-sm text-muted font-body mb-4">{error}</p>
        <Button variant="outline" size="md" onClick={fetchAnalysis}>
          Try Again
        </Button>
      </div>
    );
  }

  /* Results */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          <h3 className="font-display font-semibold text-white">Claude AI Deep Analysis</h3>
        </div>
        <button
          onClick={fetchAnalysis}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body',
            'bg-deep border border-border text-muted',
            'hover:text-white hover:border-gold/30 transition-colors duration-200',
          )}
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/5 border border-gold/20">
          <AlertTriangle className="w-3.5 h-3.5 text-gold shrink-0" />
          <p className="text-xs text-gold font-body">
            API unavailable -- showing local analysis fallback.
          </p>
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => (
        <Card key={section.title} variant="default" padding="md">
          <h4
            className="label mb-3 flex items-center gap-2"
            style={{ color: SECTION_COLORS[section.title] || '#D4A843' }}
          >
            {SECTION_ICONS[section.title] || <Brain className="w-4 h-4" />}
            {section.title}
          </h4>
          <ul className="space-y-2">
            {section.content.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: SECTION_COLORS[section.title] || '#D4A843' }}
                />
                <span className="text-sm text-white font-body leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 10: Enhanced Sensitivity Analysis                              */
/* ------------------------------------------------------------------ */

function EnhancedSensitivityTab({ results, dealData }: DealResultsProps) {
  const rentLabels = ['-10%', '-5%', 'Base', '+5%', '+10%'];
  const expLabels = ['-10%', '-5%', 'Base', '+5%', '+10%'];
  const rentMultipliers = [0.90, 0.95, 1.00, 1.05, 1.10];
  const expMultipliers = [0.90, 0.95, 1.00, 1.05, 1.10];

  /* Compute sensitivity grid with cash flow + cap rate per cell */
  const gridData = useMemo(() => {
    const baseRent = dealData.expectedMonthlyRent;
    const baseExpenses = dealData.monthlyOperatingExpenses;
    const vacancyPct = dealData.vacancyRate;
    const monthlyMortgage = results.monthlyMortgage;
    const askingPrice = dealData.askingPrice;

    return rentMultipliers.map((rm) => {
      return expMultipliers.map((em) => {
        const rent = baseRent * rm;
        const expenses = baseExpenses * em;
        const effectiveRent = rent * (1 - vacancyPct / 100);
        const monthlyCashFlow = effectiveRent - monthlyMortgage - expenses;
        const annualNOI = (effectiveRent - expenses) * 12;
        const capRate = askingPrice > 0 ? (annualNOI / askingPrice) * 100 : 0;

        return {
          cashFlow: Math.round(monthlyCashFlow),
          capRate: parseFloat(capRate.toFixed(2)),
        };
      });
    });
  }, [dealData, results]);

  /* Summary stats */
  const allCashFlows = gridData.flat().map((c) => c.cashFlow);
  const bestCase = Math.max(...allCashFlows);
  const worstCase = Math.min(...allCashFlows);
  const positiveCount = allCashFlows.filter((cf) => cf >= 0).length;
  const totalScenarios = allCashFlows.length;

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <Card variant="default" padding="sm">
          <div className="px-2">
            <p className="text-xs text-muted font-body">Best Case</p>
            <p className="text-lg font-mono font-bold text-green">{fmtFull$(bestCase)}/mo</p>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="px-2">
            <p className="text-xs text-muted font-body">Worst Case</p>
            <p className={cn('text-lg font-mono font-bold', worstCase >= 0 ? 'text-green' : 'text-red')}>
              {fmtFull$(worstCase)}/mo
            </p>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="px-2">
            <p className="text-xs text-muted font-body">Positive Scenarios</p>
            <p className={cn('text-lg font-mono font-bold', positiveCount >= totalScenarios / 2 ? 'text-green' : 'text-red')}>
              {positiveCount}/{totalScenarios}
            </p>
          </div>
        </Card>
      </div>

      <p className="text-xs text-muted font-body">
        Each cell shows monthly cash flow and cap rate at different rent vs. expense levels.
        Green = positive cash flow, Red = negative.
      </p>

      {/* Grid table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-deep border-b border-border">
              <th className="px-3 py-3 text-left">
                <span className="label">Rent &#x2193; / Exp &#x2192;</span>
              </th>
              {expLabels.map((label) => (
                <th key={label} className="px-3 py-3 text-center label">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridData.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50">
                <td className={cn('px-3 py-3 font-medium', ri === 2 ? 'text-gold' : 'text-white')}>
                  {rentLabels[ri]}
                </td>
                {row.map((cell, ci) => {
                  const isBase = ri === 2 && ci === 2;
                  return (
                    <td
                      key={ci}
                      className={cn(
                        'px-3 py-2.5 text-center transition-colors',
                        isBase && 'bg-gold/10',
                      )}
                    >
                      <div
                        className={cn(
                          'font-medium tabular-nums',
                          cell.cashFlow >= 0 ? 'text-green' : 'text-red',
                          isBase && 'text-gold',
                        )}
                      >
                        {fmtFull$(cell.cashFlow)}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5 tabular-nums">
                        {cell.capRate.toFixed(1)}% cap
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted font-body">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green/20 border border-green/30" />
          Positive cash flow
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red/20 border border-red/30" />
          Negative cash flow
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gold/20 border border-gold/30" />
          Base scenario
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 11: 30-Year Projections                                        */
/* ------------------------------------------------------------------ */

interface ProjectionRow {
  year: number;
  propertyValue: number;
  annualRent: number;
  annualExpenses: number;
  cashFlow: number;
  equity: number;
  totalReturn: number;
}

function ThirtyYearProjectionsTab({ results, dealData }: DealResultsProps) {
  /* Compute 30-year projection table */
  const { rows, summaryMetrics } = useMemo(() => {
    const askingPrice = dealData.askingPrice;
    const downPaymentAmt = askingPrice * (dealData.downPaymentPct / 100);
    const loanAmount = results.loanAmount;
    const monthlyMortgage = results.monthlyMortgage;
    const annualRate = dealData.interestRate;
    const r = annualRate / 100 / 12;
    const rentGrowthPct = 3; /* 3% annual rent growth */
    const expenseGrowthPct = 2; /* 2% annual expense growth */
    const appreciationPct = 3; /* 3% annual property appreciation */
    const vacancyPct = dealData.vacancyRate;

    let propertyValue = askingPrice;
    let currentRent = dealData.expectedMonthlyRent;
    let currentExpenses = dealData.monthlyOperatingExpenses;
    let balance = loanAmount;
    let cumulativeCashFlow = 0;

    const projRows: ProjectionRow[] = [];

    for (let year = 1; year <= 30; year++) {
      /* Apply growth */
      propertyValue *= (1 + appreciationPct / 100);
      currentRent *= (1 + rentGrowthPct / 100);
      currentExpenses *= (1 + expenseGrowthPct / 100);

      /* Annual figures */
      const effectiveRent = currentRent * (1 - vacancyPct / 100);
      const annualRent = effectiveRent * 12;
      const annualExpenses = currentExpenses * 12;
      const annualMortgage = monthlyMortgage * 12;
      const annualCashFlow = annualRent - annualExpenses - annualMortgage;
      cumulativeCashFlow += annualCashFlow;

      /* Principal paydown */
      for (let m = 0; m < 12; m++) {
        if (balance <= 0) break;
        const intPmt = balance * r;
        const prinPmt = Math.min(monthlyMortgage - intPmt, balance);
        balance -= prinPmt;
      }
      if (year > dealData.loanTerm) balance = 0;

      const equity = propertyValue - Math.max(0, balance);
      const totalReturn = equity + cumulativeCashFlow - downPaymentAmt;

      projRows.push({
        year,
        propertyValue: Math.round(propertyValue),
        annualRent: Math.round(annualRent),
        annualExpenses: Math.round(annualExpenses + annualMortgage),
        cashFlow: Math.round(annualCashFlow),
        equity: Math.round(equity),
        totalReturn: Math.round(totalReturn),
      });
    }

    /* Summary metrics */
    const finalRow = projRows[projRows.length - 1];
    const totalWealth = finalRow ? finalRow.equity + cumulativeCashFlow : 0;
    const totalCashInvested = downPaymentAmt + (askingPrice * 0.03) + dealData.rehabEstimate;
    const equityMultiple = totalCashInvested > 0 ? totalWealth / totalCashInvested : 0;

    /* Estimate IRR using a simplified approach */
    /* IRR is the rate at which NPV of cash flows = 0 */
    /* We'll use Newton's method for a rough estimate */
    let irr = 0.10; /* initial guess */
    for (let iter = 0; iter < 50; iter++) {
      let npv = -totalCashInvested;
      let dnpv = 0;
      for (let y = 0; y < projRows.length; y++) {
        const t = y + 1;
        const cf = y === projRows.length - 1
          ? projRows[y].cashFlow + projRows[y].equity /* terminal value in final year */
          : projRows[y].cashFlow;
        npv += cf / Math.pow(1 + irr, t);
        dnpv -= t * cf / Math.pow(1 + irr, t + 1);
      }
      if (Math.abs(dnpv) < 1e-10) break;
      const newIrr = irr - npv / dnpv;
      if (Math.abs(newIrr - irr) < 1e-6) break;
      irr = newIrr;
      if (irr < -0.5) irr = 0.01; /* guard against divergence */
      if (irr > 2) irr = 0.5;
    }

    return {
      rows: projRows,
      summaryMetrics: {
        totalWealth: Math.round(totalWealth),
        irr: parseFloat((irr * 100).toFixed(1)),
        equityMultiple: parseFloat(equityMultiple.toFixed(2)),
        totalCashFlow: Math.round(cumulativeCashFlow),
        finalPropertyValue: finalRow ? finalRow.propertyValue : 0,
        finalEquity: finalRow ? finalRow.equity : 0,
      },
    };
  }, [results, dealData]);

  const [showAllYears, setShowAllYears] = useState(false);
  const displayedRows = showAllYears ? rows : rows.filter((r) => r.year <= 10 || r.year % 5 === 0);

  return (
    <div className="space-y-5">
      {/* Assumptions banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-deep border border-border">
        <CalendarRange className="w-3.5 h-3.5 text-gold shrink-0" />
        <p className="text-[11px] text-muted font-body">
          Assumptions: 3% annual rent growth, 2% expense growth, 3% property appreciation, {dealData.vacancyRate}% vacancy
        </p>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card variant="default" padding="sm">
          <div className="px-2">
            <p className="text-xs text-muted font-body">Total Wealth (30yr)</p>
            <p className="text-lg font-mono font-bold text-green">{fmt$(summaryMetrics.totalWealth)}</p>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="px-2">
            <p className="text-xs text-muted font-body">Estimated IRR</p>
            <p className={cn('text-lg font-mono font-bold', summaryMetrics.irr >= 8 ? 'text-green' : summaryMetrics.irr >= 4 ? 'text-gold' : 'text-red')}>
              {summaryMetrics.irr.toFixed(1)}%
            </p>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="px-2">
            <p className="text-xs text-muted font-body">Equity Multiple</p>
            <p className={cn('text-lg font-mono font-bold', summaryMetrics.equityMultiple >= 2 ? 'text-green' : 'text-gold')}>
              {summaryMetrics.equityMultiple.toFixed(2)}x
            </p>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="px-2">
            <p className="text-xs text-muted font-body">Cumulative Cash Flow</p>
            <p className={cn('text-lg font-mono font-bold', summaryMetrics.totalCashFlow >= 0 ? 'text-green' : 'text-red')}>
              {fmt$(summaryMetrics.totalCashFlow)}
            </p>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="px-2">
            <p className="text-xs text-muted font-body">Final Property Value</p>
            <p className="text-lg font-mono font-bold text-white">{fmt$(summaryMetrics.finalPropertyValue)}</p>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="px-2">
            <p className="text-xs text-muted font-body">Final Equity</p>
            <p className="text-lg font-mono font-bold text-green">{fmt$(summaryMetrics.finalEquity)}</p>
          </div>
        </Card>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted font-body">
          {showAllYears ? 'Showing all 30 years' : 'Showing years 1-10, then every 5th year'}
        </p>
        <button
          onClick={() => setShowAllYears(!showAllYears)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body',
            'bg-deep border border-border text-muted',
            'hover:text-white hover:border-gold/30 transition-colors duration-200',
          )}
        >
          {showAllYears ? 'Show Summary' : 'Show All Years'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-deep border-b border-border">
              <th className="text-left px-3 py-3 label">Year</th>
              <th className="text-right px-3 py-3 label">Property Value</th>
              <th className="text-right px-3 py-3 label">Annual Rent</th>
              <th className="text-right px-3 py-3 label">Annual Expenses</th>
              <th className="text-right px-3 py-3 label">Cash Flow</th>
              <th className="text-right px-3 py-3 label">Equity</th>
              <th className="text-right px-3 py-3 label">Total Return</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row) => {
              const isMilestone = row.year === 5 || row.year === 10 || row.year === 15 || row.year === 20 || row.year === 30;
              return (
                <tr
                  key={row.year}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-deep/50',
                    isMilestone && 'bg-gold/5',
                  )}
                >
                  <td className={cn('px-3 py-2.5 font-medium', isMilestone ? 'text-gold' : 'text-white')}>
                    {row.year}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white tabular-nums">{fmtFull$(row.propertyValue)}</td>
                  <td className="px-3 py-2.5 text-right text-green tabular-nums">{fmtFull$(row.annualRent)}</td>
                  <td className="px-3 py-2.5 text-right text-red tabular-nums">{fmtFull$(row.annualExpenses)}</td>
                  <td className={cn('px-3 py-2.5 text-right tabular-nums font-medium', row.cashFlow >= 0 ? 'text-green' : 'text-red')}>
                    {fmtFull$(row.cashFlow)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-green tabular-nums">{fmt$(row.equity)}</td>
                  <td className={cn('px-3 py-2.5 text-right tabular-nums font-medium', row.totalReturn >= 0 ? 'text-green' : 'text-red')}>
                    {fmt$(row.totalReturn)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main DealResults component                                         */
/* ------------------------------------------------------------------ */

function DealResults({ results, dealData, onAddToPipeline }: DealResultsProps) {
  const recColor =
    results.aiRecommendation === 'BUY'
      ? 'bg-green/15 text-green border-green/20'
      : results.aiRecommendation === 'PASS'
        ? 'bg-red/15 text-red border-red/20'
        : 'bg-gold/15 text-gold border-gold/20';

  const scoreCol = scoreColor(results.aiScore);

  const handleExportPDF = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();

    doc.setFillColor(8, 11, 15);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(226, 232, 240);
    doc.setFontSize(20);
    doc.text('RKV Consulting — Deal Analysis', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(136, 136, 136);
    doc.text(dealData.propertyAddress || 'Address not provided', 14, 30);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 36);

    doc.setDrawColor(22, 30, 42);
    doc.line(14, 40, 196, 40);

    doc.setTextColor(201, 168, 76);
    doc.setFontSize(14);
    doc.text(`AI Score: ${results.aiScore}/100  •  ${results.aiRecommendation}`, 14, 50);

    const metrics = [
      ['Cap Rate', fmtPct(results.capRate)],
      ['Cash on Cash Return', fmtPct(results.cashOnCash)],
      ['Monthly Cash Flow', fmtFull$(results.monthlyCashFlow)],
      ['Annual Cash Flow', fmtFull$(results.monthlyCashFlow * 12)],
      ['GRM', results.grm.toFixed(2)],
      ['DSCR', results.dscr.toFixed(2)],
      ['Annual NOI', fmtFull$(results.annualNOI)],
      ['Cash Required', fmtFull$(results.cashRequired)],
      ['LTV', fmtPct(results.ltv)],
      ['Loan Amount', fmtFull$(results.loanAmount)],
      ['Monthly Mortgage', fmtFull$(results.monthlyMortgage)],
    ];

    autoTable(doc, {
      startY: 56,
      head: [['Metric', 'Value']],
      body: metrics,
      theme: 'grid',
      headStyles: { fillColor: [17, 24, 39], textColor: [136, 136, 136], fontSize: 9 },
      bodyStyles: { fillColor: [12, 16, 24], textColor: [226, 232, 240], fontSize: 10 },
      alternateRowStyles: { fillColor: [8, 11, 15] },
      styles: { lineColor: [22, 30, 42], lineWidth: 0.5, cellPadding: 4 },
    });

    if (results.redFlags.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = ((doc as any).lastAutoTable?.finalY as number) ?? 180;
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(12);
      doc.text('Red Flags', 14, finalY + 12);
      doc.setFontSize(10);
      doc.setTextColor(226, 232, 240);
      results.redFlags.forEach((flag, i) => {
        doc.text(`• ${flag}`, 16, finalY + 22 + i * 7);
      });
    }

    doc.setTextColor(85, 85, 85);
    doc.setFontSize(8);
    doc.text('RKV Consulting — AI-Powered Real Estate Investment Platform', 14, 288);

    doc.save(`RKV-Deal-Analysis-${(dealData.propertyAddress || 'report').replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
  }, [results, dealData]);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------ */}
      {/*  Header: address + recommendation + score                    */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-gold shrink-0" />
            <h2 className="font-display font-bold text-xl text-white truncate">
              {dealData.propertyAddress || 'Deal Analysis'}
            </h2>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-semibold border',
                recColor,
              )}
            >
              {results.aiRecommendation}
            </span>
            <Badge variant="info" size="sm">
              {dealData.propertyType.replace('-', ' ')}
            </Badge>
          </div>
        </div>

        {/* AI Score ring */}
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {/* Background ring */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1e1e1e" strokeWidth="6" />
              {/* Score ring */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={scoreCol}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(results.aiScore / 100) * 263.89} 263.89`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono font-bold text-xl" style={{ color: scoreCol }}>
                {results.aiScore}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-muted font-body mt-1">AI Score</span>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Tabs                                                        */}
      {/* ------------------------------------------------------------ */}
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard" icon={<LayoutDashboard className="w-3.5 h-3.5" />}>
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="cashflow" icon={<Wallet className="w-3.5 h-3.5" />}>
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="projection" icon={<LineChartIcon className="w-3.5 h-3.5" />}>
            Projection
          </TabsTrigger>
          <TabsTrigger value="amortization" icon={<Table2 className="w-3.5 h-3.5" />}>
            Amortization
          </TabsTrigger>
          <TabsTrigger value="sensitivity" icon={<Activity className="w-3.5 h-3.5" />}>
            Sensitivity
          </TabsTrigger>
          <TabsTrigger value="ratios" icon={<Ratio className="w-3.5 h-3.5" />}>
            Ratios
          </TabsTrigger>
          <TabsTrigger value="ai" icon={<Brain className="w-3.5 h-3.5" />}>
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="compare" icon={<GitCompare className="w-3.5 h-3.5" />}>
            Compare
          </TabsTrigger>
          <TabsTrigger value="claude-ai" icon={<Sparkles className="w-3.5 h-3.5" />}>
            Claude AI
          </TabsTrigger>
          <TabsTrigger value="sensitivity-plus" icon={<Grid3X3 className="w-3.5 h-3.5" />}>
            Sensitivity+
          </TabsTrigger>
          <TabsTrigger value="30yr-projections" icon={<CalendarRange className="w-3.5 h-3.5" />}>
            30-Yr Projections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab results={results} dealData={dealData} />
        </TabsContent>
        <TabsContent value="cashflow">
          <CashFlowTab results={results} dealData={dealData} />
        </TabsContent>
        <TabsContent value="projection">
          <ProjectionTab results={results} />
        </TabsContent>
        <TabsContent value="amortization">
          <AmortizationTab results={results} />
        </TabsContent>
        <TabsContent value="sensitivity">
          <SensitivityTab results={results} dealData={dealData} />
        </TabsContent>
        <TabsContent value="ratios">
          <RatiosTab results={results} />
        </TabsContent>
        <TabsContent value="ai">
          <AIAnalysisTab results={results} />
        </TabsContent>
        <TabsContent value="compare">
          <CompareTab />
        </TabsContent>
        <TabsContent value="claude-ai">
          <ClaudeAIDeepAnalysisTab results={results} dealData={dealData} />
        </TabsContent>
        <TabsContent value="sensitivity-plus">
          <EnhancedSensitivityTab results={results} dealData={dealData} />
        </TabsContent>
        <TabsContent value="30yr-projections">
          <ThirtyYearProjectionsTab results={results} dealData={dealData} />
        </TabsContent>
      </Tabs>

      {/* ------------------------------------------------------------ */}
      {/*  Red Flag Alerts                                             */}
      {/* ------------------------------------------------------------ */}
      {results.redFlags.length > 0 && (
        <div className="space-y-3">
          <h3 className="label !text-red flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Red Flag Alerts
          </h3>
          {results.redFlags.map((flag, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-card rounded-xl border border-border border-l-4 border-l-red px-4 py-3 rounded-lg"
            >
              <AlertTriangle className="w-4 h-4 text-red shrink-0 mt-0.5" />
              <p className="text-sm text-white font-body">{flag}</p>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/*  Action buttons                                              */}
      {/* ------------------------------------------------------------ */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" size="lg" icon={<Plus className="w-4 h-4" />} onClick={onAddToPipeline}>
          Add to Pipeline
        </Button>
        <Button variant="outline" size="lg" icon={<FileDown className="w-4 h-4" />} onClick={handleExportPDF}>
          Export PDF
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

DealResults.displayName = 'DealResults';

export { DealResults };
export default DealResults;
