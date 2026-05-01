'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Brain, Trash2, Edit3, MapPin, User, Phone, Mail, Clock, ArrowRight,
  DollarSign, Activity, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { Deal, DealActivity } from '@/lib/types';

interface DealDetailPanelProps {
  deal: Deal;
  onClose: () => void;
  onEdit: (deal: Deal) => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  contacted: 'Contacted',
  analyzing: 'Analyzing',
  offer_sent: 'Offer Sent',
  negotiating: 'Negotiating',
  under_contract: 'Under Contract',
  due_diligence: 'Due Diligence',
  closed: 'Closed Won',
  dead: 'Closed Lost',
};

const STAGE_BADGE: Record<string, string> = {
  lead:           'bg-slate-100 text-slate-700 border-slate-200',
  contacted:      'bg-sky-100 text-sky-700 border-sky-200',
  analyzing:      'bg-amber-100 text-amber-700 border-amber-200',
  offer_sent:     'bg-violet-100 text-violet-700 border-violet-200',
  negotiating:    'bg-orange-100 text-orange-700 border-orange-200',
  under_contract: 'bg-blue-100 text-blue-700 border-blue-200',
  due_diligence:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  closed:         'bg-emerald-100 text-emerald-700 border-emerald-200',
  dead:           'bg-red-100 text-red-700 border-red-200',
};

/* ─── Score grid card ─── */
function ScoreCard({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-md border p-3',
        highlight ? 'border-[#0369A1]' : 'border-slate-200'
      )}
    >
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p
        className={cn(
          'font-display text-xl font-bold tabular-nums mt-1',
          highlight ? 'text-[#0369A1]' : 'text-[#020617]'
        )}
      >
        {value !== null && value !== undefined && value !== '' ? value : '—'}
        {unit && value !== null && value !== undefined && (
          <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>
        )}
      </p>
    </div>
  );
}

/* ─── Activity item ─── */
function ActivityItem({ activity }: { activity: DealActivity }) {
  const time = new Date(activity.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  if (activity.activity_type === 'stage_change') {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="mt-0.5 w-7 h-7 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
          <ArrowRight size={12} className="text-[#0369A1]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#020617]">
            Stage changed from{' '}
            <span className="font-medium text-slate-600">
              {STAGE_LABELS[activity.from_stage || ''] || activity.from_stage}
            </span>
            {' '}to{' '}
            <span className="font-medium text-[#0369A1]">
              {STAGE_LABELS[activity.to_stage || ''] || activity.to_stage}
            </span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{time}</p>
        </div>
      </div>
    );
  }

  if (activity.activity_type === 'ai_analysis') {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="mt-0.5 w-7 h-7 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
          <Brain size={12} className="text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#020617]">AI Deal Analysis completed</p>
          {activity.content && (
            <p className="text-xs text-slate-600 mt-0.5 line-clamp-3">{activity.content}</p>
          )}
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
        <Activity size={12} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#020617] capitalize">
          {activity.activity_type.replace('_', ' ')}
        </p>
        {activity.content && <p className="text-xs text-slate-600 mt-0.5">{activity.content}</p>}
        <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{time}</p>
      </div>
    </div>
  );
}

