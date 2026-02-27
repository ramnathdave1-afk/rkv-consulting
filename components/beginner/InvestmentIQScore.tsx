'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  TrendingUp,
  PieChart,
  BarChart3,
  ShieldCheck,
  Receipt,
  MapPin,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InvestmentIQScoreProps {
  properties: any[];
  tenants: any[];
  transactions: any[];
  deals: any[];
}

interface SubScore {
  key: string;
  label: string;
  score: number;
  icon: React.ReactNode;
  explanation: string;
  color: string;
  suggestions: Suggestion[];
}

interface Suggestion {
  text: string;
  impact: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

/* ------------------------------------------------------------------ */
/*  Score calculation helpers                                          */
/* ------------------------------------------------------------------ */

function calcCashFlowHealth(
  properties: any[],
  transactions: any[],
): { score: number; explanation: string } {
  if (properties.length === 0) {
    return { score: 20, explanation: 'No properties to analyze yet. Add a property to track cash flow.' };
  }

  const income = transactions
    .filter((t: any) => t.type === 'income' || t.category === 'rent' || t.amount > 0)
    .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount) || 0), 0);

  const expenses = transactions
    .filter((t: any) => t.type === 'expense' || t.amount < 0)
    .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount) || 0), 0);

  const total = income + expenses;
  if (total === 0) {
    return { score: 40, explanation: 'No transaction data available. Import your financials to get an accurate score.' };
  }

  const margin = income > 0 ? ((income - expenses) / income) * 100 : 0;

  let score: number;
  if (margin > 15) score = 100;
  else if (margin > 10) score = 80;
  else if (margin > 5) score = 60;
  else if (margin > 0) score = 40;
  else score = 20;

  return {
    score,
    explanation:
      margin > 0
        ? `Your portfolio has a ${margin.toFixed(1)}% cash flow margin. ${margin > 10 ? 'Strong performance.' : 'Room for improvement.'}`
        : `Your expenses currently exceed income. Focus on reducing costs or increasing rents.`,
  };
}

function calcPortfolioDiversification(
  properties: any[],
): { score: number; explanation: string } {
  if (properties.length === 0) {
    return { score: 0, explanation: 'No properties yet. Add properties to measure diversification.' };
  }

  const types = new Set(properties.map((p: any) => p.property_type || p.type || 'unknown'));
  const locations = new Set(properties.map((p: any) => p.city || p.state || p.location || 'unknown'));

  let typeScore: number;
  if (types.size >= 3) typeScore = 100;
  else if (types.size === 2) typeScore = 60;
  else typeScore = 30;

  const geoBonus = Math.min(locations.size * 10, 30);
  const score = Math.min(100, Math.round(typeScore * 0.7 + geoBonus));

  return {
    score,
    explanation:
      `${types.size} property type${types.size !== 1 ? 's' : ''} across ${locations.size} location${locations.size !== 1 ? 's' : ''}. ${types.size >= 3 ? 'Well diversified.' : 'Consider adding different property types.'}`,
  };
}

function calcEquityGrowth(
  properties: any[],
): { score: number; explanation: string } {
  if (properties.length === 0) {
    return { score: 0, explanation: 'No properties to calculate equity growth.' };
  }

  let totalPurchase = 0;
  let totalCurrent = 0;

  properties.forEach((p: any) => {
    const purchase = Number(p.purchase_price) || Number(p.acquisition_cost) || 0;
    const current = Number(p.current_value) || Number(p.estimated_value) || purchase;
    totalPurchase += purchase;
    totalCurrent += current;
  });

  if (totalPurchase === 0) {
    return { score: 50, explanation: 'Purchase prices not recorded. Update property details for accurate tracking.' };
  }

  const appreciation = ((totalCurrent - totalPurchase) / totalPurchase) * 100;

  let score: number;
  if (appreciation > 20) score = 100;
  else if (appreciation > 10) score = 80;
  else if (appreciation > 5) score = 60;
  else if (appreciation > 0) score = 40;
  else score = 20;

  return {
    score,
    explanation:
      appreciation >= 0
        ? `Your portfolio has appreciated ${appreciation.toFixed(1)}% overall. ${appreciation > 10 ? 'Excellent growth trajectory.' : 'Steady growth.'}`
        : `Portfolio value is down ${Math.abs(appreciation).toFixed(1)}%. Monitor market conditions closely.`,
  };
}

