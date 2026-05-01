'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Send,
  Pause,
  Play,
  Ban,
  Mail,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

interface CampaignDetail {
  id: string;
  name: string;
  channel: string;
  status: string;
  subject: string | null;
  message_body: string;
  recipients_count: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  opened_count: number;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Recipient {
  id: string;
  name: string;
  contact: string;
  channel: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
}

interface Stats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
}

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

const recipientStatusPill: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  sent: { label: 'Sent', classes: 'bg-sky-50 text-sky-700 border-sky-200' },
  delivered: { label: 'Delivered', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  opened: { label: 'Opened', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Failed', classes: 'bg-red-50 text-red-700 border-red-200' },
};

const channelIcon: Record<string, React.ReactNode> = {
  sms: <MessageSquare size={14} />,
  email: <Mail size={14} />,
  both: <Send size={14} />,
};

interface CampaignDetailPanelProps {
  campaignId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function CampaignDetailPanel({
  campaignId,
  onClose,
  onRefresh,
}: CampaignDetailPanelProps) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      const data = await res.json();
      if (res.ok) {
        setCampaign(data.campaign);
        setRecipients(data.recipients);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load campaign detail', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!campaignId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(`Campaign ${action}d`);
        fetchDetail();
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to ${action}`);
      }
    } catch {
      toast.error(`Failed to ${action} campaign`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    if (!campaignId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('Campaign sending started');
        fetchDetail();
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send campaign');
    } finally {
      setActionLoading(false);
    }
  };

  function ProgressBar({
    label,
    value,
    total,
    color,
  }: {
    label: string;
    value: number;
    total: number;
    color: string;
  }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">{label}</span>
          <span className="text-[#020617] font-semibold tabular-nums">
            {value} ({pct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ background: color, width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (!campaignId) return null;

  const stCfg = campaign ? statusPill[campaign.status] || statusPill.draft : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl h-full bg-white border-l border-slate-200 overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[#020617] truncate">
                  {campaign?.name}
                </h2>
                {campaign && stCfg && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${stCfg.classes}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {stCfg.label}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : campaign && stats ? (
          <div className="p-6 space-y-6">
            {/* Meta info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Channel</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#020617]">
                  <span className="text-[#0369A1]">{channelIcon[campaign.channel]}</span>
                  <span className="capitalize">{campaign.channel}</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Created</p>
                <p className="text-sm font-semibold text-[#020617]">
                  {new Date(campaign.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Recipients</p>
                <p className="text-sm font-semibold text-[#020617] tabular-nums">
                  {campaign.recipients_count}
                </p>
              </div>
            </div>

            {/* Message preview */}
            {campaign.message_body && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Message Preview
                </h3>
                {campaign.subject && (
                  <p className="text-sm text-[#020617]"><span className="text-slate-500">Subject: </span>{campaign.subject}</p>
                )}
                <p className="text-sm text-[#020617] whitespace-pre-wrap leading-relaxed">
                  {campaign.message_body}
                </p>
              </div>
            )}

            {/* Delivery Stats */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#020617]">
                Delivery Breakdown
              </h3>
              <ProgressBar label="Sent" value={stats.sent} total={stats.total} color="#0369A1" />
              <ProgressBar label="Delivered" value={stats.delivered} total={stats.total} color="#10b981" />
              <ProgressBar label="Opened" value={stats.opened} total={stats.total} color="#0369A1" />
              <ProgressBar label="Failed" value={stats.failed} total={stats.total} color="#ef4444" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                <button
                  onClick={handleSend}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white px-3 h-8 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
                >
                  {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Send Now
                </button>
              )}
              {(campaign.status === 'active' || campaign.status === 'sending') && (
                <button
                  onClick={() => handleAction('pause')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 h-8 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-60"
                >
                  <Pause size={12} />
                  Pause
                </button>
              )}
              {campaign.status === 'paused' && (
                <button
                  onClick={() => handleAction('resume')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white px-3 h-8 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-60"
                >
                  <Play size={12} />
                  Resume
                </button>
              )}
              {!['completed', 'cancelled', 'failed'].includes(campaign.status) && (
                <button
                  onClick={() => handleAction('cancel')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 h-8 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-60"
                >
                  <Ban size={12} />
                  Cancel
                </button>
              )}
            </div>

            {/* Recipients Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#020617]">
                Recipients ({recipients.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold">Name</th>
                      <th className="text-left px-4 py-3 font-semibold">Contact</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {recipients.map((r) => {
                      const rCfg = recipientStatusPill[r.status] || recipientStatusPill.pending;
                      return (
                        <tr key={r.id} className="hover:bg-sky-50/50 transition-colors">
                          <td className="px-4 py-3 text-[#020617] font-medium">
                            {r.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono">
                            {r.contact}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${rCfg.classes}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {rCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs tabular-nums">
                            {r.sent_at
                              ? new Date(r.sent_at).toLocaleString()
                              : '--'}
                          </td>
                        </tr>
                      );
                    })}
                    {recipients.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No recipients yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
