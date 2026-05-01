'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { DealFormModal } from '@/components/acquisitions/DealFormModal';
import { DealDetailPanel } from '@/components/acquisitions/DealDetailPanel';
import {
  Plus, Target, DollarSign, TrendingUp, Brain, LayoutGrid, Table2,
  GripVertical, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { Deal, DealPipelineStage } from '@/lib/types';

/* ─── Pipeline Stages — Sales Intelligence color map ─── */
type StageStyle = {
  value: DealPipelineStage;
  label: string;
  /** Tailwind classes for the column header band (bg + border-b). */
  headerBg: string;
  /** Tailwind dot color for table view. */
  dot: string;
};

const STAGES: StageStyle[] = [
  { value: 'lead',           label: 'Lead',           headerBg: 'bg-slate-50 border-slate-200',     dot: 'bg-slate-400' },
  { value: 'contacted',      label: 'Contacted',      headerBg: 'bg-sky-50 border-sky-200',         dot: 'bg-sky-500' },
  { value: 'analyzing',      label: 'Analyzing',      headerBg: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-500' },
  { value: 'offer_sent',     label: 'Offer Sent',     headerBg: 'bg-violet-50 border-violet-200',   dot: 'bg-violet-500' },
  { value: 'negotiating',    label: 'Negotiating',    headerBg: 'bg-orange-50 border-orange-200',   dot: 'bg-orange-500' },
  { value: 'under_contract', label: 'Under Contract', headerBg: 'bg-blue-50 border-blue-200',       dot: 'bg-blue-500' },
  { value: 'due_diligence',  label: 'Due Diligence',  headerBg: 'bg-indigo-50 border-indigo-200',   dot: 'bg-indigo-500' },
  { value: 'closed',         label: 'Closed Won',     headerBg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'dead',           label: 'Closed Lost',    headerBg: 'bg-red-50 border-red-200',         dot: 'bg-red-500' },
];

const stageMap = Object.fromEntries(STAGES.map((s) => [s.value, s]));

/* ─── Helpers ─── */
function formatPrice(v: number | null): string {
  if (v === null || v === undefined) return '--';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toLocaleString()}`;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return null;
  const cls =
    score >= 75 ? 'bg-emerald-100 text-emerald-700' :
    score >= 50 ? 'bg-amber-100 text-amber-700' :
    'bg-red-100 text-red-700';
  return (
    <span className={cn('text-xs px-1.5 py-0.5 rounded font-semibold tabular-nums', cls)}>
      {score}
    </span>
  );
}

function SourceTag({ source }: { source: string }) {
  return (
    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 capitalize">
      {source.replace(/_/g, ' ')}
    </span>
  );
}

/* ─── Days-in-stage helper ─── */
function daysInStage(deal: Deal): number {
  // Best-effort: use updated_at as the last-stage-change proxy.
  const ref = deal.updated_at || deal.created_at;
  if (!ref) return 0;
  const diff = Date.now() - new Date(ref).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

/* ─── Kanban Card (Sales Intelligence style) ─── */
function DealCard({
  deal,
  onClick,
  onScore,
  scoringId,
}: {
  deal: Deal;
  onClick: () => void;
  onScore: (id: string) => void;
  scoringId: string | null;
}) {
  const days = daysInStage(deal);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', deal.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onClick}
      className="bg-white rounded-md border border-slate-200 p-3 mb-2 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-display font-semibold text-sm text-[#020617] truncate">{deal.address}</h4>
          <p className="text-xs text-slate-500 truncate">{deal.city}, {deal.state}</p>
        </div>
        <GripVertical
          size={14}
          className="text-slate-300 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity duration-200"
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-mono tabular-nums text-slate-700">
          {deal.asking_price !== null ? `$${deal.asking_price.toLocaleString()}` : '—'}
        </span>
        {deal.deal_score !== null ? (
          <ScorePill score={deal.deal_score} />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onScore(deal.id); }}
            disabled={scoringId === deal.id}
            className="text-xs text-[#0369A1] hover:underline flex items-center gap-0.5 font-medium"
          >
            <Brain size={11} />
            {scoringId === deal.id ? '…' : 'Score'}
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <span className="tabular-nums">{days}d in stage</span>
        {deal.mao !== null && (
          <span className="tabular-nums">· MAO ${deal.mao.toLocaleString()}</span>
        )}
      </div>

      {(deal.source || deal.seller_type) && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {deal.source && <SourceTag source={deal.source} />}
          {deal.seller_type && (
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 capitalize">
              {deal.seller_type.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Kanban Column (Sales Intelligence style) ─── */
function KanbanColumn({
  stage,
  deals,
  draggingFromStage,
  onDrop,
  onCardClick,
  onScore,
  scoringId,
}: {
  stage: StageStyle;
  deals: Deal[];
  draggingFromStage: DealPipelineStage | null;
  onDrop: (dealId: string, stage: DealPipelineStage) => void;
  onCardClick: (deal: Deal) => void;
  onScore: (id: string) => void;
  scoringId: string | null;
}) {
  const [dragOver, setDragOver] = useState(false);

  const totalValue = deals.reduce((sum, d) => sum + (d.asking_price || 0), 0);
  const isValidTarget = draggingFromStage !== null && draggingFromStage !== stage.value;

  return (
    <div
      className={cn(
        'w-72 shrink-0 flex flex-col rounded-lg border border-slate-200 bg-slate-50/40 transition-all duration-200',
        isValidTarget && 'ring-2 ring-[#0369A1] ring-offset-2',
        dragOver && 'bg-sky-50/60'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const dealId = e.dataTransfer.getData('text/plain');
        if (dealId) onDrop(dealId, stage.value);
      }}
    >
      {/* Column header band */}
      <div className={cn('px-3 py-2 border-b rounded-t-lg', stage.headerBg)}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-[#020617]">{stage.label}</h3>
          <span className="text-xs tabular-nums text-slate-500">{deals.length}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
          ${totalValue.toLocaleString()}
        </p>
      </div>

      {/* Cards */}
      <div className={cn(
        'flex-1 min-h-[120px] p-2',
        dragOver && 'border-2 border-dashed border-[#0369A1] rounded-b-lg'
      )}>
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onClick={() => onCardClick(deal)}
            onScore={onScore}
            scoringId={scoringId}
          />
        ))}
        {deals.length === 0 && (
          <div className="text-xs text-slate-400 italic text-center py-6">No deals</div>
        )}
      </div>
    </div>
  );
}

/* ─── Table Row ─── */
function DealTableRow({
  deal,
  onClick,
  onScore,
  scoringId,
}: {
  deal: Deal;
  onClick: () => void;
  onScore: (id: string) => void;
  scoringId: string | null;
}) {
  const stg = stageMap[deal.pipeline_stage];
  return (
    <tr
      onClick={onClick}
      className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors duration-200"
    >
      <td className="px-3 py-2.5">
        <p className="font-display text-sm font-semibold text-[#020617]">{deal.address}</p>
        <p className="text-xs text-slate-500">{deal.city}, {deal.state}</p>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-slate-700 capitalize">
          {deal.property_type?.replace(/_/g, ' ') || '--'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs font-mono tabular-nums text-slate-700">
        {formatPrice(deal.asking_price)}
      </td>
      <td className="px-3 py-2.5 text-xs font-mono tabular-nums text-emerald-700 font-semibold">
        {formatPrice(deal.mao)}
      </td>
      <td className="px-3 py-2.5">
        {deal.deal_score !== null ? (
          <ScorePill score={deal.deal_score} />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onScore(deal.id); }}
            disabled={scoringId === deal.id}
            className="text-xs text-[#0369A1] hover:underline flex items-center gap-0.5 font-medium"
          >
            <Brain size={11} />
            {scoringId === deal.id ? '…' : 'Score'}
          </button>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full shrink-0', stg?.dot || 'bg-slate-400')} />
          <span className="text-xs text-slate-600">{stg?.label || deal.pipeline_stage}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-600 truncate max-w-[140px]">
        {deal.seller_name || '--'}
      </td>
      <td className="px-3 py-2.5">
        {deal.source && <SourceTag source={deal.source} />}
      </td>
    </tr>
  );
}

/* ─── Main Page ─── */
export default function AcquisitionsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState<string | null>(null);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [draggingFromStage, setDraggingFromStage] = useState<DealPipelineStage | null>(null);

  // Modal / Panel state
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch('/api/deals');
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
      }
    } catch {
      toast.error('Failed to fetch deals');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  // Refresh selected deal after updates
  useEffect(() => {
    if (selectedDeal) {
      const updated = deals.find((d) => d.id === selectedDeal.id);
      if (updated) setSelectedDeal(updated);
    }
  }, [deals]);

  // Track drag origin to highlight valid drop targets across the board
  useEffect(() => {
    function handleDragEnd() { setDraggingFromStage(null); }
    window.addEventListener('dragend', handleDragEnd);
    return () => window.removeEventListener('dragend', handleDragEnd);
  }, []);

  async function moveDeal(dealId: string, newStage: DealPipelineStage) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.pipeline_stage === newStage) return;

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, pipeline_stage: newStage } : d))
    );

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: newStage }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Moved to ${stageMap[newStage]?.label || newStage}`);
      fetchDeals();
    } catch {
      toast.error('Failed to move deal');
      fetchDeals();
    }
  }

  async function scoreDeal(dealId: string) {
    setScoring(dealId);
    try {
      const res = await fetch(`/api/deals/${dealId}/score`, { method: 'POST' });
      if (!res.ok) throw new Error('Scoring failed');
      toast.success('Deal scored');
      await fetchDeals();
    } catch {
      toast.error('Failed to score deal');
    } finally {
      setScoring(null);
    }
  }

  function openNewDeal() {
    setEditingDeal(null);
    setFormOpen(true);
  }

  function openEditDeal(deal: Deal) {
    setSelectedDeal(null);
    setEditingDeal(deal);
    setFormOpen(true);
  }

  // Filter deals by search
  const filteredDeals = search.trim()
    ? deals.filter((d) => {
        const q = search.toLowerCase();
        return (
          d.address.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q) ||
          d.state.toLowerCase().includes(q) ||
          (d.seller_name && d.seller_name.toLowerCase().includes(q))
        );
      })
    : deals;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalDeals = deals.length;
  const pipelineValue = deals.reduce((s, d) => s + (d.mao || d.asking_price || 0), 0);
  const scoredDeals = deals.filter((d) => d.deal_score !== null);
  const avgScore = scoredDeals.length > 0
    ? Math.round(scoredDeals.reduce((s, d) => s + (d.deal_score || 0), 0) / scoredDeals.length)
    : 0;

  return (
    <div
      className="p-6 space-y-6 bg-white min-h-screen"
      onDragStart={(e) => {
        // Capture origin stage so columns can show valid-target ring while dragging.
        const id = (e.target as HTMLElement)?.closest?.('[draggable=true]');
        if (!id) return;
        const dealId = (e as React.DragEvent).dataTransfer?.getData('text/plain');
        const found = deals.find((d) => d.id === dealId);
        if (found) setDraggingFromStage(found.pipeline_stage);
      }}
    >
      {/* Header — navy display title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617]">Acquisitions</h1>
          <p className="text-sm text-slate-500">Deal pipeline and lead scoring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals…"
              className="h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-[#020617] placeholder:text-slate-400 focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] transition-all w-48"
            />
          </div>
          <div className="flex items-center bg-white border border-slate-200 rounded-md overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'p-1.5 transition-colors duration-200',
                view === 'kanban' ? 'bg-sky-50 text-[#0369A1]' : 'text-slate-500 hover:text-[#020617]'
              )}
              title="Kanban view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setView('table')}
              className={cn(
                'p-1.5 transition-colors duration-200',
                view === 'table' ? 'bg-sky-50 text-[#0369A1]' : 'text-slate-500 hover:text-[#020617]'
              )}
              title="Table view"
            >
              <Table2 size={14} />
            </button>
          </div>
          <Button size="sm" icon={<Plus size={14} />} onClick={openNewDeal}>
            New Deal
          </Button>
        </div>
      </div>

      {/* KPIs — Sales Intelligence cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-[#0369A1]" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Deals</p>
          </div>
          <p className="font-display text-2xl font-bold text-[#020617] tabular-nums">{totalDeals}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-emerald-600" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pipeline Value</p>
          </div>
          <p className="font-display text-2xl font-bold text-[#020617] tabular-nums">{formatPrice(pipelineValue)}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-[#0369A1]" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Deal Score</p>
          </div>
          <p className="font-display text-2xl font-bold text-[#020617] tabular-nums">{avgScore || '--'}</p>
        </div>
      </div>

      {/* Empty state */}
      {deals.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center shadow-sm">
          <Target size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-display text-lg font-semibold text-[#020617] mb-2">No deals yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Add your first acquisition deal to start building your pipeline.
          </p>
          <Button icon={<Plus size={14} />} onClick={openNewDeal}>
            Add First Deal
          </Button>
        </div>
      ) : view === 'kanban' ? (
        /* ─── Kanban View — horizontal scroll, snap-x on mobile ─── */
        <div className="overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const stageDeals = filteredDeals.filter((d) => d.pipeline_stage === stage.value);
              return (
                <div key={stage.value} className="snap-start">
                  <KanbanColumn
                    stage={stage}
                    deals={stageDeals}
                    draggingFromStage={draggingFromStage}
                    onDrop={moveDeal}
                    onCardClick={setSelectedDeal}
                    onScore={scoreDeal}
                    scoringId={scoring}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── Table View ─── */
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Property</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Asking</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">MAO</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Score</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Stage</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Seller</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => (
                  <DealTableRow
                    key={deal.id}
                    deal={deal}
                    onClick={() => setSelectedDeal(deal)}
                    onScore={scoreDeal}
                    scoringId={scoring}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {filteredDeals.length === 0 && search && (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No deals match your search.</p>
            </div>
          )}
        </div>
      )}

      <DealFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        deal={editingDeal}
        onSaved={fetchDeals}
      />

      {selectedDeal && (
        <DealDetailPanel
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onEdit={openEditDeal}
          onDeleted={() => {
            setSelectedDeal(null);
            fetchDeals();
          }}
          onUpdated={fetchDeals}
        />
      )}
    </div>
  );
}
