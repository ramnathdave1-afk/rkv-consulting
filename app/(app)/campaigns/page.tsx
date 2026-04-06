'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Plus,
  Search,
  Send,
  MessageSquare,
  Mail,
  Users,
  Zap,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, SelectField } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { CampaignFormModal } from '@/components/campaigns/CampaignFormModal';
import { CampaignDetailPanel } from '@/components/campaigns/CampaignDetailPanel';

/* ─── Types ──────────────────────────────────────────────────────── */

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  subject: string | null;
  recipients_count: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface KPIs {
  total: number;
  active: number;
  recipients_reached: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

const statusBadge: Record<string, { variant: any; label: string }> = {
  draft: { variant: 'muted', label: 'Draft' },
  scheduled: { variant: 'info', label: 'Scheduled' },
  active: { variant: 'accent', label: 'Active' },
  sending: { variant: 'warning', label: 'Sending' },
  paused: { variant: 'warning', label: 'Paused' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
  failed: { variant: 'danger', label: 'Failed' },
};

const channelBadge: Record<string, { variant: any; icon: React.ReactNode; label: string }> = {
  sms: { variant: 'info', icon: <MessageSquare size={12} />, label: 'SMS' },
  email: { variant: 'violet', icon: <Mail size={12} />, label: 'Email' },
  both: { variant: 'accent', icon: <Send size={12} />, label: 'Both' },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'sending', label: 'Sending' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

/* ─── KPI Card ───────────────────────────────────────────────────── */

function KPICard({
  title,
  value,
  icon,
  color,
  delay,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      className="bg-bg-secondary/60 backdrop-blur-md border border-border rounded-xl p-5 flex items-center gap-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg"
        style={{ background: `${color}15` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-text-primary">
          {value}
        </p>
        <p className="text-xs text-text-muted">{title}</p>
      </div>
    </motion.div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [kpis, setKpis] = useState<KPIs>({ total: 0, active: 0, recipients_reached: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/campaigns?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setCampaigns(data.campaigns || []);
        setKpis(data.kpis || { total: 0, active: 0, recipients_reached: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return (
    <div className="min-h-screen p-6 md:p-8 space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
            <Megaphone size={24} className="text-accent" />
            Campaigns
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Send bulk SMS and email campaigns to your tenants
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus size={16} />}
          onClick={() => setFormOpen(true)}
        >
          New Campaign
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Total Campaigns"
          value={loading ? '--' : kpis.total}
          icon={<Megaphone size={20} />}
          color="#3B82F6"
          delay={0}
        />
        <KPICard
          title="Active"
          value={loading ? '--' : kpis.active}
          icon={<Zap size={20} />}
          color="#00D4AA"
          delay={0.05}
        />
        <KPICard
          title="Recipients Reached"
          value={loading ? '--' : kpis.recipients_reached.toLocaleString()}
          icon={<BarChart3 size={20} />}
          color="#8B5CF6"
          delay={0.1}
        />
      </div>

      {/* Filters */}
      <motion.div
        className="flex flex-col sm:flex-row gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-48">
          <SelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        className="bg-bg-secondary/60 backdrop-blur-md border border-border rounded-xl overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-20 text-center">
            <Megaphone size={40} className="mx-auto text-text-muted mb-3 opacity-40" />
            <p className="text-text-secondary text-sm">No campaigns found</p>
            <p className="text-text-muted text-xs mt-1">
              Create your first campaign to start reaching tenants
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-elevated/50 text-text-muted text-xs uppercase tracking-wider border-b border-border">
                  <th className="text-left px-5 py-3 font-semibold">Name</th>
                  <th className="text-left px-5 py-3 font-semibold">Channel</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Recipients</th>
                  <th className="text-right px-5 py-3 font-semibold">Sent</th>
                  <th className="text-right px-5 py-3 font-semibold">Delivered</th>
                  <th className="text-right px-5 py-3 font-semibold">Failed</th>
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((c, idx) => {
                  const sBadge = statusBadge[c.status] || { variant: 'muted', label: c.status };
                  const cBadge = channelBadge[c.channel] || { variant: 'muted', icon: null, label: c.channel };
                  return (
                    <motion.tr
                      key={c.id}
                      className="hover:bg-bg-elevated/30 transition-colors cursor-pointer"
                      onClick={() => setDetailId(c.id)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * idx, duration: 0.2 }}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-text-primary font-medium">{c.name}</p>
                        {c.subject && (
                          <p className="text-text-muted text-xs mt-0.5 truncate max-w-[200px]">
                            {c.subject}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={cBadge.variant} size="sm">
                          <span className="flex items-center gap-1">
                            {cBadge.icon}
                            {cBadge.label}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={sBadge.variant} size="sm" dot>
                          {sBadge.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right text-text-secondary tabular-nums">
                        {c.recipients_count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-text-secondary tabular-nums">
                        {c.sent_count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-accent tabular-nums font-medium">
                        {c.delivered_count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-danger tabular-nums">
                        {c.failed_count}
                      </td>
                      <td className="px-5 py-3.5 text-text-muted text-xs whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Campaign Form Modal */}
      <CampaignFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={fetchCampaigns}
      />

      {/* Campaign Detail Panel */}
      <CampaignDetailPanel
        campaignId={detailId}
        onClose={() => setDetailId(null)}
        onRefresh={fetchCampaigns}
      />
    </div>
  );
}
