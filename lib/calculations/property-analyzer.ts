// ============================================================================
// Property Analyzer — Full Financial Calculation Engine
// Ported from /Users/daveramnath/property-analyzer/lib/calculations.ts
// All formulas: amortization, IRR, cash flows, projections, sensitivity, deal scoring
// ============================================================================

import type {
  PropertyAnalyzerInputs,
  AnalyzerAmortizationRow,
  AnalyzerAnnualProjection,
  AnalyzerMonthlyCashFlow,
  AnalyzerDealMetrics,
  AnalyzerSensitivityResult,
} from '@/types';

// ─── Mortgage Helpers ───────────────────────────────────────────────

export function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (annualRate === 0) return principal / (termYears * 12);
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function buildAmortizationSchedule(
  principal: number,
  annualRate: number,
  termYears: number
): AnalyzerAmortizationRow[] {
  const schedule: AnalyzerAmortizationRow[] = [];
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  const payment = calcMonthlyPayment(principal, annualRate, termYears);
  let balance = principal;
  let totalPrincipal = 0;
  let totalInterest = 0;

  for (let month = 1; month <= n; month++) {
    const interest = balance * r;
    const principalPart = payment - interest;
    balance = Math.max(0, balance - principalPart);
    totalPrincipal += principalPart;
    totalInterest += interest;

    schedule.push({
      month,
      payment,
      principal: principalPart,
      interest,
      balance,
      totalPrincipalPaid: totalPrincipal,
      totalInterestPaid: totalInterest,
    });
  }
  return schedule;
}

// ─── IRR Calculation (Newton-Raphson) ───────────────────────────────

function calcIRR(cashFlows: number[], guess = 0.1, maxIter = 1000, tol = 1e-7): number {
  let rate = guess;
  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashFlows[t] / denom;
      if (t > 0) dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < tol) return newRate;
    rate = newRate;
  }
  return rate;
}

// ─── Monthly Cash Flows ─────────────────────────────────────────────

function buildMonthlyCashFlows(
  inputs: PropertyAnalyzerInputs,
  monthlyPayment: number,
  months: number
): AnalyzerMonthlyCashFlow[] {
  const flows: AnalyzerMonthlyCashFlow[] = [];
  for (let m = 1; m <= months; m++) {
    const year = Math.ceil(m / 12);
    const yearsElapsed = year - 1;
    const rentGrowthFactor = Math.pow(1 + inputs.annualRentGrowth / 100, yearsElapsed);
    const expenseGrowthFactor = Math.pow(1 + inputs.annualExpenseGrowthRate / 100, yearsElapsed);

    const grossRent = inputs.monthlyRent * rentGrowthFactor;
    const vacancyLoss = grossRent * (inputs.vacancyRate / 100);
    const effectiveRent = grossRent - vacancyLoss;

    const propertyTax = (inputs.propertyTax / 12) * expenseGrowthFactor;
    const insurance = (inputs.insurance / 12) * expenseGrowthFactor;
    const maintenance = (inputs.maintenance / 12) * expenseGrowthFactor;
    const hoa = inputs.hoa * expenseGrowthFactor;
    const managementFee = effectiveRent * (inputs.propertyManagementPercent / 100);
    const totalExpenses = propertyTax + insurance + maintenance + hoa + managementFee;
    const noi = effectiveRent - totalExpenses;
    const cashFlow = noi - monthlyPayment;

    flows.push({
      month: m,
      year,
      grossRent,
      vacancyLoss,
      effectiveRent,
      propertyTax,
      insurance,
      maintenance,
      hoa,
      managementFee,
      totalExpenses,
      noi,
      mortgagePayment: monthlyPayment,
      cashFlow,
    });
  }
  return flows;
}

// ─── Annual Projections ─────────────────────────────────────────────

