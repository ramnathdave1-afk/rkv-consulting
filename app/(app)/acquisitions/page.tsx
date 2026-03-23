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
import type { Deal, DealPipelineStage } from '@/lib/types';

/* ─── Pipeline Stages ─── */
const STAGES: { value: DealPipelineStage; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: '#6B7280' },
  { value: 'contacted', label: 'Contacted', color: '#3B82F6' },
  { value: 'analyzing', label: 'Analyzing', color: '#8B5CF6' },
  { value: 'offer_sent', label: 'Offer Sent', color: '#F59E0B' },
  { value: 'negotiating', label: 'Negotiating', color: '#F97316' },
  { value: 'under_contract', label: 'Under Contract', color: '#22C55E' },
  { value: 'due_diligence', label: 'Due Diligence', color: '#06B6D4' },
  { value: 'closed', label: 'Closed', color: '#10B981' },
  { value: 'dead', label: 'Dead', color: '#EF4444' },
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
    score >= 70 ? 'bg-green-500/15 text-green-400 border-green-500/25' :
    score >= 40 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' :
    'bg-red-500/15 text-red-400 border-red-500/25';
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {score}
    </span>
  );
}

function SourceTag({ source }: { source: string }) {
  return (
    <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent capitalize">
      {source.replace(/_/g, ' ')}
    </span>
  );
}

/* ─── Kanban Card ─── */
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
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', deal.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-border-hover transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-primary truncate">{deal.address}</p>
          <p className="text-[10px] text-text-muted">{deal.city}, {deal.state}</p>
        </div>
        <GripVertical size={12} className="text-text-muted/40 group-hover:text-text-muted shrink-0 mt-0.5" />
      </div>

      <div className="flex items-center gap-2 mt-2">
        {deal.asking_price !== null && (
          <span className="text-[10px] text-text-secondary">{formatPrice(deal.asking_price)} ask</span>
        )}
        {deal.mao !== null && (
          <span className="text-[10px] text-green-400 font-medium">{formatPrice(deal.mao)} MAO</span>
        )}
        <span className="ml-auto">
          {deal.deal_score !== null ? (
            <ScorePill score={deal.deal_score} />
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onScore(deal.id); }}
              disabled={scoringId === deal.id}
              className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
            >
              <Brain size={10} />
              {scoringId === deal.id ? '...' : 'Score'}
            </button>
          )}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {deal.seller_name && (
          <span className="text-[9px] text-text-muted truncate max-w-[80px]">{deal.seller_name}</span>
        )}
        {deal.source && <SourceTag source={deal.source} />}
        {deal.seller_type && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 capitalize">
            {deal.seller_type.replace(/_/g, ' ')}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Kanban Column ─── */
function KanbanColumn({
  stage,
  deals,
  onDrop,
  onCardClick,
  onScore,
  scoringId,
}: {
  stage: (typeof STAGES)[number];
  deals: Deal[];
  onDrop: (dealId: string, stage: DealPipelineStage) => void;
  onCardClick: (deal: Deal) => void;
  onScore: (id: string) => void;
  scoringId: string | null;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`w-64 shrink-0 flex flex-col rounded-xl transition-colors duration-150 ${
        dragOver ? 'bg-accent/5 ring-1 ring-accent/20' : ''
      }`}
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
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
        <span className="text-xs font-medium text-text-primary">{stage.label}</span>
        <span className="text-[10px] text-text-muted ml-auto bg-bg-elevated px-1.5 py-0.5 rounded-full">{deals.length}</span>
      </div>

      {/* Cards */}
      <div className="space-y-2 flex-1 min-h-[80px] px-0.5">
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onClick={() => onCardClick(deal)}
            onScore={onScore}
            scoringId={scoringId}
          />
        ))}
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
      className="border-b border-border hover:bg-bg-elevated/50 cursor-pointer transition-colors"
    >
      <td className="px-3 py-2.5">
        <p className="text-xs font-medium text-text-primary">{deal.address}</p>
        <p className="text-[10px] text-text-muted">{deal.city}, {deal.state}</p>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-text-primary capitalize">{deal.property_type?.replace(/_/g, ' ') || '--'}</span>
      </td>
      <td className="px-3 py-2.5 text-xs text-text-primary">{formatPrice(deal.asking_price)}</td>
      <td className="px-3 py-2.5 text-xs text-green-400 font-medium">{formatPrice(deal.mao)}</td>
      <td className="px-3 py-2.5">
        {deal.deal_score !== null ? (
          <ScorePill score={deal.deal_score} />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onScore(deal.id); }}
            disabled={scoringId === deal.id}
            className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
          >
            <Brain size={10} />
            {scoringId === deal.id ? '...' : 'Score'}
          </button>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: stg?.color || '#6B7280' }} />
          <span className="text-[10px] text-text-secondary">{stg?.label || deal.pipeline_stage}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-text-secondary truncate max-w-[100px]">{deal.seller_name || '--'}</td>
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

  async function moveDeal(dealId: string, newStage: DealPipelineStage) {
    // Find the deal to check current stage
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.pipeline_stage === newStage) return;

    // Optimistic update
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
      fetchDeals(); // re-sync
    } catch {
      toast.error('Failed to move deal');
      fetchDeals(); // revert
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Acquisitions</h1>
          <p className="text-sm text-text-secondary">Deal pipeline and lead scoring</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals..."
              className="h-8 pl-8 pr-3 text-xs bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-muted transition-all w-48"
            />
          </div>
          {/* View Toggle */}
          <div className="flex items-center bg-bg-primary border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={`p-1.5 transition-colors ${view === 'kanban' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'}`}
              title="Kanban view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 transition-colors ${view === 'table' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'}`}
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

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <Target size={18} className="mx-auto text-accent mb-1" />
          <p className="text-2xl font-bold text-text-primary">{totalDeals}</p>
          <p className="text-[10px] text-text-muted uppercase">Active Deals</p>
        </div>
        <div className="glass-card p-4 text-center">
          <DollarSign size={18} className="mx-auto text-green-500 mb-1" />
          <p className="text-2xl font-bold text-text-primary">{formatPrice(pipelineValue)}</p>
          <p className="text-[10px] text-text-muted uppercase">Pipeline Value</p>
        </div>
        <div className="glass-card p-4 text-center">
          <TrendingUp size={18} className="mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold text-text-primary">{avgScore || '--'}</p>
          <p className="text-[10px] text-text-muted uppercase">Avg Deal Score</p>
        </div>
      </div>

      {/* Empty state */}
      {deals.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Target size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No deals yet</h3>
          <p className="text-sm text-text-secondary mb-4">Add your first acquisition deal to start building your pipeline.</p>
          <Button icon={<Plus size={14} />} onClick={openNewDeal}>
            Add First Deal
          </Button>
        </div>
      ) : view === 'kanban' ? (
        /* ─── Kanban View ─── */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const stageDeals = filteredDeals.filter((d) => d.pipeline_stage === stage.value);
              return (
                <KanbanColumn
                  key={stage.value}
                  stage={stage}
                  deals={stageDeals}
                  onDrop={moveDeal}
                  onCardClick={setSelectedDeal}
                  onScore={scoreDeal}
                  scoringId={scoring}
                />
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── Table View ─── */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-bg-primary/50">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider">Property</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider">Asking</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider">MAO</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider">Score</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider">Stage</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider">Seller</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider">Source</th>
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
              <p className="text-sm text-text-muted">No deals match your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Form Modal (Add / Edit) */}
      <DealFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        deal={editingDeal}
        onSaved={fetchDeals}
      />

      {/* Deal Detail Side Panel */}
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
