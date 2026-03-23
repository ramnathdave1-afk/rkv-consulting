'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import {
  MessageSquare,
  Search,
  Phone,
  Mail,
  MessageCircle,
  Bot,
  UserCheck,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { ConversationChannel, ConversationStatus } from '@/lib/types';

interface ConversationRow {
  id: string;
  channel: ConversationChannel;
  participant_phone: string | null;
  participant_name: string | null;
  participant_email: string | null;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
  tenants: { first_name: string; last_name: string } | null;
  properties: { name: string } | null;
  last_message_preview: string | null;
  last_message_sender_type: string | null;
}

const channelConfig: Record<ConversationChannel, { label: string; icon: React.ReactNode; variant: 'info' | 'accent' | 'violet' | 'muted' }> = {
  sms: { label: 'SMS', icon: <Phone size={10} />, variant: 'info' },
  email: { label: 'Email', icon: <Mail size={10} />, variant: 'accent' },
  web_chat: { label: 'Web Chat', icon: <MessageCircle size={10} />, variant: 'violet' },
  voice: { label: 'Voice', icon: <Phone size={10} />, variant: 'muted' },
};

const statusConfig: Record<ConversationStatus, { label: string; icon: React.ReactNode; variant: 'success' | 'info' | 'warning' | 'danger' | 'muted' }> = {
  active: { label: 'Active', icon: <MessageSquare size={10} />, variant: 'success' },
  ai_handling: { label: 'AI Handling', icon: <Bot size={10} />, variant: 'info' },
  human_handling: { label: 'Human', icon: <UserCheck size={10} />, variant: 'warning' },
  escalated: { label: 'Escalated', icon: <AlertTriangle size={10} />, variant: 'danger' },
  closed: { label: 'Closed', icon: null, variant: 'muted' },
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<ConversationChannel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('all');
  const supabase = createClient();
  const router = useRouter();

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time subscription for conversation updates
  useEffect(() => {
    const channel = supabase
      .channel('conversations-list-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchConversations]);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      // Channel filter
      if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = c.tenants
          ? `${c.tenants.first_name} ${c.tenants.last_name}`.toLowerCase()
          : (c.participant_name || '').toLowerCase();
        const phone = (c.participant_phone || '').toLowerCase();
        const property = c.properties?.name?.toLowerCase() || '';
        const preview = (c.last_message_preview || '').toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !property.includes(q) && !preview.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [conversations, channelFilter, statusFilter, search]);

  const activeFilters = (channelFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (search.trim() ? 1 : 0);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Conversations</h1>
          <p className="text-sm text-text-secondary">
            {filtered.length} of {conversations.length} conversations
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, phone, or property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-border bg-bg-primary text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Channel filter */}
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as ConversationChannel | 'all')}
          className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer"
        >
          <option value="all">All Channels</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="web_chat">Web Chat</option>
          <option value="voice">Voice</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ConversationStatus | 'all')}
          className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="ai_handling">AI Handling</option>
          <option value="human_handling">Human Handling</option>
          <option value="escalated">Escalated</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </select>

        {/* Clear filters */}
        {activeFilters > 0 && (
          <button
            onClick={() => {
              setSearch('');
              setChannelFilter('all');
              setStatusFilter('all');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors whitespace-nowrap"
          >
            <X size={12} />
            Clear ({activeFilters})
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <MessageSquare size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {conversations.length === 0 ? 'No conversations yet' : 'No matching conversations'}
          </h3>
          <p className="text-sm text-text-secondary">
            {conversations.length === 0
              ? 'Conversations will appear here when tenants or prospects message your Twilio numbers.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const name = c.tenants
              ? `${c.tenants.first_name} ${c.tenants.last_name}`
              : c.participant_name || c.participant_phone || 'Unknown';

            const chCfg = channelConfig[c.channel] || channelConfig.sms;
            const stCfg = statusConfig[c.status] || statusConfig.active;

            return (
              <div
                key={c.id}
                onClick={() => router.push(`/conversations/${c.id}`)}
                className="glass-card p-4 flex items-start gap-3 hover:bg-bg-elevated/50 transition-colors cursor-pointer group"
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare size={18} className="text-accent" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
                    <Badge variant={chCfg.variant} size="sm" className="flex-shrink-0">
                      <span className="flex items-center gap-1">
                        {chCfg.icon}
                        {chCfg.label}
                      </span>
                    </Badge>
                    <Badge variant={stCfg.variant} size="sm" dot className="flex-shrink-0">
                      {stCfg.label}
                    </Badge>
                  </div>

                  {c.properties && (
                    <p className="text-[11px] text-text-muted mb-1">{c.properties.name}</p>
                  )}

                  {c.last_message_preview && (
                    <p className="text-xs text-text-secondary truncate">
                      {c.last_message_sender_type && (
                        <span className="text-text-muted capitalize">
                          {c.last_message_sender_type}:{' '}
                        </span>
                      )}
                      {c.last_message_preview}
                    </p>
                  )}
                </div>

                {/* Time */}
                <div className="flex-shrink-0 text-right">
                  {c.last_message_at && (
                    <p className="text-[10px] text-text-muted">
                      {formatRelativeTime(c.last_message_at)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
