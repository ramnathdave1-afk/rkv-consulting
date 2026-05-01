'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Send,
  Bot,
  UserCheck,
  AlertTriangle,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  Clock,
  Building2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type { Conversation, Message, ConversationChannel, ConversationStatus } from '@/lib/types';

interface ConversationWithRelations extends Conversation {
  tenants?: { first_name: string; last_name: string } | null;
  properties?: { name: string } | null;
}

const channelIcon: Record<ConversationChannel, React.ReactNode> = {
  sms: <MessageSquare size={14} className="text-slate-500" />,
  email: <Mail size={14} className="text-slate-500" />,
  web_chat: <Globe size={14} className="text-slate-500" />,
  voice: <Phone size={14} className="text-slate-500" />,
};

const statusPill: Record<ConversationStatus, { label: string; classes: string }> = {
  active: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ai_handling: { label: 'AI Handling', classes: 'bg-sky-50 text-sky-700 border-sky-200' },
  human_handling: { label: 'Human Handling', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  escalated: { label: 'Escalated', classes: 'bg-red-50 text-red-700 border-red-200' },
  closed: { label: 'Closed', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  useEffect(() => {
    async function loadData() {
      await Promise.all([fetchConversation(), fetchMessages()]);
      setLoading(false);
    }
    loadData();
  }, [fetchConversation, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
        setMessages((prev) => {
          if (prev.some((m) => m.id === json.message.id)) return prev;
          return [...prev, json.message];
        });

        if (json.twilio?.error) {
          toast.error('Message saved but SMS delivery failed');
        }

        textareaRef.current?.focus();
      } else {
        const errJson = await res.json().catch(() => null);
        toast.error(errJson?.error || 'Failed to send message');
        setInput(content);
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
      <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
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
      <div className="p-6 text-center bg-slate-50 min-h-screen">
        <p className="text-slate-600 mb-4">Conversation not found.</p>
        <button
          onClick={() => router.push('/conversations')}
          className="text-[#0369A1] hover:underline text-sm cursor-pointer"
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

  const stCfg = statusPill[conversation.status] || statusPill.active;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-slate-50">
      {/* Status header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/conversations"
              className="p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} className="text-slate-500" />
            </Link>

            <div className="h-9 w-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
              {channelIcon[conversation.channel] || channelIcon.sms}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#020617]">{participantName}</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${stCfg.classes}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {stCfg.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {conversation.participant_phone && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                    <Phone size={10} />
                    {conversation.participant_phone}
                  </span>
                )}
                {conversation.properties && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Building2 size={10} />
                    {conversation.properties.name}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock size={10} />
                  {messages.length} messages
                </span>
              </div>
            </div>
          </div>

          {/* Take Over toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isClosed && (
              <button
                onClick={handleStatusToggle}
                disabled={togglingStatus}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                  isHumanHandling
                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'bg-[#0369A1] text-white hover:bg-[#0284C7]'
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
            <MessageSquare size={36} className="mx-auto text-slate-400 mb-3" />
            <p className="text-sm text-slate-500">No messages yet</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isInbound = msg.direction === 'inbound';
          const isAi = msg.sender_type === 'ai';
          const isSystem = msg.sender_type === 'system';
          const alignRight = !isInbound;

          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showDateSep =
            !prevMsg ||
            new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

          return (
            <React.Fragment key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-500 font-medium">
                    {new Date(msg.created_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}

              {isSystem ? (
                <div className="flex justify-center">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 max-w-[75%]">
                    <div className="flex items-center gap-1.5 justify-center">
                      <AlertTriangle size={11} className="text-amber-600" />
                      <span className="text-xs text-amber-700 font-medium">System</span>
                    </div>
                    <p className="text-xs text-slate-700 text-center mt-0.5">{msg.content}</p>
                    <p className="text-xs tabular-nums text-slate-400 text-center mt-1">
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`flex flex-col ${alignRight ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2 max-w-[75%] ${
                      alignRight ? 'bg-sky-100 text-[#020617]' : 'bg-slate-100 text-[#020617]'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 px-1 ${alignRight ? 'flex-row-reverse' : ''}`}>
                    <p className="text-xs tabular-nums text-slate-400">
                      {formatMessageTime(msg.created_at)}
                    </p>
                    {isAi && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-slate-500">
                        <Sparkles size={10} />
                        AI
                      </span>
                    )}
                    {msg.ai_classified_intent && (
                      <span className="text-xs text-slate-500 capitalize">
                        &middot; {msg.ai_classified_intent}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      {canSendMessage && (
        <form
          onSubmit={sendMessage}
          className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e as unknown as React.FormEvent);
                }
              }}
              placeholder={
                conversation.channel === 'sms'
                  ? 'Type a message (will be sent via SMS)...'
                  : 'Type a message...'
              }
              rows={3}
              className="flex-1 min-h-[80px] resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#020617] placeholder:text-slate-400 focus:border-[#0369A1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 transition-colors"
              disabled={sending}
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Sparkles size={12} />
                AI Suggest
              </button>
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-[#0369A1] text-white text-sm font-semibold hover:bg-[#0284C7] disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send
              </button>
            </div>
          </div>
        </form>
      )}

      {/* AI handling indicator */}
      {!canSendMessage && !isClosed && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex items-center gap-2 text-xs text-slate-600">
          <Bot size={14} className="text-[#0369A1]" />
          <span className="dot-typing"><span /><span /><span /></span>
          AI is handling this conversation. Click &ldquo;Take Over&rdquo; to respond manually.
        </div>
      )}

      {/* Closed indicator */}
      {isClosed && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          This conversation is closed.
        </div>
      )}
    </div>
  );
}
