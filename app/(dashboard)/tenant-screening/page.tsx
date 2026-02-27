'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Send,
  Copy,
  Check,
  ChevronRight,
  CreditCard,
  AlertTriangle,
  Home,
  DollarSign,
  Bot,
  ExternalLink,
  X,
  CheckCircle,
  XCircle,
  HelpCircle,
  User,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { FeatureGate } from '@/components/paywall/FeatureGate';
import type { Property, ScreeningResult } from '@/types';

/* ------------------------------------------------------------------ */
/*  Mock screening data                                                */
/* ------------------------------------------------------------------ */

const MOCK_SCREENINGS: {
  id: string;
  applicantName: string;
  applicantEmail: string;
  propertyAddress: string;
  date: string;
  status: 'pending' | 'complete' | 'expired';
  result: ScreeningResult | null;
}[] = [
  {
    id: 'scr-001',
    applicantName: 'Marcus Williams',
    applicantEmail: 'marcus.w@email.com',
    propertyAddress: '1420 Oak Lane, Unit B',
    date: '2026-02-20',
    status: 'complete',
    result: {
      applicant_name: 'Marcus Williams',
      application_date: '2026-02-20',
      credit_score: 742,
      credit_grade: 'good',
      credit_flags: [],
      monthly_income: 6800,
      income_to_rent_ratio: 3.4,
      employment_verified: true,
      employer: 'Deloitte Consulting',
      eviction_history: false,
      criminal_background: false,
      prior_landlord_references: 2,
      rental_history_years: 6,
      overall_score: 85,
      risk_level: 'low',
      recommendation: 'approve',
      conditions: [],
      flags: [],
      summary:
        'Marcus Williams is a strong applicant with a credit score of 742 and a stable income of $6,800/mo from Deloitte Consulting. His income-to-rent ratio of 3.4x exceeds the standard 3x threshold. He has a clean eviction record and 6 years of rental history with 2 positive landlord references. No criminal background or credit flags detected. Recommend full approval with standard lease terms.',
    },
  },
  {
    id: 'scr-002',
    applicantName: 'Jennifer Chen',
    applicantEmail: 'jchen.design@email.com',
    propertyAddress: '835 Maple Drive',
    date: '2026-02-18',
    status: 'complete',
    result: {
      applicant_name: 'Jennifer Chen',
      application_date: '2026-02-18',
      credit_score: 618,
      credit_grade: 'fair',
      credit_flags: ['Late payment (30 days) - auto loan, Sep 2025', 'High credit utilization (68%)'],
      monthly_income: 4200,
      income_to_rent_ratio: 2.6,
      employment_verified: true,
      employer: 'Self-employed (Freelance Designer)',
      eviction_history: false,
      criminal_background: false,
      prior_landlord_references: 1,
      rental_history_years: 3,
      overall_score: 52,
      risk_level: 'medium',
      recommendation: 'approve_with_conditions',
      conditions: [
        'Require additional security deposit equal to 1 month rent',
        'Require co-signer or guarantor',
        'Proof of 3 months income documentation',
      ],
      flags: [
        'Income-to-rent ratio below 3x threshold',
        'Self-employed income may vary',
        'Recent late payment on credit report',
      ],
      summary:
        'Jennifer Chen presents a moderate risk profile. Her credit score of 618 is in the fair range with two flags: a recent 30-day late payment on an auto loan and high credit utilization at 68%. As a self-employed freelance designer earning $4,200/mo, her income-to-rent ratio of 2.6x falls below the standard 3x threshold. However, she has no eviction or criminal history and has 3 years of stable rental history. Recommend conditional approval with additional deposit and co-signer requirement.',
    },
  },
  {
    id: 'scr-003',
    applicantName: 'David Thompson',
    applicantEmail: 'd.thompson@email.com',
    propertyAddress: '1420 Oak Lane, Unit A',
    date: '2026-02-15',
    status: 'complete',
    result: {
      applicant_name: 'David Thompson',
      application_date: '2026-02-15',
      credit_score: 485,
      credit_grade: 'poor',
      credit_flags: [
        'Collections account - medical ($2,400)',
        'Late payments (60+ days) on 2 accounts',
        'Credit utilization at 92%',
        'Short credit history (2 years)',
      ],
      monthly_income: 3100,
      income_to_rent_ratio: 1.9,
      employment_verified: true,
      employer: 'Amazon Warehouse',
      eviction_history: true,
      criminal_background: false,
      prior_landlord_references: 0,
      rental_history_years: 1,
      overall_score: 22,
      risk_level: 'high',
      recommendation: 'deny',
      conditions: [],
      flags: [
        'Previous eviction on record (2024)',
        'Income-to-rent ratio well below 3x threshold',
        'Multiple derogatory marks on credit report',
        'No landlord references available',
      ],
      summary:
        'David Thompson presents a high-risk profile that does not meet minimum qualification standards. His credit score of 485 is in the poor range with multiple derogatory marks including a collections account, multiple late payments, and very high credit utilization. His income of $3,100/mo provides only a 1.9x income-to-rent ratio. Most critically, he has a prior eviction from 2024 and no landlord references. Based on these factors, application is recommended for denial.',
    },
  },
  {
    id: 'scr-004',
    applicantName: 'Priya Patel',
    applicantEmail: 'priya.p@email.com',
    propertyAddress: '835 Maple Drive',
    date: '2026-02-24',
    status: 'pending',
    result: null,
  },
  {
    id: 'scr-005',
    applicantName: 'Robert Kim',
    applicantEmail: 'r.kim@email.com',
    propertyAddress: '2100 Birch Court',
    date: '2026-01-10',
    status: 'expired',
    result: null,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green';
  if (score >= 40) return 'text-gold';
  return 'text-red';
}

function _getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-green/10 border-green/20';
  if (score >= 40) return 'bg-gold/10 border-gold/20';
  return 'bg-red/10 border-red/20';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Below Average';
  return 'Poor';
}

