'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Bot,
  Megaphone,
  Play,
  Pause,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VoiceStats {
  totalCalls: number;
  callsToday: number;
  aiPercent: number;
  activeCampaigns: number;
}

interface VoiceConversation {
  id: string;
  participant_name: string | null;
  participant_phone: string | null;
  status: string;
  created_at: string;
  direction?: string;
  duration?: number;
  last_message_at: string | null;
}

interface VoiceCampaign {
  id: string;
  name: string;
  type: string;
  status: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  scheduled_at: string;
  created_at: string;
}

interface TranscriptMessage {
  id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds?: number) {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const campaignTypeLabels: Record<string, string> = {
  rent_reminder: 'Rent Reminder',
  maintenance_update: 'Maintenance Update',
  lease_renewal: 'Lease Renewal',
  showing_confirmation: 'Showing Confirmation',
};

const campaignStatusConfig: Record<string, { variant: 'success' | 'info' | 'warning' | 'danger' | 'muted'; label: string }> = {
  running: { variant: 'info', label: 'Running' },
  scheduled: { variant: 'warning', label: 'Scheduled' },
  completed: { variant: 'success', label: 'Completed' },
  paused: { variant: 'muted', label: 'Paused' },
  failed: { variant: 'danger', label: 'Failed' },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function VoiceAIPage() {
  const [stats, setStats] = useState<VoiceStats | null>(null);
  const [calls, setCalls] = useState<VoiceConversation[]>([]);
  const [campaigns, setCampaigns] = useState<VoiceCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calls' | 'campaigns'>('calls');

  // Transcript modal
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [selectedCall, setSelectedCall] = useState<VoiceConversation | null>(null);

  // New campaign modal
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [newCampaignType, setNewCampaignType] = useState('rent_reminder');
  const [creating, setCreating] = useState(false);

  /* ---------- Data fetching ---------- */

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/voice/stats');
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const json = await res.json();
        const voiceCalls = (json.conversations || []).filter(
          (c: any) => c.channel === 'voice',
        );
        setCalls(voiceCalls);
      }
    } catch { /* silent */ }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/voice/campaigns');
      if (res.ok) {
        const json = await res.json();
        setCampaigns(json.campaigns || []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchStats(), fetchCalls(), fetchCampaigns()]).finally(() =>
      setLoading(false),
    );
  }, [fetchStats, fetchCalls, fetchCampaigns]);

  /* ---------- Transcript ---------- */

  const openTranscript = async (call: VoiceConversation) => {
    setSelectedCall(call);
    setTranscriptOpen(true);
    setTranscriptLoading(true);
    try {
      const res = await fetch(`/api/conversations/${call.id}/messages`);
      if (res.ok) {
        const json = await res.json();
        setTranscriptMessages(json.messages || []);
      }
    } catch { /* silent */ } finally {
      setTranscriptLoading(false);
    }
  };

  /* ---------- Pause / Resume ---------- */

  const toggleCampaign = async (campaign: VoiceCampaign) => {
    const action = campaign.status === 'paused' ? 'resume' : 'pause';
    try {
      const res = await fetch(`/api/voice/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(`Campaign ${action === 'pause' ? 'paused' : 'resumed'}`);
        fetchCampaigns();
        fetchStats();
      } else {
        toast.error('Failed to update campaign');
      }
    } catch {
      toast.error('Network error');
    }
  };

  /* ---------- New Campaign ---------- */

  const createCampaign = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/voice/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newCampaignType }),
      });
      if (res.ok) {
        toast.success('Campaign created');
        setNewCampaignOpen(false);
        fetchCampaigns();
        fetchStats();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to create campaign');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setCreating(false);
    }
  };

  /* ---------- Loading state ---------- */

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-10 w-64" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  /* ---------- KPI cards ---------- */

  const kpis = [
    {
      label: 'Total Calls',
      value: stats?.totalCalls ?? 0,
      icon: <Phone size={20} />,
      color: '#00D4AA',
    },
    {
      label: 'Calls Today',
      value: stats?.callsToday ?? 0,
      icon: <PhoneCall size={20} />,
      color: '#3B82F6',
    },
    {
      label: 'AI-Handled',
      value: `${stats?.aiPercent ?? 0}%`,
      icon: <Bot size={20} />,
      color: '#8B5CF6',
    },
    {
      label: 'Active Campaigns',
      value: stats?.activeCampaigns ?? 0,
      icon: <Megaphone size={20} />,
      color: '#F59E0B',
    },
  ];

  const tabs = [
    { key: 'calls' as const, label: 'Call Log' },
    { key: 'campaigns' as const, label: 'Campaigns' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary flex items-center gap-2">
            <Phone size={22} className="text-accent" />
            Voice AI
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Automated outbound calls, inbound handling, and campaign management
          </p>
        </div>
        <Button
          icon={<Plus size={16} />}
          onClick={() => setNewCampaignOpen(true)}
        >
          New Campaign
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                {kpi.label}
              </span>
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center"
                style={{ background: `${kpi.color}15`, color: kpi.color }}
              >
                {kpi.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              relative px-4 py-2.5 text-sm font-medium transition-colors
              ${activeTab === tab.key
                ? 'text-accent'
                : 'text-text-muted hover:text-text-secondary'
              }
            `}
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="voice-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'calls' ? (
          <motion.div
            key="calls"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <CallLogTable calls={calls} onOpenTranscript={openTranscript} />
          </motion.div>
        ) : (
          <motion.div
            key="campaigns"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <CampaignsList campaigns={campaigns} onToggle={toggleCampaign} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript Modal */}
      <Modal open={transcriptOpen} onOpenChange={setTranscriptOpen}>
        <ModalContent maxWidth="lg">
          <ModalHeader
            title="Call Transcript"
            description={
              selectedCall
                ? `${selectedCall.participant_name || selectedCall.participant_phone || 'Unknown'} — ${formatDate(selectedCall.created_at)}`
                : undefined
            }
          />
          <div className="px-6 py-4 max-h-[400px] overflow-y-auto space-y-3">
            {transcriptLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-accent" />
              </div>
            ) : transcriptMessages.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">
                No transcript available for this call.
              </p>
            ) : (
              transcriptMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'ai' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-xl px-4 py-2.5 text-sm
                      ${msg.sender_type === 'ai'
                        ? 'bg-accent/10 text-text-primary border border-accent/20'
                        : 'bg-bg-elevated text-text-primary border border-border'
                      }
                    `}
                  >
                    <p className="text-[10px] font-semibold text-text-muted mb-1 uppercase">
                      {msg.sender_type === 'ai' ? 'AI Agent' : 'Caller'}
                    </p>
                    <p>{msg.content}</p>
                    <p className="text-[10px] text-text-muted mt-1">
                      {new Date(msg.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setTranscriptOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Campaign Modal */}
      <Modal open={newCampaignOpen} onOpenChange={setNewCampaignOpen}>
        <ModalContent maxWidth="sm">
          <ModalHeader
            title="New Voice Campaign"
            description="Select a campaign type to trigger automated outbound calls."
          />
          <div className="px-6 py-4">
            <SelectField
              label="Campaign Type"
              value={newCampaignType}
              onChange={(e) => setNewCampaignType(e.target.value)}
              options={[
                { value: 'rent_reminder', label: 'Rent Reminder' },
                { value: 'maintenance_update', label: 'Maintenance Update' },
                { value: 'lease_renewal', label: 'Lease Renewal' },
                { value: 'showing_confirmation', label: 'Showing Confirmation' },
              ]}
            />
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setNewCampaignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createCampaign}
              loading={creating}
              icon={<PhoneOutgoing size={16} />}
            >
              Launch Campaign
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

/* ================================================================== */
/*  Call Log Table                                                     */
/* ================================================================== */

function CallLogTable({
  calls,
  onOpenTranscript,
}: {
  calls: VoiceConversation[];
  onOpenTranscript: (c: VoiceConversation) => void;
}) {
  if (calls.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <Phone size={48} className="mx-auto text-text-muted mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">No voice calls yet</h3>
        <p className="text-sm text-text-secondary">
          Voice call records will appear here when calls are made or received.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Participant
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Direction
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call, i) => {
              const direction = call.direction || 'inbound';
              const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'muted'> = {
                active: 'success',
                ai_handling: 'info',
                human_handling: 'warning',
                escalated: 'danger',
                closed: 'muted',
              };

              return (
                <motion.tr
                  key={call.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onOpenTranscript(call)}
                  className="border-b border-border/50 hover:bg-bg-elevated/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {call.participant_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {call.participant_phone || '--'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                      {direction === 'outbound' ? (
                        <PhoneOutgoing size={13} className="text-accent" />
                      ) : (
                        <PhoneIncoming size={13} className="text-blue" />
                      )}
                      {direction === 'outbound' ? 'Outbound' : 'Inbound'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                    {formatDuration(call.duration)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={statusVariant[call.status] || 'muted'}
                      size="sm"
                      dot
                    >
                      {call.status?.replace(/_/g, ' ') || 'unknown'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                    {formatDate(call.created_at)}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Campaigns List                                                     */
/* ================================================================== */

function CampaignsList({
  campaigns,
  onToggle,
}: {
  campaigns: VoiceCampaign[];
  onToggle: (c: VoiceCampaign) => void;
}) {
  if (campaigns.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <Megaphone size={48} className="mx-auto text-text-muted mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">No campaigns yet</h3>
        <p className="text-sm text-text-secondary">
          Create a voice campaign to start automated outbound calling.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((c, i) => {
        const stCfg = campaignStatusConfig[c.status] || campaignStatusConfig.completed;
        const canToggle = c.status === 'running' || c.status === 'paused';

        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Left info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-text-primary truncate">
                    {c.name}
                  </h3>
                  <Badge variant="accent" size="sm">
                    {campaignTypeLabels[c.type] || c.type}
                  </Badge>
                  <Badge variant={stCfg.variant} size="sm" dot>
                    {stCfg.label}
                  </Badge>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Phone size={12} />
                    {c.total_calls} total
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-success" />
                    {c.successful_calls} successful
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle size={12} className="text-danger" />
                    {c.failed_calls} failed
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(c.scheduled_at || c.created_at)}
                  </span>
                </div>
              </div>

              {/* Action */}
              {canToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggle(c)}
                  icon={
                    c.status === 'running' ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} />
                    )
                  }
                >
                  {c.status === 'running' ? 'Pause' : 'Resume'}
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