function buildAnnualProjections(
  inputs: PropertyAnalyzerInputs,
  amortSchedule: AnalyzerAmortizationRow[],
  monthlyCFs: AnalyzerMonthlyCashFlow[],
  totalCashInvested: number
): AnalyzerAnnualProjection[] {
  const projections: AnalyzerAnnualProjection[] = [];
  let cumulativeCashFlow = 0;

  for (let year = 1; year <= 10; year++) {
    const propertyValue =
      inputs.purchasePrice * Math.pow(1 + inputs.annualAppreciationRate / 100, year);
    const appreciation = propertyValue - inputs.purchasePrice;

    const startMonth = (year - 1) * 12;
    const endMonth = year * 12;
    const yearAmort = amortSchedule.slice(startMonth, endMonth);
    const yearCFs = monthlyCFs.slice(startMonth, endMonth);

    const loanBalance = yearAmort.length > 0 ? yearAmort[yearAmort.length - 1].balance : 0;
    const equity = propertyValue - loanBalance;

    const grossRent = yearCFs.reduce((s, c) => s + c.grossRent, 0);
    const effectiveRent = yearCFs.reduce((s, c) => s + c.effectiveRent, 0);
    const totalExpenses = yearCFs.reduce((s, c) => s + c.totalExpenses, 0);
    const noi = yearCFs.reduce((s, c) => s + c.noi, 0);
    const debtService = yearCFs.reduce((s, c) => s + c.mortgagePayment, 0);
    const cashFlow = yearCFs.reduce((s, c) => s + c.cashFlow, 0);
    const principalPaid = yearAmort.reduce((s, a) => s + a.principal, 0);
    const interestPaid = yearAmort.reduce((s, a) => s + a.interest, 0);

    cumulativeCashFlow += cashFlow;
    const totalReturn =
      cumulativeCashFlow +
      appreciation +
      (yearAmort.length > 0 ? yearAmort[yearAmort.length - 1].totalPrincipalPaid : 0);
    const totalROI = totalCashInvested > 0 ? (totalReturn / totalCashInvested) * 100 : 0;
    const cashOnCash = totalCashInvested > 0 ? (cashFlow / totalCashInvested) * 100 : 0;
    const capRate = inputs.purchasePrice > 0 ? (noi / inputs.purchasePrice) * 100 : 0;

    projections.push({
      year,
      propertyValue,
      loanBalance,
      equity,
      grossRent,
      effectiveRent,
      totalExpenses,
      noi,
      debtService,
      cashFlow,
      cashOnCash,
      capRate,
      cumulativeCashFlow,
      totalReturn,
      totalROI,
      principalPaid,
      interestPaid,
      appreciation,
    });
  }
  return projections;
}

// ─── Deal Score Algorithm ───────────────────────────────────────────

function calcDealScore(
  capRate: number,
  cashOnCash: number,
  dscr: number,
  monthlyCashFlow: number,
  breakEvenMonths: number
): { score: number; rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' } {
  let score = 0;

  // Cap rate (25 pts)
  score += Math.min(25, Math.max(0, capRate * 3.125));

  // Cash on cash (25 pts)
  score += Math.min(25, Math.max(0, cashOnCash * 2.08));

  // DSCR (20 pts)
  if (dscr >= 2) score += 20;
  else if (dscr >= 1.25) score += 12 + (dscr - 1.25) * 10.67;
  else if (dscr >= 1) score += 5 + (dscr - 1) * 28;
  else if (dscr >= 0.8) score += (dscr - 0.8) * 25;

  // Monthly cash flow (15 pts)
  if (monthlyCashFlow >= 500) score += 15;
  else if (monthlyCashFlow >= 200) score += 8 + ((monthlyCashFlow - 200) / 300) * 7;
  else if (monthlyCashFlow >= 0) score += 2 + (monthlyCashFlow / 200) * 6;

  // Break-even (15 pts)
  if (breakEvenMonths <= 0 || breakEvenMonths > 120) score += 0;
  else if (breakEvenMonths <= 12) score += 15;
  else if (breakEvenMonths <= 24) score += 10 + ((24 - breakEvenMonths) / 12) * 5;
  else if (breakEvenMonths <= 60) score += 3 + ((60 - breakEvenMonths) / 36) * 7;
  else score += Math.max(0, 3 * (1 - (breakEvenMonths - 60) / 60));

  score = Math.round(Math.min(100, Math.max(0, score)));

  let rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  if (score >= 75) rating = 'Excellent';
  else if (score >= 55) rating = 'Good';
  else if (score >= 35) rating = 'Fair';
  else rating = 'Poor';

  return { score, rating };
}

// ─── Main Analysis ──────────────────────────────────────────────────

