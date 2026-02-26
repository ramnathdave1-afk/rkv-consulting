'use client';

import React, { useMemo } from 'react';
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
  if (score >= 70) return '#22C55E';
  if (score >= 40) return '#C9A84C';
  return '#EF4444';
}

/* ------------------------------------------------------------------ */
/*  Donut custom label (for the expense chart)                         */
/* ------------------------------------------------------------------ */

const EXPENSE_COLORS = ['#C9A84C', '#EF4444', '#22C55E', '#6B7280', '#E8C97A'];

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
          <Card key={m.label} variant="default" padding="md">
            <p className="text-xs text-muted font-body mb-1">{m.label}</p>
            <p className={cn('text-xl font-display font-bold', m.good ? 'text-green' : 'text-red')}>
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
        <h3 className="font-display font-semibold text-sm text-white mb-3">Scenario Analysis</h3>
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
          <h4 className="font-display font-semibold text-sm text-white mb-4">Monthly Income</h4>
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
                    'text-sm font-body font-medium tabular-nums',
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
          <h4 className="font-display font-semibold text-sm text-white mb-4">Monthly Expenses</h4>
          <div className="space-y-2.5">
            {expenseItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted font-body">{item.label}</span>
                <span className="text-sm font-body font-medium tabular-nums text-red">
                  -{fmtFull$(item.value)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
              <span className="text-xs text-white font-body font-medium">Total Expenses</span>
              <span className="text-sm font-body font-medium tabular-nums text-red">
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
          <p className={cn('text-3xl font-display font-bold', netCashFlow >= 0 ? 'text-green' : 'text-red')}>
            {fmtFull$(netCashFlow)}
          </p>
          <p className="text-xs text-muted font-body mt-1">
            Annual: {fmtFull$(netCashFlow * 12)}
          </p>
        </div>
      </Card>

      {/* Expense donut */}
      <Card variant="default" padding="md">
        <h4 className="font-display font-semibold text-sm text-white mb-4">Annual Expense Breakdown</h4>
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
                  backgroundColor: '#0D1117',
                  border: '1px solid #1E2530',
                  borderRadius: '8px',
                  fontFamily: 'DM Sans',
                  fontSize: '12px',
                  color: '#F0EDE8',
                }}
                formatter={(value: number | undefined) => fmtFull$(value ?? 0)}
              />
              <ReLegend
                wrapperStyle={{ fontFamily: 'DM Sans', fontSize: '11px' }}
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
          <h4 className="font-display font-semibold text-sm text-white mb-4">Key Milestones</h4>
          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold/10 text-gold text-xs font-display font-bold shrink-0">
                  Y{m.year}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-body truncate">{m.description}</p>
                </div>
                <span className="text-sm text-gold font-body font-medium tabular-nums">{m.value}</span>
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
          <p className="text-lg font-display font-bold text-red px-2">{fmtFull$(totalInterest)}</p>
        </Card>
        <Card variant="default" padding="sm">
          <p className="text-xs text-muted font-body px-2">Original Loan</p>
          <p className="text-lg font-display font-bold text-white px-2">{fmtFull$(originalBalance)}</p>
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
        <table className="w-full text-xs font-body">
          <thead>
            <tr className="bg-deep border-b border-border">
              <th className="text-left px-4 py-3 text-muted font-medium">Year</th>
              <th className="text-right px-4 py-3 text-muted font-medium">Payment</th>
              <th className="text-right px-4 py-3 text-muted font-medium">Principal</th>
              <th className="text-right px-4 py-3 text-muted font-medium">Interest</th>
              <th className="text-right px-4 py-3 text-muted font-medium">Balance</th>
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
        <table className="w-full text-xs font-body">
          <thead>
            <tr className="bg-deep border-b border-border">
              <th className="px-3 py-3 text-left text-muted font-medium">Rent \ Expenses</th>
              {expLabels.map((label) => (
                <th key={label} className="px-3 py-3 text-center text-muted font-medium">{label}</th>
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
              <span className={cn('text-lg font-display font-bold tabular-nums', r.good ? 'text-green' : 'text-red')}>
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
        <h4 className="font-display font-semibold text-sm text-gold mb-3">AI Recommendation</h4>
        <p className="text-sm text-white font-body leading-relaxed">
          {results.ai_recommendation || 'Based on the metrics, this deal warrants further analysis before making a decision.'}
        </p>
      </Card>

      {/* Strengths */}
      <Card variant="default" padding="md">
        <h4 className="font-display font-semibold text-sm text-green mb-3 flex items-center gap-2">
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
        <h4 className="font-display font-semibold text-sm text-red mb-3 flex items-center gap-2">
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
          <h4 className="font-display font-semibold text-sm text-gold mb-3">Market Context</h4>
          <p className="text-sm text-muted font-body leading-relaxed">{marketContext}</p>
        </Card>
      )}

      {/* Suggested offer */}
      {suggestedOffer && (
        <Card variant="default" padding="md" className="border-gold/30">
          <h4 className="font-display font-semibold text-sm text-gold mb-2">Suggested Offer Price</h4>
          <p className="text-xl font-display font-bold text-gold">{suggestedOffer}</p>
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
/*  Main DealResults component                                         */
/* ------------------------------------------------------------------ */

function DealResults({ results, dealData }: DealResultsProps) {
  const recColor =
    results.aiRecommendation === 'BUY'
      ? 'bg-green/15 text-green border-green/20'
      : results.aiRecommendation === 'PASS'
        ? 'bg-red/15 text-red border-red/20'
        : 'bg-gold/15 text-gold border-gold/20';

  const scoreCol = scoreColor(results.aiScore);

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
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1E2530" strokeWidth="6" />
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
              <span className="font-display font-bold text-xl" style={{ color: scoreCol }}>
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
      </Tabs>

      {/* ------------------------------------------------------------ */}
      {/*  Red Flag Alerts                                             */}
      {/* ------------------------------------------------------------ */}
      {results.redFlags.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-red flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Red Flag Alerts
          </h3>
          {results.redFlags.map((flag, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-card rounded-xl border border-border border-l-4 border-l-red px-4 py-3"
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
        <Button variant="primary" size="lg" icon={<Plus className="w-4 h-4" />}>
          Add to Pipeline
        </Button>
        <Button variant="secondary" size="lg" icon={<FileDown className="w-4 h-4" />}>
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
