'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Link2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { Integration } from '@/lib/types';

const platformMeta: Record<string, { label: string; description: string }> = {
  appfolio: { label: 'AppFolio', description: 'Sync properties, tenants, leases, and work orders from AppFolio' },
  buildium: { label: 'Buildium', description: 'Connect to Buildium for property management data sync' },
  yardi: { label: 'Yardi Voyager', description: 'Import data from Yardi (Phase 2)' },
  rent_manager: { label: 'Rent Manager', description: 'Connect to Rent Manager (Phase 2)' },
};

const statusIcons: Record<string, React.ReactNode> = {
  connected: <CheckCircle2 size={16} className="text-green-500" />,
  disconnected: <XCircle size={16} className="text-gray-400" />,
  error: <XCircle size={16} className="text-red-500" />,
  syncing: <Loader2 size={16} className="text-blue-500 animate-spin" />,
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const { data } = await supabase
        .from('integrations')
        .select('id, org_id, platform, auth_type, status, last_sync_at, last_sync_status, last_sync_records, sync_config, created_by, created_at, updated_at')
        .eq('org_id', profile.org_id);

      setIntegrations((data as Integration[]) || []);
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const connectedPlatforms = new Set(integrations.map((i) => i.platform));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Integrations</h1>
        <p className="text-sm text-text-secondary">Connect your property management platform to sync data automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(platformMeta).map(([platform, meta]) => {
          const integration = integrations.find((i) => i.platform === platform);
          const isConnected = integration?.status === 'connected';

          return (
            <div key={platform} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{meta.label}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{meta.description}</p>
                </div>
                {integration ? statusIcons[integration.status] : statusIcons.disconnected}
              </div>

              {integration ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>Status: <span className="capitalize text-text-secondary">{integration.status}</span></span>
                    {integration.last_sync_at && (
                      <span>· Last sync: {new Date(integration.last_sync_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors">
                    {isConnected ? 'Sync Now' : 'Reconnect'}
                  </button>
                </div>
              ) : (
                <button className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors">
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