export function DealDetailPanel({ deal, onClose, onEdit, onDeleted, onUpdated }: DealDetailPanelProps) {
  const [scoring, setScoring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [localArv, setLocalArv] = useState(deal.arv?.toString() || '');
  const [localRepair, setLocalRepair] = useState(deal.repair_estimate?.toString() || '');
  const [maoPercent, setMaoPercent] = useState<number>(70);
  const [agentTab, setAgentTab] = useState<'arv' | 'market' | 'risk' | 'chief'>('chief');

  useEffect(() => {
    setLocalArv(deal.arv?.toString() || '');
    setLocalRepair(deal.repair_estimate?.toString() || '');
    fetchActivities();
  }, [deal.id]);

  async function fetchActivities() {
    try {
      const actRes = await fetch(`/api/deals/${deal.id}/activity`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch {
      // Activities may not be available
    }
  }

  const calculatedMao = useMemo(() => {
    const arvNum = parseFloat(localArv);
    const repairNum = parseFloat(localRepair);
    if (!isNaN(arvNum) && arvNum > 0) {
      const repair = isNaN(repairNum) ? 0 : repairNum;
      return Math.round(arvNum * (maoPercent / 100) - repair);
    }
    return null;
  }, [localArv, localRepair, maoPercent]);

  async function handleScore() {
    setScoring(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/score`, { method: 'POST' });
      if (!res.ok) throw new Error('Scoring failed');
      toast.success('Deal scored successfully');
      onUpdated();
    } catch {
      toast.error('Failed to score deal');
    } finally {
      setScoring(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Deal deleted');
      onDeleted();
    } catch {
      toast.error('Failed to delete deal');
    } finally {
      setDeleting(false);
    }
  }

  async function moveStage(newStage: string) {
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: newStage }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Moved to ${STAGE_LABELS[newStage] || newStage}`);
      onUpdated();
    } catch {
      toast.error('Failed to move deal');
    }
  }

  // Pull per-agent reasoning if present in metadata.
  const meta = (deal.metadata && typeof deal.metadata === 'object') ? (deal.metadata as Record<string, unknown>) : {};
  const agentNotes = (meta.agent_analysis && typeof meta.agent_analysis === 'object')
    ? (meta.agent_analysis as Record<string, string>)
    : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white border-l border-slate-200 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-2xl font-bold text-[#020617] truncate">{deal.address}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin size={12} />
                {deal.city}, {deal.state} {deal.zip}
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded border font-medium',
                    STAGE_BADGE[deal.pipeline_stage] || 'bg-slate-100 text-slate-700 border-slate-200'
                  )}
                >
                  {STAGE_LABELS[deal.pipeline_stage] || deal.pipeline_stage}
                </span>
                {deal.deal_score !== null && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded font-semibold tabular-nums',
                      deal.deal_score >= 75 ? 'bg-emerald-100 text-emerald-700' :
                      deal.deal_score >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    )}
                  >
                    Score {deal.deal_score}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(deal)}
                className="p-1.5 rounded-md text-slate-500 hover:text-[#020617] hover:bg-slate-100 transition-colors duration-200"
                title="Edit"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-slate-500 hover:text-[#020617] hover:bg-slate-100 transition-colors duration-200"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="primary" onClick={() => moveStage('offer_sent')}>
              Send Offer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => moveStage('dead')}>
              Mark Lost
            </Button>
            <Button size="sm" variant="ghost" icon={<Brain size={14} />} loading={scoring} onClick={handleScore}>
              {deal.deal_score ? 'Re-Score' : 'Score Deal'}
            </Button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6 bg-white">
          {/* Data quality banner */}
          <DataQualityBanner deal={deal} />

          {/* Score grid (ARV / Repair / MAO / Score) */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Deal Snapshot</h3>
            <div className="grid grid-cols-2 gap-3">
              <ScoreCard
                label="ARV"
                value={deal.arv !== null && deal.arv !== undefined ? `$${deal.arv.toLocaleString()}` : null}
              />
              <ScoreCard
                label="Repair Est."
                value={deal.repair_estimate !== null && deal.repair_estimate !== undefined ? `$${deal.repair_estimate.toLocaleString()}` : null}
              />
              <ScoreCard
                label="MAO"
                value={deal.mao !== null && deal.mao !== undefined ? `$${deal.mao.toLocaleString()}` : null}
                highlight
              />
              <ScoreCard
                label="Deal Score"
                value={deal.deal_score}
                unit="/100"
              />
            </div>
          </div>

          {/* Multi-agent analysis tabs */}
          {(agentNotes || deal.score_reasoning) && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Multi-Agent Analysis
              </h3>
              <div className="border-b border-slate-200 flex items-center gap-1">
                {(['arv', 'market', 'risk', 'chief'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAgentTab(tab)}
                    className={cn(
                      'px-3 py-2 text-xs font-medium capitalize transition-all duration-200 border-b-2 -mb-px',
                      agentTab === tab
                        ? 'text-[#0369A1] border-[#0369A1]'
                        : 'text-slate-500 border-transparent hover:text-[#020617]'
                    )}
                  >
                    {tab === 'chief' ? 'Chief' : `${tab.toUpperCase()} Agent`}
                  </button>
                ))}
              </div>
              <div className="bg-slate-50 border border-slate-200 border-t-0 rounded-b-md p-3">
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {agentNotes?.[agentTab] || (agentTab === 'chief' ? deal.score_reasoning : null) || (
                    <span className="italic text-slate-400">No analysis recorded for this agent.</span>
                  )}
                </p>
              </div>
              {/* Sub-scores under tabs */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { label: 'Market', value: deal.market_score },
                  { label: 'Risk', value: deal.risk_score },
                  { label: 'Location', value: deal.location_score },
                  { label: 'Condition', value: deal.condition_score },
                ].map((s) => (
                  <div key={s.label} className="bg-white border border-slate-200 rounded-md p-2 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
                    <p className="font-display text-base font-bold text-[#020617] tabular-nums">
                      {s.value !== null && s.value !== undefined ? s.value : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAO Calculator */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">MAO Calculator</h3>
            <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3 shadow-sm">
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="ARV ($)"
                  type="number"
                  value={localArv}
                  onChange={(e) => setLocalArv(e.target.value)}
                  placeholder="280000"
                />
                <Input
                  label="Repair Cost ($)"
                  type="number"
                  value={localRepair}
                  onChange={(e) => setLocalRepair(e.target.value)}
                  placeholder="35000"
                />
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">% Rule</label>
                  <select
                    value={maoPercent}
                    onChange={(e) => setMaoPercent(Number(e.target.value))}
                    className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-md text-[#020617] focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] tabular-nums"
                  >
                    <option value={65}>65%</option>
                    <option value={70}>70%</option>
                    <option value={75}>75%</option>
                    <option value={80}>80%</option>
                  </select>
                </div>
              </div>
              <div className="flex items-end justify-between p-3 rounded-md bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">MAO ({maoPercent}% Rule)</p>
                  <p className="text-xs text-slate-500 tabular-nums">= (ARV × {(maoPercent / 100).toFixed(2)}) − Repairs</p>
                </div>
                <span className="font-display text-3xl font-bold text-[#0369A1] tabular-nums">
                  {calculatedMao !== null ? `$${calculatedMao.toLocaleString()}` : '—'}
                </span>
              </div>
              {deal.asking_price && calculatedMao !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    {calculatedMao >= deal.asking_price ? 'Below asking by' : 'Above asking by'}
                  </span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      calculatedMao >= deal.asking_price ? 'text-emerald-700' : 'text-red-600'
                    )}
                  >
                    ${Math.abs(calculatedMao - deal.asking_price).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Comps table (if present in metadata) */}
          <CompsTable deal={deal} />

          {/* Financials */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Financials</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Asking Price', value: deal.asking_price },
                { label: 'ARV', value: deal.arv },
                { label: 'Repair Est.', value: deal.repair_estimate },
                { label: 'MAO', value: deal.mao },
                { label: 'Offer Price', value: deal.offer_price },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-md bg-white border border-slate-200">
                  <DollarSign size={12} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-sm font-medium text-[#020617] tabular-nums">
                      {item.value !== null && item.value !== undefined ? `$${item.value.toLocaleString()}` : '--'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Property Details */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Property Details</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Type', value: deal.property_type?.replace('_', ' ') },
                { label: 'Beds', value: deal.bedrooms },
                { label: 'Baths', value: deal.bathrooms },
                { label: 'Sq Ft', value: deal.square_footage?.toLocaleString() },
                { label: 'Lot', value: deal.lot_size_sqft ? `${deal.lot_size_sqft.toLocaleString()} sqft` : null },
                { label: 'Year Built', value: deal.year_built },
              ].map((item) => (
                <div key={item.label} className="p-2 rounded-md bg-white border border-slate-200">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-sm font-medium text-[#020617] capitalize tabular-nums">
                    {item.value || '--'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Seller Info */}
          {(deal.seller_name || deal.seller_phone || deal.seller_email) && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Seller</h3>
              <div className="bg-white border border-slate-200 rounded-md p-3 space-y-2 shadow-sm">
                {deal.seller_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User size={12} className="text-slate-400" />
                    <span className="text-[#020617]">{deal.seller_name}</span>
                    {deal.seller_type && (
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 capitalize">
                        {deal.seller_type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                )}
                {deal.seller_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={12} className="text-slate-400" />
                    <a href={`tel:${deal.seller_phone}`} className="text-[#0369A1] hover:underline tabular-nums">
                      {deal.seller_phone}
                    </a>
                  </div>
                )}
                {deal.seller_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={12} className="text-slate-400" />
                    <a href={`mailto:${deal.seller_email}`} className="text-[#0369A1] hover:underline">
                      {deal.seller_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {deal.notes && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Notes</h3>
              <p className="text-sm text-slate-700 bg-white rounded-md p-3 border border-slate-200 leading-relaxed whitespace-pre-wrap">
                {deal.notes}
              </p>
            </div>
          )}

          {/* Activity Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock size={12} />
              Activity Timeline
            </h3>
            {activities.length > 0 ? (
              <div className="space-y-1 divide-y divide-slate-100 bg-white border border-slate-200 rounded-md px-3">
                {activities.map((a) => (
                  <ActivityItem key={a.id} activity={a} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-white rounded-md border border-slate-200">
                <p className="text-xs text-slate-400">No activity recorded yet</p>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="text-xs text-slate-400 space-y-0.5 pb-4 tabular-nums">
            <p>Source: <span className="capitalize">{deal.source?.replace('_', ' ') || 'Unknown'}</span></p>
            <p>Created: {new Date(deal.created_at).toLocaleDateString()}</p>
            <p>Updated: {new Date(deal.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Deal"
        description={`Are you sure you want to delete "${deal.address}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}

/* ─── Comps Table ─── */
type Comp = {
  address?: string;
  sale_price?: number;
  price?: number;
  sqft?: number;
  square_footage?: number;
  bedrooms?: number;
  bathrooms?: number;
  bd?: number;
  ba?: number;
  distance_miles?: number;
  distance?: number;
  sold_date?: string;
  date?: string;
};

function CompsTable({ deal }: { deal: Deal }) {
  const meta = (deal.metadata && typeof deal.metadata === 'object') ? (deal.metadata as Record<string, unknown>) : {};
  const compsRaw = (meta.comps || meta.sale_comps || meta.comparables) as Comp[] | undefined;
  if (!Array.isArray(compsRaw) || compsRaw.length === 0) return null;
  const comps = compsRaw.slice(0, 8);

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Comparables</h3>
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-semibold text-slate-600 uppercase tracking-wider">Address</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 uppercase tracking-wider">Price</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 uppercase tracking-wider">Sqft</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600 uppercase tracking-wider">Bd/Ba</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 uppercase tracking-wider">Dist</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 uppercase tracking-wider">Sold</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c, i) => {
                const price = c.sale_price ?? c.price;
                const sqft = c.sqft ?? c.square_footage;
                const bd = c.bedrooms ?? c.bd;
                const ba = c.bathrooms ?? c.ba;
                const dist = c.distance_miles ?? c.distance;
                const sold = c.sold_date ?? c.date;
                return (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-3 py-2 text-slate-700 truncate max-w-[180px]">{c.address || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#020617] font-medium">
                      {price ? `$${price.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {sqft ? sqft.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums text-slate-600">
                      {bd !== undefined && ba !== undefined ? `${bd}/${ba}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {dist !== undefined && dist !== null ? `${Number(dist).toFixed(2)} mi` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {sold ? new Date(sold).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Data Quality Banner (Sales Intelligence style) ─── */
function DataQualityBanner({ deal }: { deal: Deal }) {
  const meta = (deal.metadata && typeof deal.metadata === 'object') ? (deal.metadata as Record<string, unknown>) : {};
  const quality = meta.data_quality as 'real' | 'partial' | 'simulated' | undefined;
  const source = meta.data_source as 'apify' | 'rentcast' | null | undefined;
  const sources = (meta.data_sources && typeof meta.data_sources === 'object')
    ? (meta.data_sources as {
        rentcast_value?: boolean;
        rentcast_rent?: boolean;
        rentcast_market?: boolean;
        apify_value?: boolean;
        apify_rent?: boolean;
        apify_market?: boolean;
        sale_comp_count?: number;
        rent_comp_count?: number;
        avg_comp_distance_miles?: number | null;
      })
    : null;

  if (!quality) return null;

  if (quality === 'simulated') {
    return (
      <div className="flex items-start gap-2 p-3 rounded-md border border-amber-200 bg-amber-50">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="text-amber-800 font-semibold">AI-only estimate</p>
          <p className="text-amber-700">
            Connect Apify or RentCast for real data.
          </p>
        </div>
      </div>
    );
  }

  const saleCount = sources?.sale_comp_count ?? 0;
  const rentCount = sources?.rent_comp_count ?? 0;
  const dist = sources?.avg_comp_distance_miles;
  const hasValue = sources?.apify_value || sources?.rentcast_value;
  const hasRent = sources?.apify_rent || sources?.rentcast_rent;
  const hasMarket = sources?.apify_market || sources?.rentcast_market;
  const totalComps = saleCount + rentCount;
  const parts: string[] = [];
  if (hasValue) parts.push(`${saleCount} sale comp${saleCount === 1 ? '' : 's'}`);
  if (hasRent) parts.push(`${rentCount} rent comp${rentCount === 1 ? '' : 's'}`);
  if (hasMarket) parts.push('ZIP market data');
  const summary = parts.join(' · ') || 'real comps';

  const headline =
    source === 'apify'
      ? quality === 'real'
        ? `Anchored to Zillow comps via Apify · ${totalComps} comparables`
        : `Partially anchored to Zillow comps via Apify · ${totalComps} comparables`
      : source === 'rentcast'
        ? quality === 'real'
          ? `Anchored to RentCast comps · ${totalComps} comparables`
          : `Partially anchored to RentCast comps · ${totalComps} comparables`
        : quality === 'real'
          ? `Anchored to real comps · ${totalComps} comparables`
          : `Partially anchored to real comps · ${totalComps} comparables`;

  return (
    <div className="flex items-start gap-2 p-3 rounded-md border border-emerald-200 bg-emerald-50">
      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
      <div className="text-xs leading-relaxed">
        <p className="text-emerald-800 font-semibold">{headline}</p>
        <p className="text-emerald-700 tabular-nums">
          {summary}
          {dist !== null && dist !== undefined ? ` · ${dist} mi avg distance` : ''}
        </p>
      </div>
    </div>
  );
}