function getCreditBarColor(score: number | null): string {
  if (score === null) return 'bg-muted';
  if (score >= 740) return 'bg-green';
  if (score >= 670) return 'bg-gold';
  if (score >= 580) return 'bg-gold-light';
  return 'bg-red';
}

function getCreditBarWidth(score: number | null): number {
  if (score === null) return 0;
  return Math.max(0, Math.min(100, ((score - 300) / (850 - 300)) * 100));
}

function getRecommendationBadge(rec: ScreeningResult['recommendation']): {
  label: string;
  variant: 'success' | 'warning' | 'danger';
  color: string;
} {
  switch (rec) {
    case 'approve':
      return { label: 'Approve', variant: 'success', color: 'green' };
    case 'approve_with_conditions':
      return { label: 'Conditional', variant: 'warning', color: 'gold' };
    case 'deny':
      return { label: 'Decline', variant: 'danger', color: 'red' };
    default:
      return { label: 'Unknown', variant: 'warning', color: 'gold' };
  }
}

/* ------------------------------------------------------------------ */
/*  Score Ring Component                                               */
/* ------------------------------------------------------------------ */

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#C9A84C' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-bold font-display', getScoreColor(score))}>
          {score}
        </span>
        <span className="text-[10px] text-muted">/ 100</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screening Content (wrapped by FeatureGate)                         */
/* ------------------------------------------------------------------ */