function calcRiskManagement(
  properties: any[],
  tenants: any[],
): { score: number; explanation: string } {
  if (properties.length === 0) {
    return { score: 0, explanation: 'No properties to assess risk.' };
  }

  const totalUnits = properties.reduce(
    (sum: number, p: any) => sum + (Number(p.units) || 1),
    0,
  );
  const activeTenants = tenants.filter(
    (t: any) => t.status === 'active' || t.lease_status === 'active',
  ).length;
  const occupancyRate = totalUnits > 0 ? (activeTenants / totalUnits) * 100 : 0;

  const longLeases = tenants.filter((t: any) => {
    const end = t.lease_end ? new Date(t.lease_end) : null;
    if (!end) return false;
    const monthsRemaining =
      (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    return monthsRemaining > 6;
  }).length;

  const leaseBonus = tenants.length > 0 ? (longLeases / tenants.length) * 30 : 0;
  const tenantBonus = Math.min(activeTenants * 5, 20);
  const score = Math.min(100, Math.round(occupancyRate * 0.5 + leaseBonus + tenantBonus));

  return {
    score,
    explanation:
      `${occupancyRate.toFixed(0)}% occupancy across ${totalUnits} unit${totalUnits !== 1 ? 's' : ''}. ${occupancyRate > 90 ? 'Low vacancy risk.' : 'Vacancy risk needs attention.'}`,
  };
}

function calcTaxEfficiency(
  transactions: any[],
): { score: number; explanation: string } {
  if (transactions.length === 0) {
    return { score: 20, explanation: 'No transactions tracked. Import expenses to maximize deductions.' };
  }

  const categorized = transactions.filter(
    (t: any) => t.category && t.category !== 'uncategorized' && t.category !== 'other',
  ).length;
  const ratio = categorized / transactions.length;

  const hasDepreciation = transactions.some(
    (t: any) =>
      t.category === 'depreciation' ||
      (t.description && t.description.toLowerCase().includes('depreciation')),
  );

  let score = Math.round(ratio * 70);
  if (hasDepreciation) score += 30;
  score = Math.min(100, score);

  return {
    score,
    explanation:
      `${(ratio * 100).toFixed(0)}% of transactions are categorized. ${hasDepreciation ? 'Depreciation is tracked.' : 'Consider tracking depreciation for tax savings.'}`,
  };
}

function calcMarketStrength(): { score: number; explanation: string } {
  return {
    score: 70,
    explanation:
      'Market strength is estimated at baseline. Connect market data for personalized insights.',
  };
}

/* ------------------------------------------------------------------ */
/*  Suggestions data                                                   */
/* ------------------------------------------------------------------ */

const suggestionsMap: Record<string, Suggestion[]> = {
  cashFlow: [
    { text: 'Review rents against market comps and increase where below market', impact: '+5-15% cash flow', difficulty: 'Easy' },
    { text: 'Negotiate bulk service contracts for maintenance and landscaping', impact: '-10-20% on expenses', difficulty: 'Medium' },
    { text: 'Add ancillary income streams (parking, laundry, storage)', impact: '+$100-500/mo per property', difficulty: 'Hard' },
  ],
  diversification: [
    { text: 'Explore adding a multifamily or commercial property to your portfolio', impact: 'Reduced concentration risk', difficulty: 'Hard' },
    { text: 'Consider investing in a different metro area or state', impact: 'Geographic risk mitigation', difficulty: 'Medium' },
    { text: 'Look into REITs or syndications for low-effort diversification', impact: 'Passive diversification', difficulty: 'Easy' },
  ],
  equity: [
    { text: 'Identify value-add renovation opportunities (kitchens, bathrooms)', impact: '+10-20% property value', difficulty: 'Medium' },
    { text: 'Make extra principal payments on your highest-rate mortgage', impact: 'Faster equity build', difficulty: 'Easy' },
    { text: 'Consider a cash-out refinance to redeploy equity into new deals', impact: 'Accelerated portfolio growth', difficulty: 'Hard' },
  ],
  risk: [
    { text: 'Start lease renewal conversations 90 days before expiration', impact: 'Reduced vacancy risk', difficulty: 'Easy' },
    { text: 'Implement tenant screening criteria to reduce default risk', impact: 'Better tenant quality', difficulty: 'Medium' },
    { text: 'Build a 6-month operating reserve for each property', impact: 'Financial safety net', difficulty: 'Hard' },
  ],
  tax: [
    { text: 'Categorize all uncategorized transactions for proper deduction tracking', impact: 'Maximize write-offs', difficulty: 'Easy' },
    { text: 'Set up depreciation schedules for each property and capital improvement', impact: '$5K-15K+ annual deduction', difficulty: 'Medium' },
    { text: 'Consult a CPA about cost segregation study for accelerated depreciation', impact: 'Significant tax savings', difficulty: 'Hard' },
  ],
  market: [
    { text: 'Set up market alerts for your target zip codes', impact: 'Early opportunity detection', difficulty: 'Easy' },
    { text: 'Research emerging markets with strong job and population growth', impact: 'Higher appreciation potential', difficulty: 'Medium' },
    { text: 'Analyze your properties rent-to-price ratio vs market average', impact: 'Validate positioning', difficulty: 'Easy' },
  ],
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function CircularGauge({ score, grade, gradeColor }: { score: number; grade: string; gradeColor: string }) {
  const radius = 70;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  useEffect(() => {
    const target = circumference - (score / 100) * circumference;
    const timer = setTimeout(() => setAnimatedOffset(target), 100);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        {/* Background circle */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="#161E2A"
          strokeWidth={stroke}
        />
        {/* Score arc */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={gradeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          transform="rotate(-90 90 90)"
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 6px ${gradeColor}40)`,
          }}
        />
        {/* Glow overlay */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={gradeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          transform="rotate(-90 90 90)"
          opacity={0.3}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-bold text-white leading-none">
          {score}
        </span>
        <span
          className="font-display text-lg font-bold mt-1"
          style={{ color: gradeColor }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 150);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: `0 0 8px ${color}30`,
        }}
      />
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: 'Easy' | 'Medium' | 'Hard' }) {
  const variantMap: Record<string, 'success' | 'warning' | 'danger'> = {
    Easy: 'success',
    Medium: 'warning',
    Hard: 'danger',
  };

  return (
    <Badge variant={variantMap[difficulty]} size="sm">
      {difficulty}
    </Badge>
  );
}

function SubScoreCard({ sub }: { sub: SubScore }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg p-4 transition-all duration-200"
      style={{ background: '#0A0E14', border: '1px solid #161E2A' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${sub.color}15` }}
          >
            {sub.icon}
          </div>
          <div>
            <span className="text-sm font-medium text-white">{sub.label}</span>
            <span
              className="ml-2 font-mono text-sm font-bold"
              style={{ color: sub.color }}
            >
              {sub.score}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          icon={expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        >
          {expanded ? 'Hide Tips' : 'Improve This'}
        </Button>
      </div>

      <ScoreBar score={sub.score} color={sub.color} />

      <p className="text-xs text-muted mt-2 leading-relaxed">{sub.explanation}</p>

      {expanded && (
        <div className="mt-3 space-y-2.5 animate-fade-up">
          {sub.suggestions.map((s, i) => (
            <div
              key={i}
              className="rounded-lg p-3 flex items-start gap-3"
              style={{ background: '#080B0F', border: '1px solid #1A2332' }}
            >
              <Zap
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                style={{ color: sub.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white leading-relaxed">{s.text}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-mono text-muted">{s.impact}</span>
                  <DifficultyBadge difficulty={s.difficulty} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function InvestmentIQScore({
  properties,
  tenants,
  transactions,
  deals,
}: InvestmentIQScoreProps) {
  const subScores: SubScore[] = useMemo(() => {
    const cashFlow = calcCashFlowHealth(properties, transactions);
    const diversification = calcPortfolioDiversification(properties);
    const equity = calcEquityGrowth(properties);
    const risk = calcRiskManagement(properties, tenants);
    const tax = calcTaxEfficiency(transactions);
    const market = calcMarketStrength();

    return [
      {
        key: 'cashFlow',
        label: 'Cash Flow Health',
        score: cashFlow.score,
        icon: <TrendingUp className="h-4 w-4" style={{ color: '#059669' }} />,
        explanation: cashFlow.explanation,
        color: '#059669',
        suggestions: suggestionsMap.cashFlow,
      },
      {
        key: 'diversification',
        label: 'Portfolio Diversification',
        score: diversification.score,
        icon: <PieChart className="h-4 w-4" style={{ color: '#0EA5E9' }} />,
        explanation: diversification.explanation,
        color: '#0EA5E9',
        suggestions: suggestionsMap.diversification,
      },
      {
        key: 'equity',
        label: 'Equity Growth',
        score: equity.score,
        icon: <BarChart3 className="h-4 w-4" style={{ color: '#8B5CF6' }} />,
        explanation: equity.explanation,
        color: '#8B5CF6',
        suggestions: suggestionsMap.equity,
      },
      {
        key: 'risk',
        label: 'Risk Management',
        score: risk.score,
        icon: <ShieldCheck className="h-4 w-4" style={{ color: '#F59E0B' }} />,
        explanation: risk.explanation,
        color: '#F59E0B',
        suggestions: suggestionsMap.risk,
      },
      {
        key: 'tax',
        label: 'Tax Efficiency',
        score: tax.score,
        icon: <Receipt className="h-4 w-4" style={{ color: '#EC4899' }} />,
        explanation: tax.explanation,
        color: '#EC4899',
        suggestions: suggestionsMap.tax,
      },
      {
        key: 'market',
        label: 'Market Strength',
        score: market.score,
        icon: <MapPin className="h-4 w-4" style={{ color: '#14B8A6' }} />,
        explanation: market.explanation,
        color: '#14B8A6',
        suggestions: suggestionsMap.market,
      },
    ];
  }, [properties, tenants, transactions, deals]);

  const overallScore = useMemo(() => {
    const weights = [0.25, 0.15, 0.20, 0.15, 0.15, 0.10];
    const weighted = subScores.reduce(
      (acc, s, i) => acc + s.score * weights[i],
      0,
    );
    return Math.round(weighted);
  }, [subScores]);

  const grade = useMemo(() => {
    if (overallScore >= 80) return 'A';
    if (overallScore >= 60) return 'B';
    if (overallScore >= 40) return 'C';
    return 'D';
  }, [overallScore]);

  const gradeColor = useMemo(() => {
    if (overallScore >= 80) return '#059669';
    if (overallScore >= 60) return '#0EA5E9';
    if (overallScore >= 40) return '#F59E0B';
    return '#DC2626';
  }, [overallScore]);

  return (
    <Card padding="lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-bold text-white">
            Investment IQ Score
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Your real estate portfolio health at a glance
          </p>
        </div>
        <Badge variant={overallScore >= 60 ? 'success' : 'warning'} dot>
          {overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Needs Work'}
        </Badge>
      </div>

      {/* Circular Gauge */}
      <div className="flex justify-center mb-6">
        <CircularGauge score={overallScore} grade={grade} gradeColor={gradeColor} />
      </div>

      {/* Grade Label */}
      <div className="text-center mb-8">
        <p className="text-xs text-muted">
          {overallScore >= 80
            ? 'Outstanding portfolio management. Keep optimizing.'
            : overallScore >= 60
              ? 'Solid foundation. Focus on the areas below to level up.'
              : overallScore >= 40
                ? 'Room for growth. Follow the suggestions to improve.'
                : 'Getting started. Complete the suggestions below to build your score.'}
        </p>
      </div>

      {/* Sub-scores grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {subScores.map((sub) => (
          <SubScoreCard key={sub.key} sub={sub} />
        ))}
      </div>
    </Card>
  );
}

export { InvestmentIQScore };
