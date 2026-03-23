'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Brain, Trash2, Edit3, MapPin, User, Phone, Mail, Clock, ArrowRight, DollarSign, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
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
  closed: 'Closed',
  dead: 'Dead',
};

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (score === null) return null;
  const color =
    score >= 70 ? 'text-green-400 bg-green-500/10 border-green-500/20' :
    score >= 40 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
    'text-red-400 bg-red-500/10 border-red-500/20';
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg border ${color}`}>
      <span className="text-lg font-bold">{score}</span>
      <span className="text-[9px] uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}

function ActivityItem({ activity }: { activity: DealActivity }) {
  const time = new Date(activity.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  if (activity.activity_type === 'stage_change') {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="mt-0.5 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <ArrowRight size={12} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-primary">
            Stage changed from <span className="font-medium text-text-secondary">{STAGE_LABELS[activity.from_stage || ''] || activity.from_stage}</span>
            {' '}to <span className="font-medium text-accent">{STAGE_LABELS[activity.to_stage || ''] || activity.to_stage}</span>
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">{time}</p>
        </div>
      </div>
    );
  }

  if (activity.activity_type === 'ai_analysis') {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="mt-0.5 w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
          <Brain size={12} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-primary">AI Deal Analysis completed</p>
          {activity.content && (
            <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-3">{activity.content}</p>
          )}
          <p className="text-[10px] text-text-muted mt-0.5">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center shrink-0">
        <Activity size={12} className="text-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-primary capitalize">{activity.activity_type.replace('_', ' ')}</p>
        {activity.content && <p className="text-[10px] text-text-secondary mt-0.5">{activity.content}</p>}
        <p className="text-[10px] text-text-muted mt-0.5">{time}</p>
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

  useEffect(() => {
    setLocalArv(deal.arv?.toString() || '');
    setLocalRepair(deal.repair_estimate?.toString() || '');
    fetchActivities();
  }, [deal.id]);

  async function fetchActivities() {
    try {
      const res = await fetch(`/api/deals/${deal.id}`);
      if (res.ok) {
        const data = await res.json();
        // Try fetching activities separately if the endpoint supports it
        const actRes = await fetch(`/api/deals/${deal.id}/activity`);
        if (actRes.ok) {
          const actData = await actRes.json();
          setActivities(actData.activities || []);
        }
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
      return Math.round(arvNum * 0.7 - repair);
    }
    return null;
  }, [localArv, localRepair]);

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

  const scoreColor = (score: number | null) => {
    if (score === null) return 'text-text-muted';
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-bg-secondary border-l border-border overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg-secondary/95 backdrop-blur-md border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="font-display text-base font-bold text-text-primary truncate">{deal.address}</h2>
              <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                <MapPin size={10} />
                {deal.city}, {deal.state} {deal.zip}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(deal)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Deal Score Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Deal Score</h3>
              <Button
                size="sm"
                variant={deal.deal_score ? 'ghost' : 'primary'}
                icon={<Brain size={14} />}
                loading={scoring}
                onClick={handleScore}
              >
                {deal.deal_score ? 'Re-Score' : 'Score Deal'}
              </Button>
            </div>
            {deal.deal_score !== null ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`text-3xl font-bold ${scoreColor(deal.deal_score)}`}>{deal.deal_score}</div>
                  <span className="text-xs text-text-muted">/100</span>
                  {deal.arv_confidence && (
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${
                      deal.arv_confidence === 'high' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                      deal.arv_confidence === 'medium' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' :
                      'border-red-500/30 bg-red-500/10 text-red-400'
                    }`}>
                      {deal.arv_confidence} confidence
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <ScoreBadge score={deal.market_score} label="Market" />
                  <ScoreBadge score={deal.risk_score} label="Risk" />
                  <ScoreBadge score={deal.location_score} label="Location" />
                  <ScoreBadge score={deal.condition_score} label="Condition" />
                </div>
                {deal.score_reasoning && (
                  <p className="text-xs text-text-secondary bg-bg-primary rounded-lg p-3 border border-border leading-relaxed">
                    {deal.score_reasoning}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 bg-bg-primary rounded-lg border border-border">
                <Brain size={24} className="mx-auto text-text-muted mb-2" />
                <p className="text-xs text-text-secondary">Click "Score Deal" to run AI analysis</p>
              </div>
            )}
          </div>

          {/* MAO Calculator */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">MAO Calculator</h3>
            <div className="glass-card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="ARV ($)"
                  type="number"
                  value={localArv}
                  onChange={(e) => setLocalArv(e.target.value)}
                  placeholder="280000"
                />
                <Input
                  label="Repair Estimate ($)"
                  type="number"
                  value={localRepair}
                  onChange={(e) => setLocalRepair(e.target.value)}
                  placeholder="35000"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-primary border border-border">
                <div>
                  <p className="text-[10px] text-text-muted uppercase">MAO (70% Rule)</p>
                  <p className="text-[10px] text-text-secondary">= (ARV x 0.70) - Repairs</p>
                </div>
                <span className={`text-xl font-bold ${calculatedMao !== null && calculatedMao > 0 ? 'text-green-400' : calculatedMao !== null ? 'text-red-400' : 'text-text-muted'}`}>
                  {calculatedMao !== null ? `$${calculatedMao.toLocaleString()}` : '--'}
                </span>
              </div>
              {deal.asking_price && calculatedMao !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">
                    {calculatedMao >= deal.asking_price ? 'Below asking by' : 'Above asking by'}
                  </span>
                  <span className={calculatedMao >= deal.asking_price ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                    ${Math.abs(calculatedMao - deal.asking_price).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Financials */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Financials</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Asking Price', value: deal.asking_price, icon: DollarSign },
                { label: 'ARV', value: deal.arv, icon: DollarSign },
                { label: 'Repair Est.', value: deal.repair_estimate, icon: DollarSign },
                { label: 'MAO', value: deal.mao, icon: DollarSign },
                { label: 'Offer Price', value: deal.offer_price, icon: DollarSign },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-primary border border-border">
                  <item.icon size={12} className="text-text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-text-muted">{item.label}</p>
                    <p className="text-xs font-medium text-text-primary">
                      {item.value !== null && item.value !== undefined ? `$${item.value.toLocaleString()}` : '--'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Property Details */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Property Details</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Type', value: deal.property_type?.replace('_', ' ') },
                { label: 'Beds', value: deal.bedrooms },
                { label: 'Baths', value: deal.bathrooms },
                { label: 'Sq Ft', value: deal.square_footage?.toLocaleString() },
                { label: 'Lot', value: deal.lot_size_sqft ? `${deal.lot_size_sqft.toLocaleString()} sqft` : null },
                { label: 'Year Built', value: deal.year_built },
              ].map((item) => (
                <div key={item.label} className="p-2 rounded-lg bg-bg-primary border border-border">
                  <p className="text-[10px] text-text-muted">{item.label}</p>
                  <p className="text-xs font-medium text-text-primary capitalize">{item.value || '--'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Seller Info */}
          {(deal.seller_name || deal.seller_phone || deal.seller_email) && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Seller</h3>
              <div className="glass-card p-3 space-y-2">
                {deal.seller_name && (
                  <div className="flex items-center gap-2 text-xs">
                    <User size={12} className="text-text-muted" />
                    <span className="text-text-primary">{deal.seller_name}</span>
                    {deal.seller_type && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent capitalize">
                        {deal.seller_type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                )}
                {deal.seller_phone && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone size={12} className="text-text-muted" />
                    <a href={`tel:${deal.seller_phone}`} className="text-accent hover:underline">{deal.seller_phone}</a>
                  </div>
                )}
                {deal.seller_email && (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail size={12} className="text-text-muted" />
                    <a href={`mailto:${deal.seller_email}`} className="text-accent hover:underline">{deal.seller_email}</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {deal.notes && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Notes</h3>
              <p className="text-xs text-text-secondary bg-bg-primary rounded-lg p-3 border border-border leading-relaxed whitespace-pre-wrap">
                {deal.notes}
              </p>
            </div>
          )}

          {/* Activity Log */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock size={12} />
              Activity Log
            </h3>
            {activities.length > 0 ? (
              <div className="space-y-1 divide-y divide-border">
                {activities.map((a) => (
                  <ActivityItem key={a.id} activity={a} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-bg-primary rounded-lg border border-border">
                <p className="text-[10px] text-text-muted">No activity recorded yet</p>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="text-[10px] text-text-muted space-y-0.5 pb-4">
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
