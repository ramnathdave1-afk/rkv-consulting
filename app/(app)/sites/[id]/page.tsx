'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Download, LayoutGrid, Cpu, Calculator, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { ScoreGauge } from '@/components/reports/ScoreGauge';
import { OverviewTab } from '@/components/sites/OverviewTab';
import { TechnicalTab } from '@/components/sites/TechnicalTab';
import { ProFormaTab } from '@/components/sites/ProFormaTab';
import { RegulatoryTab } from '@/components/sites/RegulatoryTab';
import { Skeleton } from '@/components/ui/Skeleton';
import { PIPELINE_STAGES } from '@/lib/constants';
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
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="p-4">
        <p className="text-xs text-text-secondary">Site not found.</p>
        <Link href="/sites" className="text-xs text-accent hover:text-accent-hover mt-1 inline-block">Back to portfolio</Link>
      </div>
    );
  }

  const stage = PIPELINE_STAGES.find((s) => s.value === site.pipeline_stage);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sites" className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent transition-colors">
            <ArrowLeft size={11} />
          </Link>
          {score && <ScoreGauge score={score.composite_score} size={48} strokeWidth={4} />}
          <div>
            <h1 className="font-display text-lg font-bold text-text-primary">{site.name}</h1>
            <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
              <span>{site.state}{site.county ? `, ${site.county}` : ''}</span>
              {stage && <Badge color={stage.color} size="sm">{stage.label}</Badge>}
              {site.target_mw && <span className="font-mono">{site.target_mw} MW</span>}
            </div>
          </div>
        </div>
        <a
          href={`/api/reports/${site.id}/pdf`}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
        >
          <Download size={12} /> PDF Report
        </a>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" icon={<LayoutGrid size={12} />}>Overview</TabsTrigger>
          <TabsTrigger value="technical" icon={<Cpu size={12} />}>Technical</TabsTrigger>
          <TabsTrigger value="proforma" icon={<Calculator size={12} />}>Pro Forma</TabsTrigger>
          <TabsTrigger value="regulatory" icon={<Scale size={12} />}>Regulatory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab site={site} score={score} substation={substation} />
        </TabsContent>
        <TabsContent value="technical">
          <TechnicalTab site={site} substation={substation} />
        </TabsContent>
        <TabsContent value="proforma">
          <ProFormaTab site={site} />
        </TabsContent>
        <TabsContent value="regulatory">
          <RegulatoryTab site={site} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
