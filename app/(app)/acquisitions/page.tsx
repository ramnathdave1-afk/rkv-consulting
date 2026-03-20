'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus, Target, DollarSign, TrendingUp, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Deal, DealPipelineStage } from '@/lib/types';

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

export default function AcquisitionsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState<string | null>(null);
  const supabase = createClient();

  async function fetchDeals() {
    const res = await fetch('/api/deals');
    if (res.ok) {
      const data = await res.json();
      setDeals(data.deals || []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchDeals(); }, []);

  async function moveDeal(dealId: string, newStage: DealPipelineStage) {
    await fetch(`/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: newStage }),
    });
    fetchDeals();
  }

  async function scoreDeal(dealId: string) {
    setScoring(dealId);
    await fetch(`/api/deals/${dealId}/score`, { method: 'POST' });
    await fetchDeals();
    setScoring(null);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalDeals = deals.length;
  const pipelineValue = deals.reduce((s, d) => s + (d.mao || d.asking_price || 0), 0);
  const avgScore = deals.filter((d) => d.deal_score).length > 0
    ? Math.round(deals.filter((d) => d.deal_score).reduce((s, d) => s + (d.deal_score || 0), 0) / deals.filter((d) => d.deal_score).length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Acquisitions</h1>
          <p className="text-sm text-text-secondary">Deal pipeline and lead scoring</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus size={16} />
          Add Deal
        </button>
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
          <p className="text-2xl font-bold text-text-primary">${(pipelineValue / 1000).toFixed(0)}k</p>
          <p className="text-[10px] text-text-muted uppercase">Pipeline Value</p>
        </div>
        <div className="glass-card p-4 text-center">
          <TrendingUp size={18} className="mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold text-text-primary">{avgScore || '—'}</p>
          <p className="text-[10px] text-text-muted uppercase">Avg Deal Score</p>
        </div>
      </div>

      {/* Kanban Board */}
      {deals.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Target size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No deals yet</h3>
          <p className="text-sm text-text-secondary">Add your first acquisition deal to start building your pipeline.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-3 min-w-max pb-4">
            {STAGES.filter((s) => s.value !== 'dead').map((stage) => {
              const stageDeals = deals.filter((d) => d.pipeline_stage === stage.value);
              return (
                <div key={stage.value} className="w-64 shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-medium text-text-primary">{stage.label}</span>
                    <span className="text-[10px] text-text-muted ml-auto">{stageDeals.length}</span>
                  </div>
                  <div className="space-y-2">
                    {stageDeals.map((deal) => (
                      <motion.div
                        key={deal.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-3 cursor-pointer hover:border-border-hover transition-colors"
                      >
                        <p className="text-xs font-medium text-text-primary truncate">{deal.address}</p>
                        <p className="text-[10px] text-text-muted">{deal.city}, {deal.state}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            {deal.asking_price && (
                              <span className="text-[10px] text-text-secondary">${(deal.asking_price / 1000).toFixed(0)}k ask</span>
                            )}
                            {deal.mao && (
                              <span className="text-[10px] text-green-500">${(deal.mao / 1000).toFixed(0)}k MAO</span>
                            )}
                          </div>
                          {deal.deal_score ? (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              deal.deal_score >= 70 ? 'bg-green-500/10 text-green-500' :
                              deal.deal_score >= 40 ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-red-500/10 text-red-500'
                            }`}>{deal.deal_score}</span>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); scoreDeal(deal.id); }}
                              disabled={scoring === deal.id}
                              className="text-[10px] text-accent hover:underline flex items-center gap-1"
                            >
                              <Brain size={10} />
                              {scoring === deal.id ? 'Scoring...' : 'Score'}
                            </button>
                          )}
                        </div>
                        {deal.seller_type && (
                          <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] bg-accent/10 text-accent capitalize">
                            {deal.seller_type.replace('_', ' ')}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
