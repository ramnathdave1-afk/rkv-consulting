'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  MessageSquare,
  Search,
  Mail,
  Globe,
  Phone,
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
  unread?: boolean;
}

const channelIcon: Record<ConversationChannel, React.ReactNode> = {
  sms: <MessageSquare size={14} className="text-slate-500" />,
  email: <Mail size={14} className="text-slate-500" />,
  web_chat: <Globe size={14} className="text-slate-500" />,
  voice: <Phone size={14} className="text-slate-500" />,
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
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
      if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
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
      <div className="p-6 space-y-4 bg-slate-50 min-h-screen">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#020617]">Conversations</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} of {conversations.length} conversations
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-md border border-slate-200 bg-white text-sm text-[#020617] placeholder:text-slate-400 focus:border-[#0369A1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as ConversationChannel | 'all')}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#020617] focus:border-[#0369A1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 cursor-pointer"
        >
          <option value="all">All Channels</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="web_chat">Web Chat</option>
          <option value="voice">Voice</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ConversationStatus | 'all')}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#020617] focus:border-[#0369A1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="ai_handling">AI Handling</option>
          <option value="human_handling">Human Handling</option>
          <option value="escalated">Escalated</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </select>

        {activeFilters > 0 && (
          <button
            onClick={() => {
              setSearch('');
              setChannelFilter('all');
              setStatusFilter('all');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            <X size={12} />
            Clear ({activeFilters})
          </button>
        )}
      </div>

      {/* Inbox-style two-panel preview list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <MessageSquare size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-[#020617] mb-2">
            {conversations.length === 0 ? 'No conversations yet' : 'No matching conversations'}
          </h3>
          <p className="text-sm text-slate-500">
            {conversations.length === 0
              ? 'Conversations will appear here when tenants or prospects message your Twilio numbers.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {filtered.map((c) => {
              const name = c.tenants
                ? `${c.tenants.first_name} ${c.tenants.last_name}`
                : c.participant_name || c.participant_phone || 'Unknown';

              const isUnread = !!c.unread;

              return (
                <li
                  key={c.id}
                  onClick={() => router.push(`/conversations/${c.id}`)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-sky-50/50 transition-colors cursor-pointer"
                >
                  {/* Channel icon */}
                  <div className="h-9 w-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {channelIcon[c.channel] || channelIcon.sms}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0" />
                      )}
                      <p className={`text-sm truncate ${isUnread ? 'font-bold text-[#020617]' : 'font-medium text-[#020617]'}`}>
                        {name}
                      </p>
                      {c.properties && (
                        <span className="text-xs text-slate-400 truncate">&middot; {c.properties.name}</span>
                      )}
                    </div>

                    {c.last_message_preview && (
                      <p className="text-xs text-slate-500 truncate">
                        {c.last_message_sender_type && (
                          <span className="text-slate-400 capitalize">
                            {c.last_message_sender_type}:{' '}
                          </span>
                        )}
                        {c.last_message_preview}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    {c.last_message_at && (
                      <p className="text-xs tabular-nums text-slate-500">
                        {formatRelativeTime(c.last_message_at)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