export function analyzeProperty(inputs: PropertyAnalyzerInputs): AnalyzerDealMetrics {
  const downPayment = inputs.purchasePrice * (inputs.downPaymentPercent / 100);
  const loanAmount = inputs.purchasePrice - downPayment;
  const closingCosts = inputs.purchasePrice * (inputs.closingCostsPercent / 100);
  const totalCashInvested = downPayment + closingCosts;
  const monthlyMortgagePayment = calcMonthlyPayment(
    loanAmount,
    inputs.interestRate,
    inputs.loanTermYears
  );

  const amortizationSchedule = buildAmortizationSchedule(
    loanAmount,
    inputs.interestRate,
    inputs.loanTermYears
  );

  const monthlyCashFlows = buildMonthlyCashFlows(inputs, monthlyMortgagePayment, 120);

  // Year 1 figures
  const monthlyGrossRent = inputs.monthlyRent;
  const monthlyVacancy = monthlyGrossRent * (inputs.vacancyRate / 100);
  const monthlyEffectiveRent = monthlyGrossRent - monthlyVacancy;
  const annualGrossRent = monthlyGrossRent * 12;
  const annualEffectiveRent = monthlyEffectiveRent * 12;

  const monthlyPropertyTax = inputs.propertyTax / 12;
  const monthlyInsurance = inputs.insurance / 12;
  const monthlyMaintenance = inputs.maintenance / 12;
  const monthlyHOA = inputs.hoa;
  const monthlyManagement = monthlyEffectiveRent * (inputs.propertyManagementPercent / 100);
  const monthlyExpenses =
    monthlyPropertyTax + monthlyInsurance + monthlyMaintenance + monthlyHOA + monthlyManagement;
  const annualExpenses = monthlyExpenses * 12;

  const monthlyNOI = monthlyEffectiveRent - monthlyExpenses;
  const annualNOI = monthlyNOI * 12;
  const monthlyCashFlow = monthlyNOI - monthlyMortgagePayment;
  const annualCashFlow = monthlyCashFlow * 12;

  const capRate = inputs.purchasePrice > 0 ? (annualNOI / inputs.purchasePrice) * 100 : 0;
  const cashOnCash = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;
  const grossRentMultiplier =
    annualGrossRent > 0 ? inputs.purchasePrice / annualGrossRent : 0;
  const annualDebtService = monthlyMortgagePayment * 12;
  const dscr = annualDebtService > 0 ? annualNOI / annualDebtService : 0;

  const onePercentRatio =
    inputs.purchasePrice > 0 ? (inputs.monthlyRent / inputs.purchasePrice) * 100 : 0;
  const onePercentRule = onePercentRatio >= 1;
  const twoPercentRule = onePercentRatio >= 2;

  const annualProjections = buildAnnualProjections(
    inputs,
    amortizationSchedule,
    monthlyCashFlows,
    totalCashInvested
  );

  // IRR calculations
  const irr5Flows = [
    -totalCashInvested,
    ...annualProjections.slice(0, 4).map((p) => p.cashFlow),
    annualProjections[4].cashFlow +
      annualProjections[4].propertyValue -
      annualProjections[4].loanBalance,
  ];
  const irr10Flows = [
    -totalCashInvested,
    ...annualProjections.slice(0, 9).map((p) => p.cashFlow),
    annualProjections[9].cashFlow +
      annualProjections[9].propertyValue -
      annualProjections[9].loanBalance,
  ];

  const irr5Year = calcIRR(irr5Flows) * 100;
  const irr10Year = calcIRR(irr10Flows) * 100;

  // Break-even
  let breakEvenMonths = 0;
  let cumCF = 0;
  for (const cf of monthlyCashFlows) {
    cumCF += cf.cashFlow;
    if (cumCF >= totalCashInvested) {
      breakEvenMonths = cf.month;
      break;
    }
  }
  if (cumCF < totalCashInvested) {
    if (monthlyCashFlow > 0) {
      const remainingMonths = (totalCashInvested - cumCF) / monthlyCashFlow;
      breakEvenMonths = 120 + Math.ceil(remainingMonths);
    } else {
      breakEvenMonths = 999;
    }
  }

  const { score: dealScore, rating: dealRating } = calcDealScore(
    capRate,
    cashOnCash,
    dscr,
    monthlyCashFlow,
    breakEvenMonths
  );

  const totalInterestPaid =
    amortizationSchedule.length > 0
      ? amortizationSchedule[amortizationSchedule.length - 1].totalInterestPaid
      : 0;
  const totalPrincipalPaid10Year =
    amortizationSchedule.length >= 120
      ? amortizationSchedule[119].totalPrincipalPaid
      : amortizationSchedule.length > 0
        ? amortizationSchedule[amortizationSchedule.length - 1].totalPrincipalPaid
        : 0;
  const totalAppreciation10Year = annualProjections[9]?.appreciation || 0;
  const equityYear10 = annualProjections[9]?.equity || 0;
  const propertyValueYear10 = annualProjections[9]?.propertyValue || 0;

  return {
    loanAmount,
    downPayment,
    closingCosts,
    totalCashInvested,
    monthlyMortgagePayment,
    monthlyGrossRent,
    monthlyEffectiveRent,
    annualGrossRent,
    annualEffectiveRent,
    monthlyExpenses,
    annualExpenses,
    monthlyNOI,
    annualNOI,
    monthlyCashFlow,
    annualCashFlow,
    capRate,
    cashOnCash,
    grossRentMultiplier,
    dscr,
    onePercentRule,
    twoPercentRule,
    onePercentRatio,
    irr5Year,
    irr10Year,
    breakEvenMonths,
    dealScore,
    dealRating,
    amortizationSchedule,
    annualProjections,
    monthlyCashFlows,
    totalInterestPaid,
    totalPrincipalPaid10Year,
    totalAppreciation10Year,
    equityYear10,
    propertyValueYear10,
  };
}

