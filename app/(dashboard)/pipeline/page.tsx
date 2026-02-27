'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import type { Deal, DealAnalysisResult } from '@/types';
import {
  Plus,
  Search,
  X,
  ChevronDown,
  Building2,
  Clock,
  Target,
  Award,
  BarChart3,
  Calendar,
  Phone,
  Mail,
  User,
  FileText,
  CheckSquare,
  Square,
  ArrowRight,
  Briefcase,
  Zap,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/* ================================================================== */
/*  CONSTANTS & TYPES                                                  */
/* ================================================================== */

/** Pipeline column definitions */
const PIPELINE_COLUMNS = [
  { key: 'lead' as const, label: 'WATCHING', color: '#4A6080' },
  { key: 'analyzing' as const, label: 'ANALYZING', color: '#0EA5E9' },
  { key: 'offer_sent' as const, label: 'OFFER SENT', color: '#D97706' },
  { key: 'under_contract' as const, label: 'UNDER CONTRACT', color: '#059669' },
  { key: 'due_diligence' as const, label: 'DUE DILIGENCE', color: '#8B5CF6' },
  { key: 'closing' as const, label: 'CLOSING', color: '#EC4899' },
  { key: 'closed' as const, label: 'CLOSED', color: '#10B981' },
  { key: 'dead' as const, label: 'PASSED', color: '#DC2626' },
] as const;

type PipelineStage = typeof PIPELINE_COLUMNS[number]['key'];

/** Extended deal type with virtual "closing" stage */
type PipelineDeal = Omit<Deal, 'stage'> & {
  stage: PipelineStage;
};

/** Stage ordering for "move to next" */
const STAGE_ORDER: PipelineStage[] = [
  'lead', 'analyzing', 'offer_sent', 'under_contract', 'due_diligence', 'closing', 'closed',
];

/** Property type labels */
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  single_family: 'SFR',
  multi_family: 'Multi-Family',
  condo: 'Condo',
  townhouse: 'Townhouse',
  commercial: 'Commercial',
  land: 'Land',
  mixed_use: 'Mixed Use',
};

/** Source options for deal form */
const SOURCE_OPTIONS = [
  { value: '', label: 'Select source...' },
  { value: 'MLS', label: 'MLS' },
  { value: 'Wholesaler', label: 'Wholesaler' },
  { value: 'Direct Mail', label: 'Direct Mail' },
  { value: 'Driving for Dollars', label: 'Driving for Dollars' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Other', label: 'Other' },
];

/** Property type options */
const PROPERTY_TYPE_OPTIONS = [
  { value: '', label: 'Select type...' },
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
  { value: 'mixed_use', label: 'Mixed Use' },
];

/** Priority options */
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

/** Checklists for specific stages */
const UNDER_CONTRACT_CHECKLIST = [
  'Schedule inspection',
  'Order title search',
  'Get insurance quote',
  'Confirm financing',
  'Review contract terms',
];

const DUE_DILIGENCE_CHECKLIST = [
  'Property inspection complete',
  'Title search clear',
  'Insurance binder obtained',
  'Financing approved',
  'Environmental report',
  'Survey complete',
];

/* ================================================================== */
/*  UTILITY FUNCTIONS                                                  */
/* ================================================================== */

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number | null | undefined): string {
  if (value == null) return '--';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return formatCurrency(value);
}

