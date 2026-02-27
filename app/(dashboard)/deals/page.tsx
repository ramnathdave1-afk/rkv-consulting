'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DealForm, type DealFormData } from '@/components/deals/DealForm';
import { DealResults, type AnalysisResults, type AmortizationRow } from '@/components/deals/DealResults';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

import type { ScenarioData } from '@/components/deals/ScenarioCards';
import type { ProjectionYearData } from '@/components/deals/ProjectionChart';
import {
  BarChart3,
  Clock,
  Building2,
  Bookmark,
} from 'lucide-react';

/* ================================================================== */
/*  CALCULATION ENGINE                                                 */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/*  Monthly mortgage (standard amortization formula)                   */
/* ------------------------------------------------------------------ */

function calcMonthlyMortgage(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/* ------------------------------------------------------------------ */
/*  Generate full amortization schedule (yearly)                       */
/* ------------------------------------------------------------------ */

function generateAmortization(
  principal: number,
  annualRate: number,
  termYears: number,
): AmortizationRow[] {
  const monthlyPayment = calcMonthlyMortgage(principal, annualRate, termYears);
  if (monthlyPayment <= 0) return [];

  const r = annualRate / 100 / 12;
  let balance = principal;
  const rows: AmortizationRow[] = [];

  for (let year = 1; year <= termYears; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    const yearPayment = monthlyPayment * 12;

    for (let month = 0; month < 12; month++) {
      if (balance <= 0) break;
      const interestPayment = balance * r;
      const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
      yearInterest += interestPayment;
      yearPrincipal += principalPayment;
      balance -= principalPayment;
    }

    rows.push({
      year,
      payment: Math.round(yearPayment),
      principal: Math.round(yearPrincipal),
      interest: Math.round(yearInterest),
      balance: Math.max(0, Math.round(balance)),
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Generate scenario data                                             */
/* ------------------------------------------------------------------ */

function calcScenario(
  rent: number,
  vacancyPct: number,
  monthlyExpenses: number,
  monthlyMortgage: number,
  cashRequired: number,
  askingPrice: number,
  appreciationPct: number,
  downPaymentAmt: number,
): ScenarioData {
  const effectiveRent = rent * (1 - vacancyPct / 100);
  const monthlyCashFlow = effectiveRent - monthlyMortgage - monthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  const annualROI = cashRequired > 0 ? (annualCashFlow / cashRequired) * 100 : 0;

  /* 5-year equity: appreciation + principal paydown */
  let equity5yr = 0;
  let propertyValue = askingPrice;
  for (let y = 0; y < 5; y++) {
    propertyValue *= 1 + appreciationPct / 100;
  }
  equity5yr = propertyValue - askingPrice + downPaymentAmt;

  const totalReturn = equity5yr + annualCashFlow * 5;

  return {
    monthlyCashFlow: Math.round(monthlyCashFlow),
    annualROI: parseFloat(annualROI.toFixed(1)),
    fiveYearEquity: Math.round(equity5yr),
    totalReturn: Math.round(totalReturn),
  };
}

/* ------------------------------------------------------------------ */
/*  Generate 30-year projection                                        */
/* ------------------------------------------------------------------ */

function generateProjection(
  askingPrice: number,
  downPaymentAmt: number,
  loanAmount: number,
  monthlyMortgage: number,
  rent: number,
  vacancyPct: number,
  monthlyExpenses: number,
  appreciationPct: number,
  rentGrowthPct: number,
  annualRate: number,
  termYears: number,
): ProjectionYearData[] {
  const data: ProjectionYearData[] = [];
  let propertyValue = askingPrice;
  let cumulativeCashFlow = 0;
  let balance = loanAmount;
  const r = annualRate / 100 / 12;
  let currentRent = rent;
  let currentExpenses = monthlyExpenses;

  for (let year = 1; year <= 30; year++) {
    /* Appreciation */
    propertyValue *= 1 + appreciationPct / 100;

    /* Rent & expense growth */
    currentRent *= 1 + rentGrowthPct / 100;
    currentExpenses *= 1.02; /* assume 2% expense growth */

    /* Annual cash flow */
    const effectiveRent = currentRent * (1 - vacancyPct / 100);
    const annualCashFlow = (effectiveRent - monthlyMortgage - currentExpenses) * 12;
    cumulativeCashFlow += annualCashFlow;

    /* Principal paydown */
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const intPmt = balance * r;
      const prinPmt = Math.min(monthlyMortgage - intPmt, balance);
      balance -= prinPmt;
    }
    if (year > termYears) balance = 0;

    /* Equity = property value - remaining loan */
    const equity = propertyValue - Math.max(0, balance);

    data.push({
      year,
      equity: Math.round(equity),
      cashFlow: Math.round(cumulativeCashFlow),
      totalWealth: Math.round(equity + cumulativeCashFlow),
    });
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Generate sensitivity grid (5x5)                                    */
/* ------------------------------------------------------------------ */

function generateSensitivity(
  baseRent: number,
  baseExpenses: number,
  vacancyPct: number,
  monthlyMortgage: number,
): number[][] {
  const rentMultipliers = [0.90, 0.95, 1.0, 1.05, 1.10];
  const expMultipliers = [0.90, 0.95, 1.0, 1.05, 1.10];

  return rentMultipliers.map((rm) => {
    return expMultipliers.map((em) => {
      const rent = baseRent * rm;
      const expenses = baseExpenses * em;
      const effectiveRent = rent * (1 - vacancyPct / 100);
      return effectiveRent - monthlyMortgage - expenses;
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Generate red flags                                                 */
/* ------------------------------------------------------------------ */

function generateRedFlags(data: DealFormData, metrics: {
  capRate: number;
  cashOnCash: number;
  dscr: number;
  monthlyCashFlow: number;
  onePercentRule: boolean;
  breakEvenOccupancy: number;
  ltv: number;
}): string[] {
  const flags: string[] = [];

  if (metrics.monthlyCashFlow < 0) {
    flags.push('Negative monthly cash flow -- this property will cost you money each month.');
  }
  if (metrics.capRate < 4) {
    flags.push(`Cap rate of ${metrics.capRate.toFixed(1)}% is below the 4% minimum threshold for most markets.`);
  }
  if (metrics.dscr < 1.0) {
    flags.push(`DSCR of ${metrics.dscr.toFixed(2)}x is below 1.0 -- rental income does not cover debt service.`);
  }
  if (!metrics.onePercentRule) {
    flags.push('Fails the 1% rule -- monthly rent is less than 1% of the purchase price.');
  }
  if (metrics.breakEvenOccupancy > 90) {
    flags.push(`Break-even occupancy of ${metrics.breakEvenOccupancy.toFixed(0)}% is dangerously high. Very little margin for vacancy.`);
  }
  if (data.rehabEstimate > data.askingPrice * 0.25) {
    flags.push('Rehab estimate exceeds 25% of asking price -- high renovation risk.');
  }
  if (data.interestRate >= 8) {
    flags.push(`Interest rate of ${data.interestRate}% is elevated. Consider rate buydown or adjustable options.`);
  }
  if (metrics.ltv > 80) {
    flags.push('LTV exceeds 80% -- PMI likely required, increasing monthly costs.');
  }

  return flags;
}

/* ------------------------------------------------------------------ */
/*  Determine AI recommendation + score                                */
/* ------------------------------------------------------------------ */

function calcAIScore(metrics: {
  capRate: number;
  cashOnCash: number;
  dscr: number;
  monthlyCashFlow: number;
  onePercentRule: boolean;
  grm: number;
  breakEvenOccupancy: number;
}): { score: number; recommendation: 'BUY' | 'PASS' | 'ANALYZE FURTHER' } {
  let score = 50; /* Start neutral */

  /* Cap rate scoring */
  if (metrics.capRate >= 8) score += 15;
  else if (metrics.capRate >= 6) score += 10;
  else if (metrics.capRate >= 4) score += 3;
  else score -= 10;

  /* Cash on cash */
  if (metrics.cashOnCash >= 12) score += 15;
  else if (metrics.cashOnCash >= 8) score += 10;
  else if (metrics.cashOnCash >= 4) score += 3;
  else score -= 10;

  /* DSCR */
  if (metrics.dscr >= 1.5) score += 10;
  else if (metrics.dscr >= 1.25) score += 5;
  else if (metrics.dscr >= 1.0) score -= 2;
  else score -= 15;

  /* Cash flow */
  if (metrics.monthlyCashFlow >= 500) score += 10;
  else if (metrics.monthlyCashFlow >= 200) score += 5;
  else if (metrics.monthlyCashFlow >= 0) score += 0;
  else score -= 15;

  /* 1% rule */
  if (metrics.onePercentRule) score += 5;
  else score -= 5;

  /* GRM */
  if (metrics.grm <= 10) score += 5;
  else if (metrics.grm <= 15) score += 2;
  else score -= 5;

  /* Break-even occupancy */
  if (metrics.breakEvenOccupancy <= 70) score += 5;
  else if (metrics.breakEvenOccupancy <= 85) score += 0;
  else score -= 10;

  /* Clamp */
  score = Math.max(0, Math.min(100, score));

  let recommendation: 'BUY' | 'PASS' | 'ANALYZE FURTHER';
  if (score >= 70) recommendation = 'BUY';
  else if (score >= 40) recommendation = 'ANALYZE FURTHER';
  else recommendation = 'PASS';

  return { score, recommendation };
}

/* ------------------------------------------------------------------ */
/*  Full analysis runner                                               */
/* ------------------------------------------------------------------ */

function runAnalysis(data: DealFormData): AnalysisResults {
  /* Derived values */
  const downPaymentAmt = data.askingPrice * (data.downPaymentPct / 100);
  const loanAmount = data.askingPrice - downPaymentAmt;
  const closingCosts = data.askingPrice * 0.03;
  const cashRequired = downPaymentAmt + closingCosts + data.rehabEstimate;

  const monthlyMortgage = calcMonthlyMortgage(loanAmount, data.interestRate, data.loanTerm);

  const effectiveRent = data.expectedMonthlyRent * (1 - data.vacancyRate / 100);
  const monthlyCashFlow = effectiveRent - monthlyMortgage - data.monthlyOperatingExpenses;
  const annualNOI = (effectiveRent - data.monthlyOperatingExpenses) * 12;
  const annualDebtService = monthlyMortgage * 12;

  const capRate = data.askingPrice > 0 ? (annualNOI / data.askingPrice) * 100 : 0;
  const cashOnCash = cashRequired > 0 ? ((monthlyCashFlow * 12) / cashRequired) * 100 : 0;
  const grm = data.expectedMonthlyRent > 0 ? data.askingPrice / (data.expectedMonthlyRent * 12) : 0;
  const dscr = annualDebtService > 0 ? annualNOI / annualDebtService : 0;
  const ltv = data.askingPrice > 0 ? (loanAmount / data.askingPrice) * 100 : 0;
  const onePercentRule = data.expectedMonthlyRent >= data.askingPrice * 0.01;

  const grossIncome = data.expectedMonthlyRent * 12;
  const breakEvenOccupancy =
    grossIncome > 0
      ? ((data.monthlyOperatingExpenses * 12 + annualDebtService) / grossIncome) * 100
      : 100;

  const debtYield = loanAmount > 0 ? (annualNOI / loanAmount) * 100 : 0;

  const breakEvenRatio =
    grossIncome > 0
      ? ((data.monthlyOperatingExpenses * 12 + annualDebtService) / grossIncome) * 100
      : 100;

  const operatingExpenseRatio =
    effectiveRent > 0
      ? (data.monthlyOperatingExpenses / effectiveRent) * 100
      : 0;

  /* Scenarios */
  const conservative = calcScenario(
    data.expectedMonthlyRent * 0.95,
    10,
    data.monthlyOperatingExpenses * 1.1,
    monthlyMortgage,
    cashRequired,
    data.askingPrice,
    data.annualAppreciation,
    downPaymentAmt,
  );
  const base = calcScenario(
    data.expectedMonthlyRent,
    data.vacancyRate,
    data.monthlyOperatingExpenses,
    monthlyMortgage,
    cashRequired,
    data.askingPrice,
    data.annualAppreciation,
    downPaymentAmt,
  );
  const aggressive = calcScenario(
    data.expectedMonthlyRent * 1.05,
    3,
    data.monthlyOperatingExpenses,
    monthlyMortgage,
    cashRequired,
    data.askingPrice,
    data.annualAppreciation,
    downPaymentAmt,
  );

  /* Projections */
  const projections = generateProjection(
    data.askingPrice,
    downPaymentAmt,
    loanAmount,
    monthlyMortgage,
    data.expectedMonthlyRent,
    data.vacancyRate,
    data.monthlyOperatingExpenses,
    data.annualAppreciation,
    data.annualRentGrowth,
    data.interestRate,
    data.loanTerm,
  );

  /* Amortization */
  const amortization = generateAmortization(loanAmount, data.interestRate, data.loanTerm);

  /* Sensitivity */
  const sensitivityGrid = generateSensitivity(
    data.expectedMonthlyRent,
    data.monthlyOperatingExpenses,
    data.vacancyRate,
    monthlyMortgage,
  );

  /* AI scoring */
  const aiResult = calcAIScore({
    capRate,
    cashOnCash,
    dscr,
    monthlyCashFlow,
    onePercentRule,
    grm,
    breakEvenOccupancy,
  });

  /* Red flags */
  const redFlags = generateRedFlags(data, {
    capRate,
    cashOnCash,
    dscr,
    monthlyCashFlow,
    onePercentRule,
    breakEvenOccupancy,
    ltv,
  });

  /* Market averages (placeholder benchmarks) */
  const marketAvg = {
    capRate: 6.5,
    cashOnCash: 8.0,
    grm: 12.0,
    dscr: 1.25,
  };

  /* AI reasoning (structured text) */
  const ai_reasoning = buildAIReasoning(data, {
    capRate, cashOnCash, dscr, monthlyCashFlow, annualNOI,
    onePercentRule, grm, breakEvenOccupancy, cashRequired,
  });

  const ai_recommendation = buildAIRecommendation(aiResult.recommendation, data, {
    capRate, cashOnCash, monthlyCashFlow, dscr,
  });

  return {
    capRate,
    cashOnCash,
    monthlyCashFlow: Math.round(monthlyCashFlow),
    annualNOI: Math.round(annualNOI),
    grm: parseFloat(grm.toFixed(1)),
    cashRequired: Math.round(cashRequired),
    loanAmount: Math.round(loanAmount),
    monthlyMortgage: Math.round(monthlyMortgage),
    dscr: parseFloat(dscr.toFixed(2)),
    ltv: parseFloat(ltv.toFixed(1)),
    onePercentRule,
    breakEvenOccupancy: parseFloat(breakEvenOccupancy.toFixed(1)),
    debtYield: parseFloat(debtYield.toFixed(1)),
    breakEvenRatio: parseFloat(breakEvenRatio.toFixed(1)),
    operatingExpenseRatio: parseFloat(operatingExpenseRatio.toFixed(1)),
    aiScore: aiResult.score,
    aiRecommendation: aiResult.recommendation,
    ai_recommendation,
    ai_reasoning,
    redFlags,
    scenarios: { conservative, base, aggressive },
    projections,
    amortization,
    sensitivityGrid,
    marketAvg,
  };
}

/* ------------------------------------------------------------------ */
/*  AI text builders                                                   */
/* ------------------------------------------------------------------ */

function buildAIReasoning(
  data: DealFormData,
  metrics: {
    capRate: number;
    cashOnCash: number;
    dscr: number;
    monthlyCashFlow: number;
    annualNOI: number;
    onePercentRule: boolean;
    grm: number;
    breakEvenOccupancy: number;
    cashRequired: number;
  },
): string {
  const strengths: string[] = [];
  const risks: string[] = [];

  if (metrics.monthlyCashFlow > 0) strengths.push('Positive monthly cash flow from day one');
  if (metrics.capRate >= 6) strengths.push(`Strong cap rate at ${metrics.capRate.toFixed(1)}%, above market average`);
  if (metrics.dscr >= 1.25) strengths.push(`Healthy debt service coverage ratio of ${metrics.dscr.toFixed(2)}x`);
  if (metrics.onePercentRule) strengths.push('Passes the 1% rule indicating strong rent-to-price ratio');
  if (metrics.cashOnCash >= 8) strengths.push(`Attractive cash-on-cash return of ${metrics.cashOnCash.toFixed(1)}%`);
  if (data.afterRepairValue > data.askingPrice * 1.15) strengths.push('Significant forced equity potential through rehab');
  if (metrics.breakEvenOccupancy < 75) strengths.push(`Low break-even occupancy at ${metrics.breakEvenOccupancy.toFixed(0)}% provides vacancy cushion`);

  if (strengths.length === 0) strengths.push('Property is in a potentially growth area');

  if (metrics.monthlyCashFlow < 0) risks.push('Negative cash flow requires out-of-pocket funding each month');
  if (metrics.capRate < 5) risks.push(`Cap rate of ${metrics.capRate.toFixed(1)}% is below market average`);
  if (metrics.dscr < 1.0) risks.push('DSCR below 1.0 means rent does not cover debt service');
  if (!metrics.onePercentRule) risks.push('Fails the 1% rule, suggesting the property may be overpriced relative to rents');
  if (data.rehabEstimate > 0) risks.push(`Rehab estimate of $${data.rehabEstimate.toLocaleString()} introduces renovation risk and timeline uncertainty`);
  if (data.interestRate >= 7.5) risks.push(`Elevated interest rate of ${data.interestRate}% increases carrying costs`);
  if (metrics.breakEvenOccupancy > 85) risks.push('High break-even occupancy leaves little room for vacancy');

  if (risks.length === 0) risks.push('Standard market and interest rate risk applies');

  const suggestedOffer = Math.round(data.askingPrice * (metrics.capRate >= 6 ? 0.97 : metrics.capRate >= 4 ? 0.92 : 0.85));

  return [
    'STRENGTHS:',
    ...strengths.map((s) => `- ${s}`),
    'RISKS:',
    ...risks.map((r) => `- ${r}`),
    'MARKET CONTEXT:',
    `This ${data.propertyType.replace('-', ' ')} property is listed at $${data.askingPrice.toLocaleString()} with an expected rent of $${data.expectedMonthlyRent.toLocaleString()}/mo. At a ${data.interestRate}% interest rate with ${data.downPaymentPct}% down, the monthly mortgage payment is approximately $${Math.round(metrics.annualNOI / 12 + metrics.monthlyCashFlow > 0 ? metrics.monthlyCashFlow : 0).toLocaleString()}. The total cash required to close is $${metrics.cashRequired.toLocaleString()}.`,
    'SUGGESTED OFFER:',
    `$${suggestedOffer.toLocaleString()}`,
  ].join('\n');
}

function buildAIRecommendation(
  recommendation: 'BUY' | 'PASS' | 'ANALYZE FURTHER',
  data: DealFormData,
  metrics: { capRate: number; cashOnCash: number; monthlyCashFlow: number; dscr: number },
): string {
  if (recommendation === 'BUY') {
    return `This deal shows strong fundamentals with a ${metrics.capRate.toFixed(1)}% cap rate, ${metrics.cashOnCash.toFixed(1)}% cash-on-cash return, and $${Math.abs(metrics.monthlyCashFlow).toLocaleString()}/mo positive cash flow. The DSCR of ${metrics.dscr.toFixed(2)}x provides adequate debt coverage. Based on the numbers, this is a solid acquisition candidate.`;
  }
  if (recommendation === 'PASS') {
    return `The metrics on this deal are concerning. With a ${metrics.capRate.toFixed(1)}% cap rate and ${metrics.monthlyCashFlow < 0 ? 'negative' : 'minimal'} cash flow of $${Math.abs(metrics.monthlyCashFlow).toLocaleString()}/mo, this property does not meet investment-grade thresholds. The DSCR of ${metrics.dscr.toFixed(2)}x is insufficient. Consider renegotiating the price or passing on this deal.`;
  }
  return `This deal has mixed signals -- a ${metrics.capRate.toFixed(1)}% cap rate and $${Math.abs(metrics.monthlyCashFlow).toLocaleString()}/mo cash flow suggest potential, but the overall score indicates further due diligence is needed. Verify rents with local comps, get accurate rehab bids, and stress-test with higher vacancy rates before committing.`;
}

/* ================================================================== */
/*  SAVED DEAL TYPE                                                    */
/* ================================================================== */

interface SavedDeal {
  id: string;
  address: string;
  aiScore: number;
  status: 'analyzed' | 'saved' | 'pipeline';
  date: string;
  formData: DealFormData;
  results: AnalysisResults;
}

/* ================================================================== */
/*  PAGE COMPONENT                                                     */
/* ================================================================== */

export default function DealsPage() {
  /* ---- State ---------------------------------------------------- */
  const [isLoading, setIsLoading] = useState(false);
  const [currentDealData, setCurrentDealData] = useState<DealFormData | null>(null);
  const [currentResults, setCurrentResults] = useState<AnalysisResults | null>(null);
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);
  const usageCount = savedDeals.length;
  const usageLimit = 25; /* placeholder -- would come from subscription */

  /* ---- Analyze handler ------------------------------------------ */
  const handleAnalyze = useCallback(
    (data: DealFormData) => {
      setIsLoading(true);
      setCurrentDealData(data);
      setCurrentResults(null);

      /* Simulate a brief processing delay for UX */
      setTimeout(() => {
        const results = runAnalysis(data);
        setCurrentResults(results);
        setIsLoading(false);

        /* Auto-save to local list */
        const newDeal: SavedDeal = {
          id: Date.now().toString(),
          address: data.propertyAddress || 'Untitled Deal',
          aiScore: results.aiScore,
          status: 'analyzed',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          formData: data,
          results,
        };

        setSavedDeals((prev) => [newDeal, ...prev]);
      }, 1200);
    },
    [],
  );

  /* ---- Load saved deal ------------------------------------------ */
  const handleLoadDeal = useCallback((deal: SavedDeal) => {
    setCurrentDealData(deal.formData);
    setCurrentResults(deal.results);
  }, []);

  /* ---- Score color helper --------------------------------------- */
  function scoreBadgeVariant(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'danger';
  }

  /* ---- Render --------------------------------------------------- */
  return (
    <div className="flex h-screen bg-black">
      {/* ========================================================== */}
      {/*  LEFT PANEL                                                 */}
      {/* ========================================================== */}
      <div className="w-[40%] border-r border-border overflow-y-auto">
        <div className="p-6 space-y-8">
          {/* Deal Form */}
          <DealForm
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            usageCount={usageCount}
            usageLimit={usageLimit}
          />

          {/* Saved Deals */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bookmark className="w-4 h-4 text-gold" />
              <h3 className="label">Saved Deals</h3>
              {savedDeals.length > 0 && (
                <Badge variant="default" size="sm">{savedDeals.length}</Badge>
              )}
            </div>

            {savedDeals.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 className="w-8 h-8 text-muted/40 mx-auto mb-3" />
                <p className="text-xs text-muted font-mono">
                  Analyzed deals will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedDeals.map((deal) => (
                  <button
                    key={deal.id}
                    onClick={() => handleLoadDeal(deal)}
                    className={cn(
                      'w-full text-left rounded-xl rounded-lg',
                      'px-4 py-3 transition-all duration-200',
                      'hover:border-gold/20 hover:shadow-glow-sm',
                      currentDealData?.propertyAddress === deal.address && 'border-gold/30 bg-gold/5',
                    )}
                    style={{ background: '#0C1018', border: '1px solid #161E2A' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-body font-medium truncate">
                          {deal.address}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {deal.date}
                          </span>
                          <Badge
                            variant={deal.status === 'pipeline' ? 'default' : 'info'}
                            size="sm"
                            className="font-mono text-[10px]"
                          >
                            {deal.status}
                          </Badge>
                        </div>
                      </div>
                      <Badge
                        variant={scoreBadgeVariant(deal.aiScore)}
                        size="sm"
                        className={cn(
                          'font-mono text-[10px]',
                          deal.aiScore >= 70 && 'shadow-[0_0_8px_rgba(5,150,105,0.4)]',
                          deal.aiScore >= 50 && deal.aiScore < 70 && 'shadow-[0_0_8px_rgba(217,119,6,0.4)]',
                          deal.aiScore < 50 && 'shadow-[0_0_8px_rgba(220,38,38,0.4)]',
                        )}
                      >
                        {deal.aiScore}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/*  RIGHT PANEL                                                */}
      {/* ========================================================== */}
      <div className="w-[60%] overflow-y-auto">
        <div className="p-6">
          {isLoading ? (
            /* Loading skeleton */
            <div className="space-y-6 animate-fade-up">
              {/* Header skeleton */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton variant="text" width="280px" height="24px" />
                  <div className="flex gap-2">
                    <Skeleton variant="text" width="80px" height="20px" />
                    <Skeleton variant="text" width="100px" height="20px" />
                  </div>
                </div>
                <Skeleton variant="circle" width="80px" height="80px" />
              </div>
              {/* Tab bar skeleton */}
              <Skeleton variant="text" width="100%" height="42px" />
              {/* Metric cards skeleton */}
              <div className="grid grid-cols-3 gap-3">
                <Skeleton variant="card" height="100px" />
                <Skeleton variant="card" height="100px" />
                <Skeleton variant="card" height="100px" />
                <Skeleton variant="card" height="100px" />
                <Skeleton variant="card" height="100px" />
                <Skeleton variant="card" height="100px" />
              </div>
              {/* Chart skeleton */}
              <Skeleton variant="chart" height="200px" />
            </div>
          ) : currentResults && currentDealData ? (
            /* Analysis results */
            <DealResults results={currentResults} dealData={currentDealData} />
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <BarChart3 className="w-7 h-7 text-gold mb-4" />
              <h3 className="label mb-3">Deal Analysis Engine</h3>
              <p className="text-xs text-muted font-mono max-w-sm">
                Enter property details in the form on the left to run a comprehensive investment analysis with AI-powered insights
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
