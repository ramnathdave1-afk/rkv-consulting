'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  BarChart3,
  Home,
  Users,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageBubble } from '@/components/ai/MessageBubble';
import { StreamingResponse } from '@/components/ai/StreamingResponse';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatInterfaceProps {
  conversationId?: string;
  onNewConversation?: () => void;
  conversations?: Conversation[];
  messages?: Message[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onSendMessage?: (content: string) => void;
  isStreaming?: boolean;
  streamingContent?: string;
  userInitials?: string;
}

/* ------------------------------------------------------------------ */
/*  Suggested prompts                                                  */
/* ------------------------------------------------------------------ */

const SUGGESTED_PROMPTS = [
  {
    icon: BarChart3,
    label: 'Analyze my portfolio performance',
    prompt: 'Analyze my portfolio performance and give me key insights.',
  },
  {
    icon: Home,
    label: 'What properties should I buy?',
    prompt: 'Based on my portfolio and current market conditions, what types of properties should I consider buying?',
  },
  {
    icon: Users,
    label: 'Help me with a tenant issue',
    prompt: 'I need help dealing with a tenant issue. Can you advise me on best practices?',
  },
  {
    icon: FileText,
    label: 'Generate a market report',
    prompt: 'Generate a market report for the areas where I own properties.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ChatInterface({
  conversationId: _conversationId,
  onNewConversation,
  conversations = [],
  messages = [],
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onSendMessage,
  isStreaming = false,
  streamingContent = '',
  userInitials = 'U',
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const MAX_CHARS = 4000;
  const isEmpty = messages.length === 0 && !isStreaming;

  /* ---- Auto-resize textarea ---- */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }, [input]);

  /* ---- Scroll to bottom on new messages ---- */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  /* ---- Send handler ---- */
  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage?.(trimmed);
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSuggestedPrompt(prompt: string) {
    onSendMessage?.(prompt);
  }

  /* ---- Format conversation date ---- */
  function formatConversationDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  return (
    <div className="flex h-full">
      {/* ============================================================ */}
      {/*  CONVERSATION SIDEBAR                                         */}
      {/* ============================================================ */}
      <div
        className={cn(
          'flex-shrink-0 bg-deep border-r border-border transition-all duration-300 overflow-hidden flex flex-col',
          sidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-white font-display">
            Conversations
          </h3>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* New Chat button */}
        <div className="p-3 flex-shrink-0">
          <button
            type="button"
            onClick={onNewConversation}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'h-9 px-4 rounded-lg text-sm font-semibold',
              'bg-gold text-black',
              'hover:brightness-110 hover:shadow-glow',
              'transition-all duration-200',
            )}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-3">
              <MessageSquare className="h-8 w-8 text-muted/30 mb-3" />
              <p className="text-xs text-muted">No conversations yet</p>
              <p className="text-[10px] text-muted/60 mt-1">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'group relative flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer',
                  'transition-colors duration-150',
                  activeConversationId === conv.id
                    ? 'bg-gold/10 border-l-2 border-gold'
                    : 'hover:bg-white/5'
                )}
                onClick={() => onSelectConversation?.(conv.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 text-muted flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate leading-snug">
                    {conv.title}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">
                    {formatConversationDate(conv.updated_at || conv.created_at)}
                  </p>
                </div>

                {/* Delete button on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation?.(conv.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted hover:text-red hover:bg-red/10 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  MAIN CHAT AREA                                               */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toggle sidebar button when collapsed */}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-10 p-2 rounded-lg bg-card border border-border text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-6 py-6"
        >
          {isEmpty ? (
            /* ---- Empty state with suggested prompts ---- */
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
              {/* AI avatar */}
              <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-6">
                <Sparkles className="h-7 w-7 text-gold" />
              </div>

              <h2 className="font-display font-bold text-xl text-white mb-2">
                RKV AI Assistant
              </h2>
              <p className="text-sm text-muted mb-8 leading-relaxed">
                Your personal AI advisor for real estate investment decisions.
                Ask me anything about your portfolio, market conditions, or property management.
              </p>

              {/* Suggested prompts grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {SUGGESTED_PROMPTS.map((sp, idx) => {
                  const Icon = sp.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuggestedPrompt(sp.prompt)}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-xl text-left',
                        'bg-card border border-border',
                        'hover:border-gold/20 hover:bg-gold/5 hover:shadow-glow-sm',
                        'transition-all duration-200 group/prompt',
                      )}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center group-hover/prompt:bg-gold/20 transition-colors">
                        <Icon className="h-4 w-4 text-gold" />
                      </div>
                      <span className="text-sm text-muted group-hover/prompt:text-white transition-colors leading-snug">
                        {sp.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ---- Message list ---- */
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  userInitials={userInitials}
                />
              ))}

              {/* Streaming response */}
              {isStreaming && (
                <StreamingResponse
                  content={streamingContent}
                  isStreaming={isStreaming}
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ---- Input area ---- */}
        <div className="flex-shrink-0 border-t border-border bg-deep/50 px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-3 bg-card border border-border rounded-xl px-4 py-3 focus-within:border-gold/30 focus-within:shadow-glow-sm transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your properties..."
                rows={1}
                className={cn(
                  'flex-1 bg-transparent text-sm text-white placeholder-muted/60',
                  'resize-none outline-none font-body',
                  'min-h-[24px] max-h-[160px]',
                )}
                disabled={isStreaming}
              />

              {/* Character count + send */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    input.length > MAX_CHARS * 0.9
                      ? 'text-red'
                      : 'text-muted/40'
                  )}
                >
                  {input.length}/{MAX_CHARS}
                </span>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg',
                    'transition-all duration-200',
                    input.trim() && !isStreaming
                      ? 'bg-gold text-black hover:brightness-110 hover:shadow-glow'
                      : 'bg-border/50 text-muted/40 cursor-not-allowed'
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-[10px] text-muted/40 text-center mt-2">
              AI can make mistakes. Verify important information independently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
