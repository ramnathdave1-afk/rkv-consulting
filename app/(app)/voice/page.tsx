'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
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
  Loader2,
  Mic,
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

const campaignStatusPill: Record<string, { label: string; classes: string }> = {
  running: { label: 'Running', classes: 'bg-sky-50 text-sky-700 border-sky-200' },
  scheduled: { label: 'Scheduled', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { label: 'Paused', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  failed: { label: 'Failed', classes: 'bg-red-50 text-red-700 border-red-200' },
};

const callStatusPill: Record<string, { label: string; classes: string }> = {
  active: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ai_handling: { label: 'AI Handling', classes: 'bg-sky-50 text-sky-700 border-sky-200' },
  human_handling: { label: 'Human', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  escalated: { label: 'Escalated', classes: 'bg-red-50 text-red-700 border-red-200' },
  closed: { label: 'Closed', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
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

  /* ---------- Loading ---------- */

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
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
    { label: 'Calls Today', value: stats?.callsToday ?? 0, icon: <PhoneCall size={18} /> },
    { label: 'Total Calls', value: stats?.totalCalls ?? 0, icon: <Phone size={18} /> },
    { label: 'AI-Handled', value: `${stats?.aiPercent ?? 0}%`, icon: <Bot size={18} /> },
    { label: 'Active Campaigns', value: stats?.activeCampaigns ?? 0, icon: <Megaphone size={18} /> },
  ];

  const tabs = [
    { key: 'calls' as const, label: 'Call Log' },
    { key: 'campaigns' as const, label: 'Campaigns' },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#020617] flex items-center gap-2">
            <Phone size={20} className="text-[#0369A1]" />
            Voice AI
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated outbound calls, inbound handling, and campaign management
          </p>
        </div>
        <button
          onClick={() => setNewCampaignOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white px-4 h-9 text-sm font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
        >
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-slate-200 rounded-lg p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {kpi.label}
              </span>
              <div className="h-9 w-9 rounded-md bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0369A1]">
                {kpi.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-[#020617] tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'text-[#0369A1]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0369A1] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'calls' ? (
        <CallLogTable calls={calls} onOpenTranscript={openTranscript} />
      ) : (
        <CampaignsList campaigns={campaigns} onToggle={toggleCampaign} />
      )}

      {/* Transcript Modal */}
      <Modal open={transcriptOpen} onOpenChange={setTranscriptOpen}>
        <ModalContent maxWidth="lg">
          <ModalHeader
            title="Call Transcript"
            description={
              selectedCall
                ? `${selectedCall.participant_name || selectedCall.participant_phone || 'Unknown'} - ${formatDate(selectedCall.created_at)}`
                : undefined
            }
          />
          <div className="px-6 py-4 max-h-[400px] overflow-y-auto space-y-3 bg-slate-50">
            {transcriptLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[#0369A1]" />
              </div>
            ) : transcriptMessages.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No transcript available for this call.
              </p>
            ) : (
              transcriptMessages.map((msg) => {
                const isAi = msg.sender_type === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAi ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        isAi ? 'bg-sky-100 text-[#020617]' : 'bg-slate-100 text-[#020617]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    <p className="text-xs tabular-nums text-slate-400 mt-1 px-1">
                      {isAi ? 'AI Agent' : 'Caller'} &middot;{' '}
                      {new Date(msg.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                );
              })
            )}
          </div>
          <ModalFooter>
            <button
              onClick={() => setTranscriptOpen(false)}
              className="inline-flex items-center justify-center rounded-md px-4 h-9 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Close
            </button>
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
            <button
              onClick={() => setNewCampaignOpen(false)}
              className="inline-flex items-center justify-center rounded-md px-4 h-9 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createCampaign}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white px-4 h-9 text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <PhoneOutgoing size={14} />}
              Launch Campaign
            </button>
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
      <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
        <Phone size={48} className="mx-auto text-slate-400 mb-4" />
        <h3 className="text-lg font-semibold text-[#020617] mb-2">No voice calls yet</h3>
        <p className="text-sm text-slate-500">
          Voice call records will appear here when calls are made or received.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Caller
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Direction
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Transcript
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {calls.map((call) => {
              const direction = call.direction || 'inbound';
              const stCfg = callStatusPill[call.status] || callStatusPill.closed;

              return (
                <tr
                  key={call.id}
                  onClick={() => onOpenTranscript(call)}
                  className="hover:bg-sky-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#020617]">
                        {call.participant_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {call.participant_phone || '--'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                      {direction === 'outbound' ? (
                        <PhoneOutgoing size={13} className="text-[#0369A1]" />
                      ) : (
                        <PhoneIncoming size={13} className="text-emerald-600" />
                      )}
                      {direction === 'outbound' ? 'Outbound' : 'Inbound'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 tabular-nums">
                    {formatDuration(call.duration)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${stCfg.classes}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {stCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(call.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-[#0369A1] hover:underline">
                      <Mic size={12} />
                      View
                    </span>
                  </td>
                </tr>
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
      <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
        <Megaphone size={48} className="mx-auto text-slate-400 mb-4" />
        <h3 className="text-lg font-semibold text-[#020617] mb-2">No campaigns yet</h3>
        <p className="text-sm text-slate-500">
          Create a voice campaign to start automated outbound calling.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((c) => {
        const stCfg = campaignStatusPill[c.status] || campaignStatusPill.completed;
        const canToggle = c.status === 'running' || c.status === 'paused';

        return (
          <div
            key={c.id}
            className="bg-white border border-slate-200 rounded-lg p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="text-sm font-semibold text-[#020617] truncate">
                    {c.name}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {campaignTypeLabels[c.type] || c.type}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${stCfg.classes}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {stCfg.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Phone size={12} />
                    <span className="tabular-nums">{c.total_calls}</span> total
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    <span className="tabular-nums">{c.successful_calls}</span> successful
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle size={12} className="text-red-600" />
                    <span className="tabular-nums">{c.failed_calls}</span> failed
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(c.scheduled_at || c.created_at)}
                  </span>
                </div>
              </div>

              {canToggle && (
                <button
                  onClick={() => onToggle(c)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {c.status === 'running' ? <Pause size={14} /> : <Play size={14} />}
                  {c.status === 'running' ? 'Pause' : 'Resume'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
