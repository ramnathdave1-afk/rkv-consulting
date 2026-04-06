'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Pause,
  Play,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

const recipientStatusBadge: Record<string, { variant: any; label: string }> = {
  pending: { variant: 'muted', label: 'Pending' },
  sent: { variant: 'info', label: 'Sent' },
  delivered: { variant: 'success', label: 'Delivered' },
  opened: { variant: 'accent', label: 'Opened' },
  failed: { variant: 'danger', label: 'Failed' },
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
          <span className="text-text-secondary">{label}</span>
          <span className="text-text-primary font-semibold">
            {value} ({pct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {campaignId && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-2xl h-full bg-bg-secondary border-l border-border overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-bg-secondary/95 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                {loading ? (
                  <Skeleton className="h-6 w-48" />
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-display font-bold text-text-primary truncate">
                      {campaign?.name}
                    </h2>
                    {campaign && (
                      <Badge
                        variant={statusBadge[campaign.status]?.variant || 'muted'}
                        dot
                        size="sm"
                      >
                        {statusBadge[campaign.status]?.label || campaign.status}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-bg-primary/50 border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Channel</p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      {channelIcon[campaign.channel]}
                      <span className="capitalize">{campaign.channel}</span>
                    </div>
                  </div>
                  <div className="bg-bg-primary/50 border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Created</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-bg-primary/50 border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Recipients</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {campaign.recipients_count}
                    </p>
                  </div>
                </div>

                {/* Delivery Stats */}
                <div className="bg-bg-primary/50 border border-border rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Delivery Breakdown
                  </h3>
                  <ProgressBar
                    label="Sent"
                    value={stats.sent}
                    total={stats.total}
                    color="#3B82F6"
                  />
                  <ProgressBar
                    label="Delivered"
                    value={stats.delivered}
                    total={stats.total}
                    color="#00D4AA"
                  />
                  <ProgressBar
                    label="Opened"
                    value={stats.opened}
                    total={stats.total}
                    color="#8B5CF6"
                  />
                  <ProgressBar
                    label="Failed"
                    value={stats.failed}
                    total={stats.total}
                    color="#EF4444"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Send size={14} />}
                      loading={actionLoading}
                      onClick={handleSend}
                    >
                      Send Now
                    </Button>
                  )}
                  {(campaign.status === 'active' || campaign.status === 'sending') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Pause size={14} />}
                      loading={actionLoading}
                      onClick={() => handleAction('pause')}
                    >
                      Pause
                    </Button>
                  )}
                  {campaign.status === 'paused' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Play size={14} />}
                      loading={actionLoading}
                      onClick={() => handleAction('resume')}
                    >
                      Resume
                    </Button>
                  )}
                  {!['completed', 'cancelled', 'failed'].includes(campaign.status) && (
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Ban size={14} />}
                      loading={actionLoading}
                      onClick={() => handleAction('cancel')}
                    >
                      Cancel
                    </Button>
                  )}
                </div>

                {/* Recipients Table */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Recipients ({recipients.length})
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-bg-elevated/50 text-text-muted text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-3 font-semibold">
                            Name
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            Contact
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            Status
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            Sent At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {recipients.map((r) => {
                          const badge = recipientStatusBadge[r.status] || {
                            variant: 'muted',
                            label: r.status,
                          };
                          return (
                            <tr
                              key={r.id}
                              className="hover:bg-bg-elevated/30 transition-colors"
                            >
                              <td className="px-4 py-3 text-text-primary font-medium">
                                {r.name}
                              </td>
                              <td className="px-4 py-3 text-text-secondary">
                                {r.contact}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={badge.variant} size="sm">
                                  {badge.label}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-text-muted text-xs">
                                {r.sent_at
                                  ? new Date(r.sent_at).toLocaleString()
                                  : '--'}
                              </td>
                            </tr>
                          );
                        })}
                        {recipients.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-8 text-center text-text-muted"
                            >
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
