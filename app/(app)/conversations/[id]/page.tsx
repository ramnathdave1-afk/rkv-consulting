'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  UserCheck,
  AlertTriangle,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  Building2,
  Hash,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type { Conversation, Message, ConversationChannel, ConversationStatus } from '@/lib/types';

interface ConversationWithRelations extends Conversation {
  tenants?: { first_name: string; last_name: string } | null;
  properties?: { name: string } | null;
}

const channelConfig: Record<ConversationChannel, { label: string; icon: React.ReactNode; variant: 'info' | 'accent' | 'violet' | 'muted' }> = {
  sms: { label: 'SMS', icon: <Phone size={12} />, variant: 'info' },
  email: { label: 'Email', icon: <Mail size={12} />, variant: 'accent' },
  web_chat: { label: 'Web Chat', icon: <MessageCircle size={12} />, variant: 'violet' },
  voice: { label: 'Voice', icon: <Phone size={12} />, variant: 'muted' },
};

const statusConfig: Record<ConversationStatus, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'muted' }> = {
  active: { label: 'Active', variant: 'success' },
  ai_handling: { label: 'AI Handling', variant: 'info' },
  human_handling: { label: 'Human Handling', variant: 'warning' },
  escalated: { label: 'Escalated', variant: 'danger' },
  closed: { label: 'Closed', variant: 'muted' },
};

// Message bubble colors by sender type
const senderBubbleStyles: Record<string, { bg: string; accent: string; label: string }> = {
  ai: {
    bg: 'bg-blue-500/10 border border-blue-500/20',
    accent: 'text-blue-400',
    label: 'AI Agent',
  },
  staff: {
    bg: 'bg-green-500/10 border border-green-500/20',
    accent: 'text-green-400',
    label: 'Staff',
  },
  tenant: {
    bg: 'bg-bg-elevated border border-border',
    accent: 'text-text-muted',
    label: 'Tenant',
  },
  system: {
    bg: 'bg-yellow-500/10 border border-yellow-500/20',
    accent: 'text-yellow-400',
    label: 'System',
  },
};

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