function ScreeningContent() {
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedScreening, setSelectedScreening] = useState<typeof MOCK_SCREENINGS[0] | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [actionTaken, setActionTaken] = useState<Record<string, 'approved' | 'declined' | 'more_info'>>({});

  /* ---- Fetch properties ---- */

  useEffect(() => {
    async function fetchProperties() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('address');
      setProperties(data || []);
    }
    fetchProperties();
  }, [supabase]);

  /* ---- Generate application link ---- */

  function handleGenerateLink() {
    const token = Math.random().toString(36).substring(2, 15);
    setGeneratedLink(`https://app.rkvconsulting.com/apply/${token}`);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function handleResetModal() {
    setSelectedProperty('');
    setSelectedUnit('');
    setApplicantEmail('');
    setGeneratedLink('');
    setLinkCopied(false);
  }

  /* ---- Status badge ---- */

  function statusBadge(status: 'pending' | 'complete' | 'expired') {
    switch (status) {
      case 'pending':
        return { label: 'Pending', variant: 'warning' as const };
      case 'complete':
        return { label: 'Complete', variant: 'success' as const };
      case 'expired':
        return { label: 'Expired', variant: 'info' as const };
    }
  }

  /* ---- Action handlers ---- */

  function handleApprove(id: string) {
    setActionTaken((prev) => ({ ...prev, [id]: 'approved' }));
  }

  function handleDecline(id: string) {
    setActionTaken((prev) => ({ ...prev, [id]: 'declined' }));
  }

  function handleRequestMoreInfo(id: string) {
    setActionTaken((prev) => ({ ...prev, [id]: 'more_info' }));
  }

  const result = selectedScreening?.result;
  const screeningAction = selectedScreening ? actionTaken[selectedScreening.id] : undefined;

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Tenant Screening</h1>
          <p className="text-sm text-muted mt-1">Comprehensive background checks and credit screening for applicants</p>
        </div>
        <Button
          icon={<Send className="w-4 h-4" />}
          onClick={() => {
            handleResetModal();
            setSendModalOpen(true);
          }}
        >
          Send Application
        </Button>
      </div>

      {/* Integration note */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3">
        <Shield className="h-4 w-4 text-gold shrink-0" />
        <p className="text-xs text-muted">
          <span className="text-gold font-medium">Note:</span> Screening data shown below is sample data for demonstration. Production integration would connect to TransUnion SmartMove or Experian RentBureau APIs for live credit checks, background screening, and eviction history.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  SCREENING REQUESTS TABLE                                     */}
      {/* ============================================================ */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs text-muted font-medium">Applicant Name</th>
                <th className="text-left px-5 py-3 text-xs text-muted font-medium">Property</th>
                <th className="text-center px-5 py-3 text-xs text-muted font-medium">Status</th>
                <th className="text-center px-5 py-3 text-xs text-muted font-medium">Score</th>
                <th className="text-left px-5 py-3 text-xs text-muted font-medium">Date</th>
                <th className="text-right px-5 py-3 text-xs text-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SCREENINGS.map((screening) => {
                const sb = statusBadge(screening.status);
                const isSelected = selectedScreening?.id === screening.id;

                return (
                  <tr
                    key={screening.id}
                    onClick={() => screening.result && setSelectedScreening(screening)}
                    className={cn(
                      'border-b border-border/50 transition-colors',
                      screening.result ? 'cursor-pointer hover:bg-white/[0.02]' : '',
                      isSelected && 'bg-gold/5',
                    )}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border">
                          <User className="h-3.5 w-3.5 text-muted" />
                        </div>
                        <div>
                          <span className="text-white font-medium">{screening.applicantName}</span>
                          <p className="text-[10px] text-muted">{screening.applicantEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{screening.propertyAddress}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={sb.variant} size="sm">{sb.label}</Badge>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {screening.result ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={cn('text-lg font-bold font-display', getScoreColor(screening.result.overall_score))}>
                            {screening.result.overall_score}
                          </span>
                          <span className="text-[10px] text-muted">/100</span>
                        </div>
                      ) : (
                        <span className="text-muted">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{formatDate(screening.date)}</td>
                    <td className="px-5 py-3 text-right">
                      {screening.result ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedScreening(screening);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold-light transition-colors"
                        >
                          View Results
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      ) : screening.status === 'pending' ? (
                        <span className="text-xs text-muted">Awaiting response</span>
                      ) : (
                        <span className="text-xs text-muted">Expired</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  RESULTS SECTION                                              */}
      {/* ============================================================ */}
      {result && selectedScreening && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg text-white">
              Screening Results: {result.applicant_name}
            </h2>
            <button
              onClick={() => setSelectedScreening(null)}
              className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Score + Recommendation hero */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Score */}
            <Card className="flex flex-col items-center justify-center text-center py-8">
              <p className="text-xs text-muted mb-4 uppercase tracking-wider font-semibold">Overall Score</p>
              <ScoreRing score={result.overall_score} size={120} />
              <p className="text-xs text-muted mt-3">{getScoreLabel(result.overall_score)}</p>
            </Card>

            {/* Recommendation */}
            <Card className="flex flex-col items-center justify-center text-center py-8">
              <p className="text-xs text-muted mb-4 uppercase tracking-wider font-semibold">AI Recommendation</p>
              {(() => {
                const rec = getRecommendationBadge(result.recommendation);
                return (
                  <div className="flex flex-col items-center gap-3">
                    <div className={cn(
                      'flex items-center justify-center w-16 h-16 rounded-full border-2',
                      rec.variant === 'success' ? 'bg-green/10 border-green/20' :
                      rec.variant === 'warning' ? 'bg-gold/10 border-gold/20' :
                      'bg-red/10 border-red/20',
                    )}>
                      {rec.variant === 'success' && <CheckCircle className="h-8 w-8 text-green" />}
                      {rec.variant === 'warning' && <AlertTriangle className="h-8 w-8 text-gold" />}
                      {rec.variant === 'danger' && <XCircle className="h-8 w-8 text-red" />}
                    </div>
                    <Badge variant={rec.variant} size="md" className="text-sm px-4 py-1.5">
                      {rec.label}
                    </Badge>
                  </div>
                );
              })()}
              <p className="text-xs text-muted mt-3 capitalize">
                Risk Level: <span className={cn(
                  'font-medium',
                  result.risk_level === 'low' ? 'text-green'
                    : result.risk_level === 'medium' ? 'text-gold'
                      : 'text-red',
                )}>{result.risk_level}</span>
              </p>
            </Card>

            {/* Quick stats */}
            <Card className="py-8 px-6">
              <p className="text-xs text-muted mb-4 uppercase tracking-wider font-semibold text-center">Key Metrics</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Credit Score</span>
                  <span className="text-sm font-bold text-white">{result.credit_score || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Monthly Income</span>
                  <span className="text-sm font-bold text-white">
                    ${(result.monthly_income || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Income-to-Rent</span>
                  <span className={cn(
                    'text-sm font-bold',
                    (result.income_to_rent_ratio || 0) >= 3 ? 'text-green' : 'text-red',
                  )}>
                    {result.income_to_rent_ratio}x
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Rental History</span>
                  <span className="text-sm font-bold text-white">{result.rental_history_years} years</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Employer</span>
                  <span className="text-xs text-white text-right max-w-[160px] truncate">{result.employer || 'N/A'}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Detail cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Credit Score Card */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gold" />
                  <span className="font-display font-semibold text-sm text-white">Credit Score</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">{result.credit_score || 'N/A'}</span>
                  <Badge
                    variant={
                      result.credit_grade === 'excellent' || result.credit_grade === 'good'
                        ? 'success'
                        : result.credit_grade === 'fair'
                          ? 'warning'
                          : 'danger'
                    }
                    size="sm"
                    className="capitalize"
                  >
                    {result.credit_grade || 'N/A'}
                  </Badge>
                </div>

                {/* Credit gauge bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted mb-1.5">
                    <span>300</span>
                    <span>580</span>
                    <span>670</span>
                    <span>740</span>
                    <span>850</span>
                  </div>
                  <div className="h-3 bg-border rounded-full overflow-hidden relative">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        getCreditBarColor(result.credit_score),
                      )}
                      style={{ width: `${getCreditBarWidth(result.credit_score)}%` }}
                    />
                  </div>
                </div>

                {/* Credit flags */}
                {result.credit_flags.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted font-medium">Flags</p>
                    {result.credit_flags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                        <p className="text-xs text-muted">{flag}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Background Check */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gold" />
                  <span className="font-display font-semibold text-sm text-white">Background Check</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {!result.criminal_background ? (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10">
                        <Check className="h-5 w-5 text-green" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green">Clear</p>
                        <p className="text-xs text-muted">No criminal records found</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red/10">
                        <AlertTriangle className="h-5 w-5 text-red" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red">Flagged</p>
                        <p className="text-xs text-muted">Criminal record found - review details</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Eviction History */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gold" />
                  <span className="font-display font-semibold text-sm text-white">Eviction History</span>
                </div>
              }
            >
              <div className="flex items-center gap-3">
                {!result.eviction_history ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10">
                      <Check className="h-5 w-5 text-green" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green">None Found</p>
                      <p className="text-xs text-muted">No eviction records in database</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red/10">
                      <AlertTriangle className="h-5 w-5 text-red" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red">Eviction on Record</p>
                      <p className="text-xs text-muted">Previous eviction found - high risk factor</p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Income Verification */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gold" />
                  <span className="font-display font-semibold text-sm text-white">Income Verification</span>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-muted">Monthly Income</span>
                  <span className="text-sm font-semibold text-white">
                    ${(result.monthly_income || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted">Income-to-Rent Ratio</span>
                  <span className={cn(
                    'text-sm font-semibold',
                    (result.income_to_rent_ratio || 0) >= 3 ? 'text-green' : 'text-red',
                  )}>
                    {result.income_to_rent_ratio}x
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted">Employment Verified</span>
                  <Badge variant={result.employment_verified ? 'success' : 'danger'} size="sm">
                    {result.employment_verified ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted">Employer</span>
                  <span className="text-sm text-white">{result.employer || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-xs text-muted">3x Income Check</span>
                  <Badge variant={(result.income_to_rent_ratio || 0) >= 3 ? 'success' : 'danger'} size="sm">
                    {(result.income_to_rent_ratio || 0) >= 3 ? 'Pass' : 'Fail'}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* AI Recommendation - full width */}
            <Card
              className="md:col-span-2"
              header={
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-gold" />
                  <span className="font-display font-semibold text-sm text-white">AI Recommendation</span>
                </div>
              }
            >
              <p className="text-sm text-muted leading-relaxed">{result.summary}</p>

              {/* Conditions */}
              {result.conditions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-gold mb-2">Conditions for Approval</p>
                  <ul className="space-y-1.5">
                    {result.conditions.map((cond, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted">
                        <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                        {cond}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Flags */}
              {result.flags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-red mb-2">Risk Flags</p>
                  <ul className="space-y-1.5">
                    {result.flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted">
                        <AlertTriangle className="h-3.5 w-3.5 text-red shrink-0 mt-0.5" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-border">
                {screeningAction ? (
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={screeningAction === 'approved' ? 'success' : screeningAction === 'declined' ? 'danger' : 'warning'}
                      size="md"
                      dot
                    >
                      {screeningAction === 'approved' && 'Application Approved'}
                      {screeningAction === 'declined' && 'Application Declined'}
                      {screeningAction === 'more_info' && 'More Information Requested'}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle className="h-3.5 w-3.5" />}
                      onClick={() => handleApprove(selectedScreening.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<HelpCircle className="h-3.5 w-3.5" />}
                      onClick={() => handleRequestMoreInfo(selectedScreening.id)}
                    >
                      Request More Info
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<XCircle className="h-3.5 w-3.5" />}
                      onClick={() => handleDecline(selectedScreening.id)}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  SEND APPLICATION MODAL                                       */}
      {/* ============================================================ */}
      <Modal open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <ModalContent maxWidth="lg">
          <ModalHeader
            title="Send Screening Application"
            description="Generate a unique application link for a prospective tenant. They will complete the form online."
          />
          <div className="px-6 py-4 space-y-5">
            {/* Property selector + applicant email */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Property"
                placeholder="Select a property"
                value={selectedProperty}
                onChange={(e) => {
                  setSelectedProperty(e.target.value);
                  setSelectedUnit('');
                  setGeneratedLink('');
                }}
                options={properties.map((p) => ({
                  value: p.id,
                  label: `${p.address}, ${p.city}`,
                }))}
              />
              <Input
                label="Unit (optional)"
                placeholder="e.g., Unit A, #204"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
              />
            </div>

            <Input
              label="Applicant Email"
              placeholder="applicant@email.com"
              type="email"
              value={applicantEmail}
              onChange={(e) => setApplicantEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
            />

            {/* Generate button */}
            <Button
              onClick={handleGenerateLink}
              disabled={!selectedProperty}
              icon={<Send className="w-4 h-4" />}
            >
              Generate Application Link
            </Button>

            {/* Generated link */}
            {generatedLink && (
              <div className="flex items-center gap-3 p-3 bg-deep rounded-lg border border-gold/20">
                <ExternalLink className="h-4 w-4 text-gold shrink-0" />
                <code className="text-sm text-gold flex-1 truncate font-mono">
                  {generatedLink}
                </code>
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    linkCopied
                      ? 'text-green bg-green/10'
                      : 'text-muted hover:text-white hover:bg-white/5',
                  )}
                >
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}

            {/* Application form preview */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-deep px-5 py-3 border-b border-border">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Application Form Preview
                </p>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted">
                  The applicant will be asked to complete the following:
                </p>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { section: 'Personal Information', fields: 'Full name, email, phone, date of birth, SSN, current address' },
                    { section: 'Employment', fields: 'Employer name, position, monthly income, employment length' },
                    { section: 'Rental History', fields: 'Previous addresses, landlord contact info, reason for leaving' },
                    { section: 'References', fields: 'Two personal or professional references with contact details' },
                  ].map((item) => (
                    <div key={item.section}>
                      <p className="text-xs font-semibold text-white mb-1">{item.section}</p>
                      <p className="text-xs text-muted">{item.fields}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 p-3 bg-card rounded-lg border border-border mt-2">
                  <Shield className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white">Consent Checkbox</p>
                    <p className="text-xs text-muted">
                      &quot;I authorize RKV Consulting and its partners to conduct a background check, credit check, and verify information provided in this application.&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setSendModalOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page (wrapped with FeatureGate)                                    */
/* ------------------------------------------------------------------ */

export default function TenantScreeningPage() {
  return (
    <FeatureGate feature="tenantScreening">
      <ScreeningContent />
    </FeatureGate>
  );
}
