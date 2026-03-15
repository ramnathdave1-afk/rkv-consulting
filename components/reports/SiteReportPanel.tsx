'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, MapPin, Zap, Shield, TrendingUp, Wifi, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PIPELINE_STAGES, SCORE_DIMENSIONS } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ScoreGauge } from './ScoreGauge';
import { ScoreBreakdown } from './ScoreBreakdown';
import type { GhostSite, SiteScore, Substation } from '@/lib/types';

interface SiteReportPanelProps {
  siteId: string | null;
  onClose: () => void;
}

const dimensionIcons: Record<string, React.ElementType> = {
  grid_score: Zap,
  land_score: MapPin,
  risk_score: Shield,
  market_score: TrendingUp,
  connectivity_score: Wifi,
};

export function SiteReportPanel({ siteId, onClose }: SiteReportPanelProps) {
  const [site, setSite] = useState<GhostSite | null>(null);
  const [score, setScore] = useState<SiteScore | null>(null);
  const [substation, setSubstation] = useState<Substation | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!siteId) {
      setSite(null);
      setScore(null);
      setSubstation(null);
      return;
    }

    async function fetchData() {
      setLoading(true);

      const { data: siteData } = await supabase
        .from('ghost_sites')
        .select('*')
        .eq('id', siteId)
        .single();

      if (siteData) {
        setSite(siteData);

        const [scoreRes, subRes] = await Promise.all([
          supabase
            .from('site_scores')
            .select('*')
            .eq('site_id', siteData.id)
            .order('scored_at', { ascending: false })
            .limit(1)
            .single(),
          siteData.nearest_substation_id
            ? supabase.from('substations').select('*').eq('id', siteData.nearest_substation_id).single()
            : Promise.resolve({ data: null }),
        ]);

        setScore(scoreRes.data);
        setSubstation(subRes.data);
      }

      setLoading(false);
    }

    fetchData();
  }, [siteId, supabase]);

  const stage = site ? PIPELINE_STAGES.find((s) => s.value === site.pipeline_stage) : null;

  return (
    <AnimatePresence>
      {siteId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[600px] z-50 overflow-y-auto glass border-l border-border"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 glass border-b border-border p-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {loading ? (
                  <Skeleton className="h-6 w-48 mb-2" />
                ) : site ? (
                  <>
                    <h2 className="font-display text-lg font-bold text-text-primary truncate">{site.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-secondary">{site.state}{site.county ? `, ${site.county}` : ''}</span>
                      {stage && <Badge color={stage.color} size="sm" dot>{stage.label}</Badge>}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-2 ml-3">
                {site && (
                  <a
                    href={`/api/reports/${site.id}/pdf`}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
                  >
                    <Download size={12} /> PDF
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-48 w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
                  </div>
                </div>
              ) : site ? (
                <>
                  {/* Score Section */}
                  {score && (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Gauge */}
                      <div className="glass-card p-4 flex flex-col items-center justify-center">
                        <ScoreGauge score={score.composite_score} size={100} label="Composite" />
                      </div>

                      {/* Radar */}
                      <div className="glass-card p-4">
                        <ScoreBreakdown score={score} />
                      </div>
                    </div>
                  )}

                  {/* Dimension scores */}
                  {score && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {SCORE_DIMENSIONS.map((dim) => {
                        const Icon = dimensionIcons[dim.key] || Building2;
                        const value = score[dim.key as keyof SiteScore] as number;
                        return (
                          <div key={dim.key} className="glass-card p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Icon size={12} style={{ color: dim.color }} />
                              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">{dim.label}</span>
                            </div>
                            <p className="text-xl font-display font-bold" style={{ color: dim.color }}>{value}</p>
                            <div className="mt-1.5 h-1 rounded-full bg-bg-elevated overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: dim.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Location */}
                  <div className="glass-card p-4">
                    <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Location</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-text-muted text-xs">State</span>
                        <p className="text-text-primary">{site.state}{site.county ? `, ${site.county}` : ''}</p>
                      </div>
                      <div>
                        <span className="text-text-muted text-xs">Coordinates</span>
                        <p className="text-text-primary font-mono text-xs">{site.lat?.toFixed(4)}, {site.lng?.toFixed(4)}</p>
                      </div>
                      {site.acreage && (
                        <div>
                          <span className="text-text-muted text-xs">Acreage</span>
                          <p className="text-text-primary">{site.acreage} acres</p>
                        </div>
                      )}
                      {site.zoning && (
                        <div>
                          <span className="text-text-muted text-xs">Zoning</span>
                          <p className="text-text-primary">{site.zoning}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid Connection */}
                  <div className="glass-card p-4">
                    <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Grid Connection</h3>
                    {substation ? (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-text-muted text-xs">Substation</span>
                          <p className="text-text-primary">{substation.name}</p>
                        </div>
                        <div>
                          <span className="text-text-muted text-xs">Utility</span>
                          <p className="text-text-primary">{substation.utility || '—'}</p>
                        </div>
                        <div>
                          <span className="text-text-muted text-xs">Capacity</span>
                          <p className="text-text-primary">{substation.capacity_mw}MW total · {substation.available_mw}MW available</p>
                        </div>
                        <div>
                          <span className="text-text-muted text-xs">Voltage</span>
                          <p className="text-text-primary">{substation.voltage_kv}kV</p>
                        </div>
                        {site.distance_to_substation_mi && (
                          <div>
                            <span className="text-text-muted text-xs">Distance</span>
                            <p className="text-text-primary">{site.distance_to_substation_mi.toFixed(1)} miles</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">No substation linked</p>
                    )}
                  </div>

                  {/* Target Capacity */}
                  <div className="glass-card p-4">
                    <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Target Capacity</h3>
                    <p className="text-3xl font-display font-bold text-text-primary">
                      {site.target_mw || '—'}<span className="text-sm text-text-muted ml-1">MW</span>
                    </p>
                  </div>

                  {/* Notes */}
                  {site.notes && (
                    <div className="glass-card p-4">
                      <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Notes</h3>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{site.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-text-muted text-sm">Site not found.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
