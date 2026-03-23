'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ConnectIntegrationModal } from '@/components/integrations/ConnectIntegrationModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import type { Integration } from '@/lib/types';

const platformMeta: Record<string, { label: string; description: string; phase: number }> = {
  appfolio: { label: 'AppFolio', description: 'Sync properties, tenants, leases, and work orders', phase: 1 },
  buildium: { label: 'Buildium', description: 'Connect for property management data sync', phase: 1 },
  yardi: { label: 'Yardi Voyager', description: 'Enterprise-grade PM platform integration', phase: 2 },
  rent_manager: { label: 'Rent Manager', description: 'Sync rental management data', phase: 2 },
  doorloop: { label: 'DoorLoop', description: 'Modern PM platform integration', phase: 2 },
  realpage: { label: 'RealPage', description: 'Connect RealPage for data sync', phase: 2 },
};

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  connected: { icon: <CheckCircle2 size={16} />, label: 'Connected', color: 'text-green-500' },
  disconnected: { icon: <XCircle size={16} />, label: 'Disconnected', color: 'text-gray-400' },
  error: { icon: <XCircle size={16} />, label: 'Error', color: 'text-red-500' },
  syncing: { icon: <Loader2 size={16} className="animate-spin" />, label: 'Syncing', color: 'text-blue-500' },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectPlatform, setConnectPlatform] = useState<string | null>(null);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchIntegrations = useCallback(async () => {
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
  }, [supabase]);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  async function handleSync(integrationId: string) {
    setSyncingId(integrationId);
    try {
      const res = await fetch(`/api/integrations/${integrationId}/sync`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Sync failed');
      toast.success('Sync started');
      fetchIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDisconnect() {
    if (!disconnectId) return;
    try {
      const res = await fetch(`/api/integrations/${disconnectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
      toast.success('Integration disconnected');
      fetchIntegrations();
    } catch {
      toast.error('Failed to disconnect');
    }
    setDisconnectId(null);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Integrations</h1>
        <p className="text-sm text-text-secondary">Connect your PM platform to sync data automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(platformMeta).map(([platform, meta]) => {
          const integration = integrations.find((i) => i.platform === platform);
          const status = integration ? statusConfig[integration.status] : statusConfig.disconnected;

          return (
            <div key={platform} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{meta.label}</h3>
                    {meta.phase > 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-yellow-500/10 text-yellow-500">Phase {meta.phase}</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{meta.description}</p>
                </div>
                <span className={status.color}>{status.icon}</span>
              </div>

              {integration ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className={status.color}>{status.label}</span>
                    {integration.last_sync_at && (
                      <span>Last sync: {formatDistanceToNow(new Date(integration.last_sync_at), { addSuffix: true })}</span>
                    )}
                    {integration.last_sync_records > 0 && (
                      <span>{integration.last_sync_records} records</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<RefreshCw size={13} className={syncingId === integration.id ? 'animate-spin' : ''} />}
                      onClick={() => handleSync(integration.id)}
                      loading={syncingId === integration.id}
                    >
                      Sync Now
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Unlink size={13} />}
                      onClick={() => setDisconnectId(integration.id)}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setConnectPlatform(platform)}
                >
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {connectPlatform && (
        <ConnectIntegrationModal
          open={!!connectPlatform}
          onOpenChange={(open) => { if (!open) setConnectPlatform(null); }}
          platform={connectPlatform}
          platformLabel={platformMeta[connectPlatform]?.label || connectPlatform}
          onSuccess={fetchIntegrations}
        />
      )}

      <ConfirmDialog
        open={!!disconnectId}
        onOpenChange={(open) => { if (!open) setDisconnectId(null); }}
        title="Disconnect Integration"
        description="This will disconnect the integration. Your existing synced data will remain. You can reconnect anytime."
        onConfirm={handleDisconnect}
        confirmLabel="Disconnect"
        variant="danger"
      />
    </div>
  );
}
