'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { MapPin, Zap, Building2, Shield, TrendingUp, Wifi, Download, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PIPELINE_STAGES } from '@/lib/constants';
import { Skeleton } from '@/components/ui/Skeleton';
import { ScoreGauge } from '@/components/reports/ScoreGauge';
import { ScoreBreakdown } from '@/components/reports/ScoreBreakdown';
import Link from 'next/link';
import type { GhostSite, SiteScore, Substation } from '@/lib/types';

export default function SiteDetailPage() {
  const { id } = useParams();
  const [site, setSite] = useState<GhostSite | null>(null);
  const [score, setScore] = useState<SiteScore | null>(null);
  const [substation, setSubstation] = useState<Substation | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSite() {
      const { data: siteData } = await supabase
        .from('ghost_sites')
        .select('*')
        .eq('id', id)
        .single();

      if (siteData) {
        setSite(siteData);

        const [scoreRes, subRes] = await Promise.all([
          supabase.from('site_scores').select('*').eq('site_id', siteData.id).order('scored_at', { ascending: false }).limit(1).single(),
          siteData.nearest_substation_id
            ? supabase.from('substations').select('*').eq('id', siteData.nearest_substation_id).single()
            : Promise.resolve({ data: null }),
        ]);

        setScore(scoreRes.data);
        setSubstation(subRes.data);
      }

      setLoading(false);
    }

    if (id) fetchSite();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="p-6">
        <p className="text-text-secondary">Site not found.</p>
        <Link href="/sites" className="text-sm text-accent hover:text-accent-hover mt-2 inline-block">Back to sites</Link>
      </div>
    );
  }

  const stage = PIPELINE_STAGES.find((s) => s.value === site.pipeline_stage);

  const scoreCards = score ? [
    { key: 'grid_score', label: 'Grid', value: score.grid_score, icon: Zap, color: '#3B82F6' },
    { key: 'land_score', label: 'Land', value: score.land_score, icon: MapPin, color: '#22C55E' },
    { key: 'risk_score', label: 'Risk', value: score.risk_score, icon: Shield, color: '#EF4444' },
    { key: 'market_score', label: 'Market', value: score.market_score, icon: TrendingUp, color: '#F59E0B' },
    { key: 'connectivity_score', label: 'Connectivity', value: score.connectivity_score, icon: Wifi, color: '#8A00FF' },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/sites" className="flex items-center gap-1 text-xs text-text-muted hover:text-accent mb-2 transition-colors">
            <ArrowLeft size={12} /> Back to sites
          </Link>
          <h1 className="font-display text-2xl font-bold text-text-primary">{site.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-text-secondary">
            <span>{site.state}{site.county ? `, ${site.county}` : ''}</span>
            {stage && <Badge color={stage.color} size="sm" dot>{stage.label}</Badge>}
          </div>
        </div>
        <a
          href={`/api/reports/${site.id}/pdf`}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
        >
          <Download size={14} /> Report
        </a>
      </div>

      {/* Score Section — Gauge + Radar */}
      {score && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="glass-card p-6 flex flex-col items-center justify-center">
            <ScoreGauge score={score.composite_score} size={140} label="Composite" />
          </div>
          <div className="glass-card p-6">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Score Breakdown</p>
            <ScoreBreakdown score={score} />
          </div>
        </motion.div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Location */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Location</h3>
          <p className="text-sm text-text-primary">{site.state}{site.county ? `, ${site.county}` : ''}</p>
          <p className="text-xs text-text-secondary mt-1">{site.lat?.toFixed(4)}, {site.lng?.toFixed(4)}</p>
          {site.acreage && <p className="text-xs text-text-secondary mt-1">{site.acreage} acres</p>}
          {site.zoning && <p className="text-xs text-text-secondary mt-1">Zoning: {site.zoning}</p>}
        </motion.div>

        {/* Grid */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Grid Connection</h3>
          {substation ? (
            <>
              <p className="text-sm text-text-primary">{substation.name}</p>
              <p className="text-xs text-text-secondary mt-1">{substation.capacity_mw}MW capacity · {substation.available_mw}MW available</p>
              <p className="text-xs text-text-secondary mt-1">{substation.voltage_kv}kV · {substation.utility}</p>
              {site.distance_to_substation_mi && (
                <p className="text-xs text-text-secondary mt-1">{site.distance_to_substation_mi.toFixed(1)} miles</p>
              )}
            </>
          ) : (
            <p className="text-xs text-text-muted">No substation linked</p>
          )}
        </motion.div>

        {/* Target */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Target Capacity</h3>
          <p className="text-2xl font-display font-bold text-text-primary">{site.target_mw || '—'}<span className="text-sm text-text-muted ml-1">MW</span></p>
        </motion.div>

        {/* Score dimensions */}
        {scoreCards.map((sc, i) => (
          <motion.div
            key={sc.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.05 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <sc.icon size={14} style={{ color: sc.color }} />
              <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">{sc.label}</h3>
            </div>
            <p className="text-2xl font-display font-bold" style={{ color: sc.color }}>{sc.value}</p>
            <div className="mt-2 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${sc.value}%`, backgroundColor: sc.color }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Notes */}
      {site.notes && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-4">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Notes</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{site.notes}</p>
        </motion.div>
      )}
    </div>
  );
}
