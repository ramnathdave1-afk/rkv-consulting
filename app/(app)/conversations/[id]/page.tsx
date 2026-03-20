'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArrowLeft, Send, Bot, User, UserCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { Conversation, Message } from '@/lib/types';

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [convRes, msgRes] = await Promise.all([
      supabase.from('conversations').select('*').eq('id', id).single(),
      supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true }),
    ]);

    if (convRes.data) setConversation(convRes.data as Conversation);
    setMessages((msgRes.data as Message[]) || []);
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    fetchData();

    // Real-time subscription for new messages
    const channel = supabase
      .channel(`conversation-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, id, fetchData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleTakeover() {
    await supabase
      .from('conversations')
      .update({ status: 'human_handling' })
      .eq('id', id);
    fetchData();
  }

  async function handleReturnToAI() {
    await supabase
      .from('conversations')
      .update({ status: 'ai_handling' })
      .eq('id', id);
    fetchData();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    const res = await fetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim(), channel: 'sms' }),
    });

    if (res.ok) {
      setInput('');
      // Also send via Twilio if conversation has a phone
      if (conversation?.participant_phone && conversation?.twilio_phone) {
        await fetch('/api/twilio/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: conversation.participant_phone,
            from: conversation.twilio_phone,
            body: input.trim(),
          }),
        }).catch(() => {});
      }
      fetchData();
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!conversation) {
    return <div className="p-6 text-text-secondary">Conversation not found.</div>;
  }

  const isHumanHandling = conversation.status === 'human_handling';
  const isEscalated = conversation.status === 'escalated';

  const senderColors: Record<string, string> = {
    tenant: 'bg-bg-elevated',
    ai: 'bg-accent/10',
    staff: 'bg-blue-500/10',
    system: 'bg-yellow-500/10',
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/conversations" className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {conversation.participant_name || conversation.participant_phone || 'Unknown'}
            </p>
            <p className="text-[10px] text-text-muted">
              {conversation.channel.toUpperCase()} &middot;{' '}
              <span className={isHumanHandling ? 'text-yellow-500' : isEscalated ? 'text-red-500' : 'text-green-500'}>
                {conversation.status.replace('_', ' ')}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isHumanHandling ? (
            <button onClick={handleTakeover} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-500 text-xs font-medium hover:bg-yellow-500/10 transition-colors">
              <UserCheck size={14} />
              Take Over
            </button>
          ) : (
            <button onClick={handleReturnToAI} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/30 text-accent text-xs font-medium hover:bg-accent/10 transition-colors">
              <Bot size={14} />
              Return to AI
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isInbound = msg.direction === 'inbound';
          return (
            <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${senderColors[msg.sender_type] || 'bg-bg-elevated'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {msg.sender_type === 'ai' && <Bot size={12} className="text-accent" />}
                  {msg.sender_type === 'staff' && <User size={12} className="text-blue-500" />}
                  {msg.sender_type === 'system' && <AlertTriangle size={12} className="text-yellow-500" />}
                  <span className="text-[10px] text-text-muted capitalize">{msg.sender_type}</span>
                  {msg.ai_classified_intent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">{msg.ai_classified_intent}</span>
                  )}
                </div>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[9px] text-text-muted mt-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — only show when human is handling */}
      {isHumanHandling && (
        <form onSubmit={sendMessage} className="border-t border-border px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-accent text-bg-primary disabled:opacity-50 hover:bg-accent-hover transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      )}

      {/* AI handling indicator */}
      {!isHumanHandling && !isEscalated && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-xs text-text-muted">
          <Bot size={14} className="text-accent" />
          AI is handling this conversation. Click &ldquo;Take Over&rdquo; to respond manually.
        </div>
      )}
    </div>
  );
}