function getSenderIcon(senderType: string) {
  switch (senderType) {
    case 'ai':
      return <Bot size={12} className="text-blue-400" />;
    case 'staff':
      return <User size={12} className="text-green-400" />;
    case 'system':
      return <AlertTriangle size={12} className="text-yellow-400" />;
    default:
      return <User size={12} className="text-text-muted" />;
  }
}

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [conversation, setConversation] = useState<ConversationWithRelations | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchConversation = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const json = await res.json();
        setConversation(json.conversation);
      }
    } catch {
      // silent
    }
  }, [id]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages || []);
      }
    } catch {
      // silent
    }
  }, [id]);

  // Initial data load
  useEffect(() => {
    async function loadData() {
      await Promise.all([fetchConversation(), fetchMessages()]);
      setLoading(false);
    }
    loadData();
  }, [fetchConversation, fetchMessages]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Real-time subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`conversation-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload: any) => {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${id}`,
        },
        () => {
          fetchConversation();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, id, fetchConversation]);

  async function handleStatusToggle() {
    if (!conversation || togglingStatus) return;
    setTogglingStatus(true);

    const newStatus = conversation.status === 'human_handling' ? 'ai_handling' : 'human_handling';

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const json = await res.json();
        setConversation(json.conversation);
        toast.success(
          newStatus === 'human_handling'
            ? 'You are now handling this conversation'
            : 'AI is now handling this conversation'
        );
      } else {
        toast.error('Failed to update conversation status');
      }
    } catch {
      toast.error('Failed to update conversation status');
    } finally {
      setTogglingStatus(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const content = input.trim();
    setSending(true);
    setInput('');

    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const json = await res.json();
        // Add message immediately (realtime will also fire but we de-dup)
        setMessages((prev) => {
          if (prev.some((m) => m.id === json.message.id)) return prev;
          return [...prev, json.message];
        });

        if (json.twilio?.error) {
          toast.error('Message saved but SMS delivery failed');
        }

        inputRef.current?.focus();
      } else {
        const errJson = await res.json().catch(() => null);
        toast.error(errJson?.error || 'Failed to send message');
        setInput(content); // restore input
      }
    } catch {
      toast.error('Failed to send message');
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-32 mt-1" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className="h-16 w-64 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-secondary mb-4">Conversation not found.</p>
        <button
          onClick={() => router.push('/conversations')}
          className="text-accent hover:underline text-sm"
        >
          Back to conversations
        </button>
      </div>
    );
  }

  const isHumanHandling = conversation.status === 'human_handling';
  const isEscalated = conversation.status === 'escalated';
  const isClosed = conversation.status === 'closed';
  const canSendMessage = isHumanHandling || isEscalated;

  const participantName = conversation.tenants
    ? `${conversation.tenants.first_name} ${conversation.tenants.last_name}`
    : conversation.participant_name || conversation.participant_phone || 'Unknown';

  const chCfg = channelConfig[conversation.channel] || channelConfig.sms;
  const stCfg = statusConfig[conversation.status] || statusConfig.active;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/conversations"
              className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors"
            >
              <ArrowLeft size={18} className="text-text-muted" />
            </Link>

            <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              {chCfg.icon}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text-primary">{participantName}</p>
                <Badge variant={chCfg.variant} size="sm">
                  <span className="flex items-center gap-1">
                    {chCfg.icon}
                    {chCfg.label}
                  </span>
                </Badge>
                <Badge variant={stCfg.variant} size="sm" dot>
                  {stCfg.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {conversation.participant_phone && (
                  <span className="flex items-center gap-1 text-[10px] text-text-muted">
                    <Phone size={9} />
                    {conversation.participant_phone}
                  </span>
                )}
                {conversation.properties && (
                  <span className="flex items-center gap-1 text-[10px] text-text-muted">
                    <Building2 size={9} />
                    {conversation.properties.name}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Clock size={9} />
                  Started {new Date(conversation.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Hash size={9} />
                  {messages.length} messages
                </span>
              </div>
            </div>
          </div>

          {/* Takeover toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isClosed && (
              <button
                onClick={handleStatusToggle}
                disabled={togglingStatus}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
                  isHumanHandling
                    ? 'border-accent/30 text-accent hover:bg-accent/10'
                    : 'border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10'
                }`}
              >
                {togglingStatus ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isHumanHandling ? (
                  <Bot size={14} />
                ) : (
                  <UserCheck size={14} />
                )}
                {isHumanHandling ? 'Return to AI' : 'Take Over'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages thread */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle size={36} className="mx-auto text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">No messages yet</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isInbound = msg.direction === 'inbound';
          const style = senderBubbleStyles[msg.sender_type] || senderBubbleStyles.tenant;

          // Show date separator
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showDateSep =
            !prevMsg ||
            new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

          return (
            <React.Fragment key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-text-muted font-medium">
                    {new Date(msg.created_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* System messages render as centered banners */}
              {msg.sender_type === 'system' ? (
                <div className="flex justify-center">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2 max-w-[85%]">
                    <div className="flex items-center gap-1.5 justify-center">
                      <AlertTriangle size={11} className="text-yellow-400" />
                      <span className="text-[10px] text-yellow-400 font-medium">System</span>
                    </div>
                    <p className="text-xs text-text-secondary text-center mt-0.5">{msg.content}</p>
                    <p className="text-[9px] text-text-muted text-center mt-1">
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${style.bg}`}>
                    {/* Sender label + direction */}
                    <div className="flex items-center gap-1.5 mb-1">
                      {getSenderIcon(msg.sender_type)}
                      <span className={`text-[10px] font-medium ${style.accent}`}>
                        {style.label}
                      </span>
                      <span className="text-[9px] text-text-muted">
                        {isInbound ? 'inbound' : 'outbound'}
                      </span>
                      {msg.ai_classified_intent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent ml-1">
                          {msg.ai_classified_intent}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>

                    {/* Timestamp */}
                    <p className="text-[9px] text-text-muted mt-1.5">
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input - shown when human is handling or escalated */}
      {canSendMessage && (
        <form
          onSubmit={sendMessage}
          className="flex-shrink-0 border-t border-border px-4 py-3 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              conversation.channel === 'sms'
                ? 'Type a message (will be sent via SMS)...'
                : 'Type a message...'
            }
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-accent text-bg-primary disabled:opacity-50 hover:bg-accent-hover transition-colors"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
      )}

      {/* AI handling indicator */}
      {!canSendMessage && !isClosed && (
        <div className="flex-shrink-0 border-t border-border px-4 py-3 flex items-center gap-2 text-xs text-text-muted">
          <Bot size={14} className="text-accent animate-pulse" />
          AI is handling this conversation. Click &ldquo;Take Over&rdquo; to respond manually.
        </div>
      )}

      {/* Closed indicator */}
      {isClosed && (
        <div className="flex-shrink-0 border-t border-border px-4 py-3 flex items-center gap-2 text-xs text-text-muted">
          <span className="h-2 w-2 rounded-full bg-text-muted" />
          This conversation is closed.
        </div>
      )}
    </div>
  );
}