// ─── Sensitivity Analysis ───────────────────────────────────────────

export function runSensitivity(inputs: PropertyAnalyzerInputs): AnalyzerSensitivityResult[] {
  const base = analyzeProperty(inputs);
  const scenarios: { name: string; modifier: (i: PropertyAnalyzerInputs) => PropertyAnalyzerInputs }[] = [
    { name: 'Base Case', modifier: (i) => ({ ...i }) },
    { name: 'Rent -10%', modifier: (i) => ({ ...i, monthlyRent: i.monthlyRent * 0.9 }) },
    { name: 'Rent -20%', modifier: (i) => ({ ...i, monthlyRent: i.monthlyRent * 0.8 }) },
    {
      name: 'Vacancy 2x',
      modifier: (i) => ({ ...i, vacancyRate: Math.min(i.vacancyRate * 2, 50) }),
    },
    { name: 'Rate +1%', modifier: (i) => ({ ...i, interestRate: i.interestRate + 1 }) },
    { name: 'Rate +2%', modifier: (i) => ({ ...i, interestRate: i.interestRate + 2 }) },
    {
      name: 'Expenses +20%',
      modifier: (i) => ({
        ...i,
        propertyTax: i.propertyTax * 1.2,
        insurance: i.insurance * 1.2,
        maintenance: i.maintenance * 1.2,
      }),
    },
    {
      name: 'Best Case',
      modifier: (i) => ({
        ...i,
        monthlyRent: i.monthlyRent * 1.1,
        vacancyRate: Math.max(i.vacancyRate * 0.5, 1),
      }),
    },
  ];

  return scenarios.map((s) => {
    const modified = analyzeProperty(s.modifier({ ...inputs }));
    return {
      scenario: s.name,
      monthlyCashFlow: modified.monthlyCashFlow,
      annualCashFlow: modified.annualCashFlow,
      cashOnCash: modified.cashOnCash,
      capRate: modified.capRate,
      dscr: modified.dscr,
      dealScore: modified.dealScore,
      change:
        base.monthlyCashFlow !== 0
          ? ((modified.monthlyCashFlow - base.monthlyCashFlow) / Math.abs(base.monthlyCashFlow)) *
            100
          : 0,
    };
  });
}

// ─── Formatters ─────────────────────────────────────────────────────

export function formatCurrency(value: number, decimals = 0): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── Default Inputs ─────────────────────────────────────────────────

export const DEFAULT_ANALYZER_INPUTS: PropertyAnalyzerInputs = {
  purchasePrice: 350000,
  downPaymentPercent: 20,
  interestRate: 7.0,
  loanTermYears: 30,
  monthlyRent: 2800,
  vacancyRate: 5,
  annualRentGrowth: 3,
  propertyTax: 4200,
  insurance: 1800,
  maintenance: 1500,
  hoa: 0,
  propertyManagementPercent: 8,
  closingCostsPercent: 3,
  annualAppreciationRate: 3.5,
  annualExpenseGrowthRate: 2,
};
