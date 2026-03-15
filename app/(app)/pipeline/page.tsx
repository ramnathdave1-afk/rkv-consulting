'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { PIPELINE_STAGES, STAGE_ORDER } from '@/lib/constants';
import { Building2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineStage } from '@/lib/types';

interface PipelineSite {
  id: string;
  name: string;
  state: string;
  target_capacity: number | null;
  pipeline_stage: PipelineStage;
  composite_score: number | null;
}

export default function PipelinePage() {
  const [sites, setSites] = useState<PipelineSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedSite, setDraggedSite] = useState<string | null>(null);
  const [confirmMove, setConfirmMove] = useState<{ siteId: string; toStage: PipelineStage } | null>(null);
  const [moveNotes, setMoveNotes] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function fetchPipeline() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from('sites')
        .select('id, name, state, target_capacity, pipeline_stage, site_scores(composite_score)')
        .eq('org_id', profile.org_id)
        .order('updated_at', { ascending: false });

      const mapped = (data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        name: s.name as string,
        state: s.state as string,
        target_capacity: s.target_capacity as number | null,
        pipeline_stage: s.pipeline_stage as PipelineStage,
        composite_score: (s.site_scores as Record<string, unknown>[] | null)?.[0]?.composite_score as number | null ?? null,
      }));

      setSites(mapped);
      setLoading(false);
    }

    fetchPipeline();
  }, [supabase]);

  function handleDragStart(siteId: string) {
    setDraggedSite(siteId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(toStage: PipelineStage) {
    if (!draggedSite) return;
    const site = sites.find((s) => s.id === draggedSite);
    if (!site || site.pipeline_stage === toStage) {
      setDraggedSite(null);
      return;
    }
    setConfirmMove({ siteId: draggedSite, toStage });
    setDraggedSite(null);
  }

  async function confirmStageMove() {
    if (!confirmMove) return;
    const { siteId, toStage } = confirmMove;

    const res = await fetch('/api/pipeline/move', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, to_stage: toStage, notes: moveNotes }),
    });

    if (res.ok) {
      setSites((prev) =>
        prev.map((s) => (s.id === siteId ? { ...s, pipeline_stage: toStage } : s)),
      );
    }

    setConfirmMove(null);
    setMoveNotes('');
  }

  function getStageColor(stage: string) {
    return PIPELINE_STAGES.find((s) => s.value === stage)?.color || '#8B95A5';
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Pipeline</h1>
        <p className="text-sm text-text-secondary">Drag sites between stages to update their status</p>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageSites = sites.filter((s) => s.pipeline_stage === stage.value);
          return (
            <div
              key={stage.value}
              className="min-w-[260px] flex-1"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.value as PipelineStage)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                  {stage.label}
                </span>
                <span className="ml-auto text-xs font-mono text-text-muted">{stageSites.length}</span>
              </div>

              {/* Column body */}
              <div className="space-y-2 min-h-[200px] rounded-lg bg-bg-primary/30 border border-border/50 p-2">
                {loading && (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 rounded-lg bg-bg-elevated animate-pulse" />
                    ))}
                  </div>
                )}
                {stageSites.map((site) => (
                  <motion.div
                    key={site.id}
                    layout
                    draggable
                    onDragStart={() => handleDragStart(site.id)}
                    className={cn(
                      'glass-card p-3 cursor-grab active:cursor-grabbing hover:border-border-hover transition-colors',
                      draggedSite === site.id && 'opacity-50',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical size={14} className="text-text-muted mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{site.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">
                          <span>{site.state}</span>
                          {site.target_capacity && <span>· {site.target_capacity}MW</span>}
                          {site.composite_score !== null && (
                            <span className="ml-auto font-mono text-accent">{site.composite_score}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {!loading && stageSites.length === 0 && (
                  <p className="text-[10px] text-text-muted text-center py-8">No sites</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Modal */}
      {confirmMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-text-primary">Move Site</h2>
            <p className="text-sm text-text-secondary">
              Move to <span className="font-semibold" style={{ color: getStageColor(confirmMove.toStage) }}>
                {PIPELINE_STAGES.find((s) => s.value === confirmMove.toStage)?.label}
              </span>?
            </p>
            <textarea
              value={moveNotes}
              onChange={(e) => setMoveNotes(e.target.value)}
              placeholder="Add notes (optional)"
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none h-20"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setConfirmMove(null); setMoveNotes(''); }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStageMove}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