function daysInStage(deal: PipelineDeal): number {
  const updated = new Date(deal.updated_at);
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

function daysSinceCreated(deal: PipelineDeal): number {
  const created = new Date(deal.created_at);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function getScoreBadge(score: number): { variant: 'success' | 'warning' | 'danger'; label: string } {
  if (score >= 70) return { variant: 'success', label: 'Strong' };
  if (score >= 50) return { variant: 'warning', label: 'Fair' };
  return { variant: 'danger', label: 'Weak' };
}

function getGradeFromScore(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

function getNextStage(current: PipelineStage): PipelineStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

function mapStageToDb(stage: PipelineStage): Deal['stage'] {
  if (stage === 'closing') return 'due_diligence';
  return stage;
}

/* ================================================================== */
/*  INLINE SUB-COMPONENTS                                              */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/*  StatCard                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  subtext,
  icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-4 py-3 min-w-[160px]"
      style={{
        background: '#0C1018',
        border: `1px solid ${accent ? 'rgba(5, 150, 105, 0.3)' : '#161E2A'}`,
      }}
    >
      {icon && (
        <div className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg shrink-0',
          accent ? 'bg-gold/10 text-gold' : 'bg-muted/10 text-muted',
        )}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-body text-muted whitespace-nowrap">{label}</p>
        <p className={cn(
          'font-mono text-lg font-bold leading-tight',
          accent ? 'text-gold' : 'text-white',
        )}>
          {value}
        </p>
        {subtext && (
          <p className="text-[10px] font-body text-muted mt-0.5">{subtext}</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DealCard (Kanban card)                                             */
/* ------------------------------------------------------------------ */

function DealCard({
  deal,
  onClick,
  onDragStart,
}: {
  deal: PipelineDeal;
  onClick: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  const days = daysInStage(deal);
  const analysis = deal.analysis as DealAnalysisResult | null;
  const score = analysis?.score ?? null;
  const grade = analysis?.grade ?? (score != null ? getGradeFromScore(score) : null);

  const priorityColor =
    deal.priority === 'high'
      ? '#DC2626'
      : deal.priority === 'medium'
        ? '#D97706'
        : '#059669';

  const displayAddress = deal.address
    ? deal.address.length > 28
      ? deal.address.slice(0, 28) + '...'
      : deal.address
    : `Off-Market \u2014 ${deal.city}`;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        'group rounded-lg p-3 cursor-pointer select-none',
        'transition-all duration-200 ease-out',
        'hover:scale-[1.01] hover:shadow-card',
        'active:scale-[0.99]',
      )}
      style={{
        background: '#0F1620',
        border: '1px solid #161E2A',
      }}
    >
      {/* Priority dot + address */}
      <div className="flex items-start gap-2 mb-2">
        <span
          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
          style={{ backgroundColor: priorityColor }}
        />
        <p className="font-body text-[13px] text-white font-medium leading-tight flex-1 min-w-0">
          {displayAddress}
        </p>
      </div>

      {/* Asking price */}
      <p className="font-mono font-bold text-gold text-base mb-2">
        {formatCompactCurrency(deal.asking_price)}
      </p>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {/* AI Score */}
        {score != null && (
          <Badge variant={getScoreBadge(score).variant} size="sm">
            {score} {grade}
          </Badge>
        )}

        {/* Property type */}
        <Badge variant="muted" size="sm">
          {PROPERTY_TYPE_LABELS[deal.property_type] || deal.property_type}
        </Badge>

        {/* Source */}
        {deal.source && (
          <Badge variant="muted" size="sm">
            {deal.source}
          </Badge>
        )}
      </div>

      {/* Days in stage */}
      <p className="text-[11px] font-body text-muted">
        {days === 0 ? 'Added today' : `${days}d in stage`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KanbanColumn                                                       */
/* ------------------------------------------------------------------ */

function KanbanColumn({
  column,
  deals,
  onDealClick,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  column: typeof PIPELINE_COLUMNS[number];
  deals: PipelineDeal[];
  onDealClick: (deal: PipelineDeal) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, dealId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, stage: PipelineStage) => void;
  isDragOver: boolean;
}) {
  const totalValue = deals.reduce((sum, d) => sum + (d.asking_price || 0), 0);

  return (
    <div
      className={cn(
        'flex flex-col shrink-0 w-[280px] rounded-lg transition-all duration-200',
        isDragOver && 'ring-1 ring-gold/40',
      )}
      style={{
        background: '#0C1018',
        border: `1px solid ${isDragOver ? 'rgba(5, 150, 105, 0.4)' : '#161E2A'}`,
        minHeight: '400px',
      }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.key)}
    >
      {/* Column header */}
      <div className="px-3 py-3 border-b" style={{ borderColor: '#161E2A' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-white">
              {column.label}
            </span>
          </div>
          <span
            className="font-mono text-[11px] font-medium px-1.5 py-0.5 rounded"
            style={{
              color: column.color,
              background: `${column.color}15`,
              border: `1px solid ${column.color}30`,
            }}
          >
            {deals.length}
          </span>
        </div>
        {deals.length > 0 && (
          <p className="font-mono text-[10px] text-muted">
            {formatCompactCurrency(totalValue)} total
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin">
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onClick={() => onDealClick(deal)}
            onDragStart={(e) => onDragStart(e, deal.id)}
          />
        ))}
        {deals.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[11px] font-body text-muted-deep">No deals</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChecklistItem                                                      */
/* ------------------------------------------------------------------ */

function ChecklistItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left',
        'transition-colors duration-150',
        'hover:bg-white/[0.03]',
      )}
    >
      {checked ? (
        <CheckSquare className="w-4 h-4 text-gold shrink-0" strokeWidth={1.5} />
      ) : (
        <Square className="w-4 h-4 text-muted shrink-0" strokeWidth={1.5} />
      )}
      <span
        className={cn(
          'font-body text-[13px]',
          checked ? 'text-muted line-through' : 'text-white',
        )}
      >
        {label}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  DetailPanel                                                        */
/* ------------------------------------------------------------------ */

function DetailPanel({
  deal,
  onClose,
  onStageChange,
  onNotesUpdate,
  checklists,
  onChecklistToggle,
}: {
  deal: PipelineDeal;
  onClose: () => void;
  onStageChange: (dealId: string, newStage: PipelineStage) => void;
  onNotesUpdate: (dealId: string, notes: string) => void;
  checklists: Record<string, Record<string, boolean>>;
  onChecklistToggle: (dealId: string, item: string) => void;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(deal.notes || '');
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const analysis = deal.analysis as DealAnalysisResult | null;
  const score = analysis?.score ?? null;
  const grade = analysis?.grade ?? (score != null ? getGradeFromScore(score) : null);
  const days = daysSinceCreated(deal);
  const stageLabel = PIPELINE_COLUMNS.find((c) => c.key === deal.stage)?.label || deal.stage;
  const stageColor = PIPELINE_COLUMNS.find((c) => c.key === deal.stage)?.color || '#4A6080';

  const nextStage = getNextStage(deal.stage);
  const nextStageLabel = nextStage
    ? PIPELINE_COLUMNS.find((c) => c.key === nextStage)?.label
    : null;

  const showChecklist = deal.stage === 'under_contract' || deal.stage === 'due_diligence';
  const checklistItems =
    deal.stage === 'under_contract'
      ? UNDER_CONTRACT_CHECKLIST
      : deal.stage === 'due_diligence'
        ? DUE_DILIGENCE_CHECKLIST
        : [];

  const dealChecklist = checklists[deal.id] || {};

  useEffect(() => {
    setNotesValue(deal.notes || '');
    setEditingNotes(false);
  }, [deal.id, deal.notes]);

  function handleSaveNotes() {
    onNotesUpdate(deal.id, notesValue);
    setEditingNotes(false);
  }

  return (
    <div
      className="fixed top-0 right-0 w-full sm:w-[480px] h-screen z-50 flex flex-col animate-slide-in-right"
      style={{
        background: '#0C1018',
        borderLeft: '1px solid #161E2A',
        boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#161E2A' }}>
        <div className="flex-1 min-w-0 mr-3">
          <h2 className="font-display font-bold text-white text-base truncate">
            {deal.address || deal.title}
          </h2>
          <p className="font-body text-[12px] text-muted mt-0.5">
            {deal.city}, {deal.state} {deal.zip}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors shrink-0"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Stage badge with dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-body font-semibold uppercase tracking-wider transition-colors hover:bg-white/5"
              style={{
                color: stageColor,
                background: `${stageColor}15`,
                border: `1px solid ${stageColor}30`,
              }}
            >
              {stageLabel}
              <ChevronDown className="w-3 h-3" />
            </button>

            {stageDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-10 w-56 rounded-lg shadow-card overflow-hidden"
                style={{ background: '#0C1018', border: '1px solid #161E2A' }}
              >
                {PIPELINE_COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => {
                      onStageChange(deal.id, col.key);
                      setStageDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] font-body',
                      'transition-colors hover:bg-white/5',
                      deal.stage === col.key ? 'text-white bg-white/[0.03]' : 'text-muted',
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                    {col.label}
                    {deal.stage === col.key && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-gold ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg p-3" style={{ background: '#0F1620', border: '1px solid #161E2A' }}>
              <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-1">Asking</p>
              <p className="font-mono text-sm font-bold text-gold">{formatCurrency(deal.asking_price)}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0F1620', border: '1px solid #161E2A' }}>
              <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-1">Offer</p>
              <p className="font-mono text-sm font-bold text-white">{formatCurrency(deal.offer_price)}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0F1620', border: '1px solid #161E2A' }}>
              <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-1">ARV</p>
              <p className="font-mono text-sm font-bold text-white">{formatCurrency(deal.arv)}</p>
            </div>
          </div>

          {/* Repair cost & rent estimate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ background: '#0F1620', border: '1px solid #161E2A' }}>
              <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-1">Repair Cost</p>
              <p className="font-mono text-sm font-bold text-white">{formatCurrency(deal.repair_cost)}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0F1620', border: '1px solid #161E2A' }}>
              <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-1">Mo. Rent Est.</p>
              <p className="font-mono text-sm font-bold text-white">{formatCurrency(deal.monthly_rent_estimate)}</p>
            </div>
          </div>

          {/* AI Analysis summary */}
          {analysis && score != null && (
            <div
              className="rounded-lg p-4"
              style={{ background: '#0F1620', border: '1px solid #161E2A' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-wider font-body text-muted">AI Analysis</p>
                <Badge variant={getScoreBadge(score).variant} size="sm">
                  {score}/100 {grade}
                </Badge>
              </div>

              {/* Recommendation */}
              {analysis.recommendation && (
                <div className="mb-3">
                  <Badge
                    variant={
                      analysis.recommendation === 'strong_buy' || analysis.recommendation === 'buy'
                        ? 'success'
                        : analysis.recommendation === 'hold'
                          ? 'warning'
                          : 'danger'
                    }
                    size="sm"
                  >
                    {analysis.recommendation.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              )}

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                {analysis.cap_rate != null && (
                  <div>
                    <span className="text-muted font-body">Cap Rate</span>
                    <span className="ml-2 font-mono text-white">{analysis.cap_rate.toFixed(1)}%</span>
                  </div>
                )}
                {analysis.cash_on_cash_return != null && (
                  <div>
                    <span className="text-muted font-body">CoC Return</span>
                    <span className="ml-2 font-mono text-white">{analysis.cash_on_cash_return.toFixed(1)}%</span>
                  </div>
                )}
                {analysis.monthly_cash_flow != null && (
                  <div>
                    <span className="text-muted font-body">Mo. CF</span>
                    <span className="ml-2 font-mono text-white">{formatCurrency(analysis.monthly_cash_flow)}</span>
                  </div>
                )}
                {analysis.noi != null && (
                  <div>
                    <span className="text-muted font-body">NOI</span>
                    <span className="ml-2 font-mono text-white">{formatCurrency(analysis.noi)}</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              {analysis.summary && (
                <p className="mt-3 text-[12px] font-body text-muted leading-relaxed">
                  {analysis.summary}
                </p>
              )}
            </div>
          )}

          {/* Stage checklist */}
          {showChecklist && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: '#0F1620', border: '1px solid #161E2A' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: '#161E2A' }}>
                <p className="text-[10px] uppercase tracking-wider font-body text-muted">
                  {deal.stage === 'under_contract' ? 'Under Contract' : 'Due Diligence'} Checklist
                </p>
                <p className="text-[11px] font-mono text-gold mt-0.5">
                  {Object.values(dealChecklist).filter(Boolean).length}/{checklistItems.length} complete
                </p>
              </div>
              <div className="py-1">
                {checklistItems.map((item) => (
                  <ChecklistItem
                    key={item}
                    label={item}
                    checked={!!dealChecklist[item]}
                    onChange={() => onChecklistToggle(deal.id, item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Activity timeline */}
          <div
            className="rounded-lg p-4"
            style={{ background: '#0F1620', border: '1px solid #161E2A' }}
          >
            <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-3">Activity</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-body text-white">
                    Moved to {stageLabel}
                  </p>
                  <p className="text-[10px] font-body text-muted">
                    {new Date(deal.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-muted mt-1.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-body text-white">Deal created</p>
                  <p className="text-[10px] font-body text-muted">
                    {new Date(deal.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {' '}({days}d ago)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div
            className="rounded-lg p-4"
            style={{ background: '#0F1620', border: '1px solid #161E2A' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider font-body text-muted">Notes</p>
              {!editingNotes && (
                <button
                  type="button"
                  onClick={() => setEditingNotes(true)}
                  className="text-[11px] font-body text-gold hover:text-gold-light transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="w-full h-24 bg-transparent text-white text-[13px] font-body rounded-lg p-2 resize-y focus:outline-none focus:ring-1 focus:ring-gold/30"
                  style={{ border: '1px solid #161E2A', backgroundColor: '#080B0F' }}
                  placeholder="Add notes about this deal..."
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSaveNotes}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingNotes(false); setNotesValue(deal.notes || ''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] font-body text-muted leading-relaxed whitespace-pre-wrap">
                {deal.notes || 'No notes yet.'}
              </p>
            )}
          </div>

          {/* Contact info */}
          {(deal.agent_name || deal.agent_phone || deal.agent_email) && (
            <div
              className="rounded-lg p-4"
              style={{ background: '#0F1620', border: '1px solid #161E2A' }}
            >
              <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-3">Contact</p>
              <div className="space-y-2">
                {deal.agent_name && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <User className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={1.5} />
                    <span className="font-body text-white">{deal.agent_name}</span>
                  </div>
                )}
                {deal.agent_phone && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <Phone className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={1.5} />
                    <a href={`tel:${deal.agent_phone}`} className="font-body text-gold hover:text-gold-light transition-colors">
                      {deal.agent_phone}
                    </a>
                  </div>
                )}
                {deal.agent_email && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <Mail className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={1.5} />
                    <a href={`mailto:${deal.agent_email}`} className="font-body text-gold hover:text-gold-light transition-colors truncate">
                      {deal.agent_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Follow-up date */}
          <div
            className="rounded-lg p-4"
            style={{ background: '#0F1620', border: '1px solid #161E2A' }}
          >
            <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-2">Set Follow-up</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="flex-1 h-9 bg-transparent text-white text-[13px] font-body rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-gold/30"
                style={{ border: '1px solid #161E2A', backgroundColor: '#080B0F', colorScheme: 'dark' }}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (followUpDate) {
                    toast.success(`Follow-up set for ${new Date(followUpDate).toLocaleDateString()}`);
                  }
                }}
                disabled={!followUpDate}
              >
                <Calendar className="w-3.5 h-3.5" />
                Set
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 border-t space-y-2" style={{ borderColor: '#161E2A' }}>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => toast.info('AI analysis queued. Results will appear shortly.')}
            icon={<Zap className="w-3.5 h-3.5" />}
          >
            Run AI Analysis
          </Button>
          {nextStage && nextStageLabel && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onStageChange(deal.id, nextStage)}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Move to {nextStageLabel}
            </Button>
          )}
        </div>
        {deal.stage === 'closed' && (
          <Button
            size="sm"
            variant="solid"
            fullWidth
            onClick={() => toast.success('Deal added to portfolio!')}
            icon={<Building2 className="w-3.5 h-3.5" />}
          >
            Add to Portfolio
          </Button>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  ADD DEAL MODAL                                                     */
/* ================================================================== */

interface AddDealForm {
  address: string;
  city: string;
  state: string;
  zip: string;
  asking_price: string;
  property_type: string;
  source: string;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  notes: string;
  priority: string;
}

const INITIAL_FORM: AddDealForm = {
  address: '',
  city: '',
  state: '',
  zip: '',
  asking_price: '',
  property_type: 'single_family',
  source: '',
  agent_name: '',
  agent_phone: '',
  agent_email: '',
  notes: '',
  priority: 'medium',
};

function AddDealModal({
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (form: AddDealForm) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<AddDealForm>(INITIAL_FORM);

  useEffect(() => {
    if (open) setForm(INITIAL_FORM);
  }, [open]);

  function update(key: keyof AddDealForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="lg">
        <form onSubmit={handleSubmit}>
          <ModalHeader
            title="Add Deal"
            description="Add a new property to your investment pipeline."
          />

          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Address */}
            <Input
              label="Property Address"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="123 Main St"
              required
            />

            {/* City / State / Zip */}
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="City"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="Phoenix"
                required
              />
              <Input
                label="State"
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                placeholder="AZ"
                required
              />
              <Input
                label="Zip"
                value={form.zip}
                onChange={(e) => update('zip', e.target.value)}
                placeholder="85001"
                required
              />
            </div>

            {/* Asking price */}
            <Input
              label="Asking Price"
              type="number"
              value={form.asking_price}
              onChange={(e) => update('asking_price', e.target.value)}
              placeholder="250000"
              required
            />

            {/* Property type & Source */}
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Property Type"
                options={PROPERTY_TYPE_OPTIONS.slice(1)}
                value={form.property_type}
                onChange={(e) => update('property_type', e.target.value)}
              />
              <Select
                label="Source"
                options={SOURCE_OPTIONS}
                value={form.source}
                onChange={(e) => update('source', e.target.value)}
                placeholder="Select source..."
              />
            </div>

            {/* Agent info */}
            <Input
              label="Agent / Wholesaler Name"
              value={form.agent_name}
              onChange={(e) => update('agent_name', e.target.value)}
              placeholder="Jane Doe"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Agent Phone"
                value={form.agent_phone}
                onChange={(e) => update('agent_phone', e.target.value)}
                placeholder="(480) 555-1234"
              />
              <Input
                label="Agent Email"
                value={form.agent_email}
                onChange={(e) => update('agent_email', e.target.value)}
                placeholder="agent@example.com"
              />
            </div>

            {/* Priority */}
            <Select
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={form.priority}
              onChange={(e) => update('priority', e.target.value)}
            />

            {/* Notes */}
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Any initial notes about this deal..."
              className="min-h-[80px]"
            />
          </div>

          <ModalFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" size="sm" loading={saving}>
              Add Deal
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

/* ================================================================== */
/*  MAIN PAGE COMPONENT                                                */
/* ================================================================== */

export default function PipelinePage() {
  /* ---------------------------------------------------------------- */
  /*  State                                                            */
  /* ---------------------------------------------------------------- */
  const supabase = createClient();

  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPropertyType, setFilterPropertyType] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Drag and drop
  const [_draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<PipelineStage | null>(null);

  // Add deal modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detail panel
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);

  // Checklists stored locally
  const [checklists, setChecklists] = useState<Record<string, Record<string, boolean>>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rkv_pipeline_checklists');
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  /* ---------------------------------------------------------------- */
  /*  Persist checklists                                               */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rkv_pipeline_checklists', JSON.stringify(checklists));
    }
  }, [checklists]);

  /* ---------------------------------------------------------------- */
  /*  Fetch deals                                                      */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    async function fetchDeals() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching deals:', error);
        toast.error('Failed to load deals');
      } else {
        setDeals((data || []) as PipelineDeal[]);
      }
      setLoading(false);
    }
    fetchDeals();
  }, [supabase]);

  /* ---------------------------------------------------------------- */
  /*  Filtered deals                                                   */
  /* ---------------------------------------------------------------- */
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          (deal.address?.toLowerCase().includes(q)) ||
          (deal.title?.toLowerCase().includes(q)) ||
          (deal.city?.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      // Property type
      if (filterPropertyType && deal.property_type !== filterPropertyType) return false;
      // Source
      if (filterSource && deal.source !== filterSource) return false;
      // Priority
      if (filterPriority && deal.priority !== filterPriority) return false;
      return true;
    });
  }, [deals, searchQuery, filterPropertyType, filterSource, filterPriority]);

  /* ---------------------------------------------------------------- */
  /*  Analytics                                                        */
  /* ---------------------------------------------------------------- */
  const analytics = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const watching = deals.filter((d) => d.stage === 'lead').length;
    const analyzing = deals.filter((d) => d.stage === 'analyzing').length;
    const underContract = deals.filter((d) => d.stage === 'under_contract' || d.stage === 'due_diligence').length;

    const closedDeals = deals.filter((d) => d.stage === 'closed');
    const closedThisYear = closedDeals.filter((d) => {
      const closeDate = d.close_date ? new Date(d.close_date) : new Date(d.updated_at);
      return closeDate >= yearStart;
    }).length;

    const passed = deals.filter((d) => d.stage === 'dead').length;

    // Avg days to close (for closed deals)
    const closedWithDays = closedDeals.map((d) => {
      const created = new Date(d.created_at);
      const closed = d.close_date ? new Date(d.close_date) : new Date(d.updated_at);
      return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    });
    const avgDaysToClose = closedWithDays.length > 0
      ? Math.round(closedWithDays.reduce((a, b) => a + b, 0) / closedWithDays.length)
      : 0;

    // Win rate
    const totalCompleted = closedDeals.length + passed;
    const winRate = totalCompleted > 0
      ? Math.round((closedDeals.length / totalCompleted) * 100)
      : 0;

    return {
      watching,
      analyzing,
      underContract,
      closedThisYear,
      passed,
      avgDaysToClose,
      winRate,
    };
  }, [deals]);

  /* ---------------------------------------------------------------- */
  /*  Deals grouped by column                                          */
  /* ---------------------------------------------------------------- */
  const dealsByColumn = useMemo(() => {
    const map: Record<PipelineStage, PipelineDeal[]> = {
      lead: [],
      analyzing: [],
      offer_sent: [],
      under_contract: [],
      due_diligence: [],
      closing: [],
      closed: [],
      dead: [],
    };
    filteredDeals.forEach((deal) => {
      const stage = deal.stage as PipelineStage;
      if (map[stage]) {
        map[stage].push(deal);
      } else {
        map.lead.push(deal);
      }
    });
    return map;
  }, [filteredDeals]);

  /* ---------------------------------------------------------------- */
  /*  Drag and drop handlers                                           */
  /* ---------------------------------------------------------------- */
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dealId: string) => {
      setDraggedDealId(dealId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dealId);
      // Add opacity to dragged element
      const el = e.currentTarget;
      requestAnimationFrame(() => {
        el.style.opacity = '0.5';
      });
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, stage: PipelineStage) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumn(stage);
    },
    [],
  );

  const _handleDragEnd = useCallback(() => {
    setDraggedDealId(null);
    setDragOverColumn(null);
  }, []);

  useEffect(() => {
    function onDragEnd() {
      setDraggedDealId(null);
      setDragOverColumn(null);
      // Reset opacity on all draggable elements
      document.querySelectorAll('[draggable="true"]').forEach((el) => {
        (el as HTMLElement).style.opacity = '1';
      });
    }
    document.addEventListener('dragend', onDragEnd);
    return () => document.removeEventListener('dragend', onDragEnd);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, newStage: PipelineStage) => {
      e.preventDefault();
      const dealId = e.dataTransfer.getData('text/plain');
      if (!dealId) return;

      setDragOverColumn(null);
      setDraggedDealId(null);

      const deal = deals.find((d) => d.id === dealId);
      if (!deal || deal.stage === newStage) return;

      // Optimistic update
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId
            ? { ...d, stage: newStage, updated_at: new Date().toISOString() }
            : d,
        ),
      );

      // Update selected deal if open
      if (selectedDeal?.id === dealId) {
        setSelectedDeal((prev) =>
          prev ? { ...prev, stage: newStage, updated_at: new Date().toISOString() } : prev,
        );
      }

      // Persist to Supabase
      const dbStage = mapStageToDb(newStage);
      const updateData: Record<string, unknown> = {
        stage: dbStage,
        updated_at: new Date().toISOString(),
      };
      if (newStage === 'closed') {
        updateData.close_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId);

      if (error) {
        console.error('Error updating deal stage:', error);
        toast.error('Failed to update deal stage');
        // Revert
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? deal : d)),
        );
      } else {
        const columnLabel = PIPELINE_COLUMNS.find((c) => c.key === newStage)?.label || newStage;
        toast.success(`Deal moved to ${columnLabel}`);
      }
    },
    [deals, selectedDeal, supabase],
  );

  /* ---------------------------------------------------------------- */
  /*  Stage change from detail panel                                   */
  /* ---------------------------------------------------------------- */
  const handleStageChange = useCallback(
    async (dealId: string, newStage: PipelineStage) => {
      const deal = deals.find((d) => d.id === dealId);
      if (!deal || deal.stage === newStage) return;

      // Optimistic update
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId
            ? { ...d, stage: newStage, updated_at: new Date().toISOString() }
            : d,
        ),
      );
      if (selectedDeal?.id === dealId) {
        setSelectedDeal((prev) =>
          prev ? { ...prev, stage: newStage, updated_at: new Date().toISOString() } : prev,
        );
      }

      const dbStage = mapStageToDb(newStage);
      const updateData: Record<string, unknown> = {
        stage: dbStage,
        updated_at: new Date().toISOString(),
      };
      if (newStage === 'closed') {
        updateData.close_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId);

      if (error) {
        toast.error('Failed to update stage');
        setDeals((prev) => prev.map((d) => (d.id === dealId ? deal : d)));
      } else {
        const label = PIPELINE_COLUMNS.find((c) => c.key === newStage)?.label || newStage;
        toast.success(`Moved to ${label}`);
      }
    },
    [deals, selectedDeal, supabase],
  );

  /* ---------------------------------------------------------------- */
  /*  Notes update                                                     */
  /* ---------------------------------------------------------------- */
  const handleNotesUpdate = useCallback(
    async (dealId: string, notes: string) => {
      // Optimistic
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, notes } : d)));
      if (selectedDeal?.id === dealId) {
        setSelectedDeal((prev) => (prev ? { ...prev, notes } : prev));
      }

      const { error } = await supabase
        .from('deals')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', dealId);

      if (error) {
        toast.error('Failed to save notes');
      } else {
        toast.success('Notes saved');
      }
    },
    [selectedDeal, supabase],
  );

  /* ---------------------------------------------------------------- */
  /*  Checklist toggle                                                 */
  /* ---------------------------------------------------------------- */
  const handleChecklistToggle = useCallback((dealId: string, item: string) => {
    setChecklists((prev) => {
      const dealChecks = prev[dealId] || {};
      return {
        ...prev,
        [dealId]: {
          ...dealChecks,
          [item]: !dealChecks[item],
        },
      };
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Add deal                                                         */
  /* ---------------------------------------------------------------- */
  const handleAddDeal = useCallback(
    async (form: AddDealForm) => {
      if (!userId) {
        toast.error('Not authenticated');
        return;
      }
      setSaving(true);

      const newDeal = {
        user_id: userId,
        title: form.address,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        asking_price: parseFloat(form.asking_price) || 0,
        property_type: form.property_type || 'single_family',
        source: form.source || null,
        agent_name: form.agent_name || null,
        agent_phone: form.agent_phone || null,
        agent_email: form.agent_email || null,
        notes: form.notes || null,
        priority: form.priority || 'medium',
        stage: 'lead',
      };

      const { data, error } = await supabase
        .from('deals')
        .insert(newDeal)
        .select()
        .single();

      setSaving(false);

      if (error) {
        console.error('Error adding deal:', error);
        toast.error('Failed to add deal');
      } else if (data) {
        setDeals((prev) => [data as PipelineDeal, ...prev]);
        setAddModalOpen(false);
        toast.success('Deal added! Run AI analysis?');
      }
    },
    [userId, supabase],
  );

  /* ---------------------------------------------------------------- */
  /*  Source options for filter (derived from data)                     */
  /* ---------------------------------------------------------------- */
  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    deals.forEach((d) => {
      if (d.source) sources.add(d.source);
    });
    return [
      { value: '', label: 'All Sources' },
      ...Array.from(sources)
        .sort()
        .map((s) => ({ value: s, label: s })),
    ];
  }, [deals]);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  /* Loading state */
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton analytics */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} variant="card" width="160px" height="80px" />
          ))}
        </div>
        {/* Skeleton columns */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[280px]">
              <Skeleton variant="card" height="500px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/*  PAGE HEADER                                                  */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-white tracking-tight">
            Deal Pipeline
          </h1>
          <p className="font-body text-[13px] text-muted mt-0.5">
            Track and manage your investment pipeline
          </p>
        </div>
        <Button
          size="sm"
          variant="solid"
          onClick={() => setAddModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Deal
        </Button>
      </div>

      {/* ============================================================ */}
      {/*  ANALYTICS BAR                                                */}
      {/* ============================================================ */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        <StatCard
          label="Watching"
          value={analytics.watching}
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Analyzing"
          value={analytics.analyzing}
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <StatCard
          label="Under Contract"
          value={analytics.underContract}
          icon={<FileText className="w-4 h-4" />}
        />
        <StatCard
          label="Closed (YTD)"
          value={analytics.closedThisYear}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent
        />
        <StatCard
          label="Passed"
          value={analytics.passed}
          icon={<XCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Avg Days to Close"
          value={analytics.avgDaysToClose}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Win Rate"
          value={`${analytics.winRate}%`}
          icon={<Award className="w-4 h-4" />}
          accent
        />
      </div>

      {/* ============================================================ */}
      {/*  FILTERS / SEARCH                                             */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by address or city..."
            className="w-full h-9 pl-9 pr-3 bg-transparent text-white text-[13px] font-body rounded-lg focus:outline-none focus:ring-1 focus:ring-gold/30 placeholder:text-muted-deep"
            style={{ border: '1px solid #161E2A', backgroundColor: '#0C1018' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Property type filter */}
        <select
          value={filterPropertyType}
          onChange={(e) => setFilterPropertyType(e.target.value)}
          className="h-9 px-3 pr-8 text-[13px] font-body text-white rounded-lg appearance-none focus:outline-none focus:ring-1 focus:ring-gold/30"
          style={{ border: '1px solid #161E2A', backgroundColor: '#0C1018' }}
        >
          <option value="">All Types</option>
          {PROPERTY_TYPE_OPTIONS.slice(1).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Source filter */}
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="h-9 px-3 pr-8 text-[13px] font-body text-white rounded-lg appearance-none focus:outline-none focus:ring-1 focus:ring-gold/30"
          style={{ border: '1px solid #161E2A', backgroundColor: '#0C1018' }}
        >
          {availableSources.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-9 px-3 pr-8 text-[13px] font-body text-white rounded-lg appearance-none focus:outline-none focus:ring-1 focus:ring-gold/30"
          style={{ border: '1px solid #161E2A', backgroundColor: '#0C1018' }}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Active filter count */}
        {(searchQuery || filterPropertyType || filterSource || filterPriority) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterPropertyType('');
              setFilterSource('');
              setFilterPriority('');
            }}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-body text-gold hover:bg-gold/10 transition-colors"
            style={{ border: '1px solid rgba(5, 150, 105, 0.3)' }}
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/*  KANBAN BOARD                                                 */}
      {/* ============================================================ */}
      {deals.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-7 h-7" />}
          title="No deals in your pipeline"
          description="Add your first deal to start tracking your investment pipeline."
          action={{
            label: 'Add Deal',
            onClick: () => setAddModalOpen(true),
            icon: <Plus className="w-4 h-4" />,
          }}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {PIPELINE_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.key}
              column={column}
              deals={dealsByColumn[column.key]}
              onDealClick={(deal) => setSelectedDeal(deal)}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, column.key)}
              onDrop={handleDrop}
              isDragOver={dragOverColumn === column.key}
            />
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/*  DEAL DETAIL PANEL                                            */}
      {/* ============================================================ */}
      {selectedDeal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setSelectedDeal(null)}
          />
          <DetailPanel
            deal={selectedDeal}
            onClose={() => setSelectedDeal(null)}
            onStageChange={handleStageChange}
            onNotesUpdate={handleNotesUpdate}
            checklists={checklists}
            onChecklistToggle={handleChecklistToggle}
          />
        </>
      )}

      {/* ============================================================ */}
      {/*  ADD DEAL MODAL                                               */}
      {/* ============================================================ */}
      <AddDealModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSave={handleAddDeal}
        saving={saving}
      />
    </div>
  );
}
