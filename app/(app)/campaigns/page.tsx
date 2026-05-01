'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Send,
  MessageSquare,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  MailOpen,
  MousePointerClick,
} from 'lucide-react';
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
  opened_count?: number;
  clicked_count?: number;
  failed_count: number;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface KPIs {
  total: number;
  active: number;
  recipients_reached: number;
  recipients?: number;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  failed?: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

const statusPill: Record<string, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  scheduled: { label: 'Scheduled', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  active: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  sending: { label: 'Sending', classes: 'bg-sky-50 text-sky-700 border-sky-200' },
  paused: { label: 'Paused', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Sent', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-50 text-red-700 border-red-200' },
  failed: { label: 'Failed', classes: 'bg-red-50 text-red-700 border-red-200' },
};

const channelMeta: Record<string, { icon: React.ReactNode; label: string }> = {
  sms: { icon: <MessageSquare size={12} />, label: 'SMS' },
  email: { icon: <Mail size={12} />, label: 'Email' },
  both: { icon: <Send size={12} />, label: 'Both' },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'sending', label: 'Sending' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Sent' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

/* ─── KPI Card ───────────────────────────────────────────────────── */

function KPICard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
      <div className="flex items-center justify-center h-9 w-9 rounded-md bg-sky-50 border border-sky-200 text-[#0369A1]">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-[#020617] tabular-nums leading-tight">
          {value}
        </p>
        <p className="text-xs text-slate-500">{title}</p>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [kpis, setKpis] = useState<KPIs>({ total: 0, active: 0, recipients_reached: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  // Aggregate KPIs from campaigns when not provided directly
  const totalRecipients = kpis.recipients ?? campaigns.reduce((s, c) => s + (c.recipients_count || 0), 0);
  const totalSent = kpis.sent ?? campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
  const totalDelivered = kpis.delivered ?? campaigns.reduce((s, c) => s + (c.delivered_count || 0), 0);
  const totalOpened = kpis.opened ?? campaigns.reduce((s, c) => s + (c.opened_count || 0), 0);
  const totalClicked = kpis.clicked ?? campaigns.reduce((s, c) => s + (c.clicked_count || 0), 0);
  const totalFailed = kpis.failed ?? campaigns.reduce((s, c) => s + (c.failed_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#020617] flex items-center gap-2">
            <Megaphone size={20} className="text-[#0369A1]" />
            Campaigns
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Send bulk SMS and email campaigns to your tenants
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white px-4 h-9 text-sm font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
        >
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          title="Recipients"
          value={loading ? '--' : totalRecipients.toLocaleString()}
          icon={<Users size={16} />}
        />
        <KPICard
          title="Sent"
          value={loading ? '--' : totalSent.toLocaleString()}
          icon={<Send size={16} />}
        />
        <KPICard
          title="Delivered"
          value={loading ? '--' : totalDelivered.toLocaleString()}
          icon={<CheckCircle2 size={16} />}
        />
        <KPICard
          title="Opened"
          value={loading ? '--' : totalOpened.toLocaleString()}
          icon={<MailOpen size={16} />}
        />
        <KPICard
          title="Clicked"
          value={loading ? '--' : totalClicked.toLocaleString()}
          icon={<MousePointerClick size={16} />}
        />
        <KPICard
          title="Failed"
          value={loading ? '--' : totalFailed.toLocaleString()}
          icon={<XCircle size={16} />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
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
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-20 text-center">
            <Megaphone size={40} className="mx-auto text-slate-400 mb-3" />
            <p className="text-[#020617] text-sm font-medium">No campaigns found</p>
            <p className="text-slate-500 text-xs mt-1">
              Create your first campaign to start reaching tenants
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-semibold">Name</th>
                  <th className="text-left px-5 py-3 font-semibold">Channel</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Audience</th>
                  <th className="text-right px-5 py-3 font-semibold">Sent</th>
                  <th className="text-right px-5 py-3 font-semibold">Delivered</th>
                  <th className="text-right px-5 py-3 font-semibold">Failed</th>
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {campaigns.map((c) => {
                  const stCfg = statusPill[c.status] || { label: c.status, classes: 'bg-slate-100 text-slate-600 border-slate-200' };
                  const chCfg = channelMeta[c.channel] || { icon: null, label: c.channel };
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-sky-50/50 transition-colors cursor-pointer"
                      onClick={() => setDetailId(c.id)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-[#020617] font-medium">{c.name}</p>
                        {c.subject && (
                          <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[240px]">
                            {c.subject}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {chCfg.icon}
                          {chCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${stCfg.classes}`}>
                          <span className={`h-1.5 w-1.5 rounded-full bg-current ${c.status === 'sending' ? 'animate-pulse' : ''}`} />
                          {stCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-700 tabular-nums">
                        {c.recipients_count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-700 tabular-nums">
                        {c.sent_count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-emerald-600 tabular-nums font-medium">
                        {c.delivered_count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-red-600 tabular-nums">
                        {c.failed_count}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CampaignFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={fetchCampaigns}
      />

      <CampaignDetailPanel
        campaignId={detailId}
        onClose={() => setDetailId(null)}
        onRefresh={fetchCampaigns}
      />
    </div>
  );
}
