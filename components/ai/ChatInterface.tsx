'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Home,
  Users,
  FileText,
  ChevronRight,
  Zap,
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
/*  Quick Commands                                                     */
/* ------------------------------------------------------------------ */

const QUICK_COMMANDS = [
  { label: 'ANALYZE PORTFOLIO', prompt: 'Analyze my portfolio performance and give me key insights on cash flow, equity growth, and areas for improvement.' },
  { label: 'SCAN MARKET CONDITIONS', prompt: 'Scan current market conditions for all areas where I own properties and identify trends.' },
  { label: 'REVIEW DEAL PIPELINE', prompt: 'Review my current deal pipeline and advise on next steps for each deal.' },
  { label: 'CALCULATE TAX EXPOSURE', prompt: 'Review my portfolio and calculate my current tax exposure, including depreciation and potential deductions.' },
  { label: 'IDENTIFY OPPORTUNITIES', prompt: 'Based on my portfolio and current market conditions, identify the best investment opportunities for me.' },
  { label: 'GENERATE MARKET BRIEF', prompt: 'Generate a market trend report for the areas where I own properties, including pricing trends, rent growth, and demand indicators.' },
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
    <>
      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 0% 100%; }
        }
        @keyframes hexRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex h-full bg-[#080808]">
        {/* ============================================================ */}
        {/*  LEFT PANEL - SESSION HISTORY + QUICK COMMANDS                */}
        {/* ============================================================ */}
        <div
          className={cn(
            'flex-shrink-0 bg-[#111111] border-r border-[#1e1e1e] transition-all duration-300 overflow-hidden flex flex-col',
            sidebarOpen ? 'w-[260px]' : 'w-0'
          )}
        >
          {/* Session History Header */}
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="font-body uppercase tracking-wider text-[10px] text-gold">
                SESSION HISTORY
              </p>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md text-muted hover:text-gold hover:bg-gold/5 transition-colors"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Initialize New Session button */}
            <button
              type="button"
              onClick={onNewConversation}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'h-9 px-4 rounded-md text-[11px] font-body font-semibold uppercase tracking-wider',
                'bg-transparent text-gold',
                'border border-gold/40 hover:border-gold hover:bg-gold/5',
                'transition-all duration-200',
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              New Session
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-3">
                <MessageSquare className="h-6 w-6 text-[#1e1e1e] mb-3" />
                <p className="font-body text-[10px] text-muted-deep">No sessions found</p>
                <p className="font-body text-[10px] text-muted-deep/60 mt-1">
                  Start a new session to begin
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group relative flex items-start gap-2.5 px-3 py-2.5 rounded-md cursor-pointer',
                    'transition-all duration-150',
                    activeConversationId === conv.id
                      ? 'bg-gold/8 border-l-2 border-gold'
                      : 'hover:bg-white/3 border-l-2 border-transparent'
                  )}
                  onClick={() => onSelectConversation?.(conv.id)}
                >
                  <ChevronRight className={cn(
                    'h-3 w-3 flex-shrink-0 mt-1 transition-colors',
                    activeConversationId === conv.id ? 'text-gold' : 'text-[#1e1e1e]'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[#f5f5f5] truncate leading-snug font-body">
                      {conv.title}
                    </p>
                    <p className="font-mono text-[11px] text-muted-deep mt-0.5">
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick Commands section */}
          <div className="flex-shrink-0 border-t border-[#1e1e1e]">
            <div className="p-3">
              <p className="font-body uppercase tracking-wider text-[10px] text-gold mb-2 px-1">
                Quick Actions
              </p>
              <div className="space-y-0.5">
                {QUICK_COMMANDS.map((cmd, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestedPrompt(cmd.prompt)}
                    disabled={isStreaming}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left',
                      'font-body text-[11px] text-muted',
                      'hover:bg-gold/5 hover:text-gold',
                      'transition-all duration-150',
                      isStreaming && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <span className="text-gold/40">&gt;</span>
                    <span className="truncate">{cmd.label}</span>
                  </button>
                ))}
              </div>
            </div>
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
              className="absolute top-3 left-3 z-10 p-2 rounded-md bg-[#111111] border border-[#1e1e1e] text-muted hover:text-gold hover:bg-gold/5 transition-colors"
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
              /* ---- Empty state ---- */
              <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
                {/* Hexagonal shape */}
                <div className="relative w-24 h-24 mb-6">
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ animation: 'hexRotate 20s linear infinite' }}
                  >
                    <div
                      className="w-20 h-20"
                      style={{
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        background: 'rgba(201,168,76,0.05)',
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-gold" />
                  </div>
                </div>

                <h2 className="font-display font-bold text-xl text-[#f5f5f5] mb-2">
                  How can I help?
                </h2>
                <p className="font-body text-[11px] text-muted-deep mb-8 leading-relaxed max-w-sm">
                  Real-time AI analysis powered by your portfolio data, market conditions, and financial metrics.
                </p>

                {/* Suggested prompts 2x2 grid with left cyan border */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {SUGGESTED_PROMPTS.map((sp, idx) => {
                    const Icon = sp.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSuggestedPrompt(sp.prompt)}
                        className={cn(
                          'flex items-start gap-3 p-3.5 rounded-md text-left',
                          'bg-transparent',
                          'border-l-2 border-gold/30 border-t border-r border-b border-t-[#1e1e1e] border-r-[#1e1e1e] border-b-[#1e1e1e]',
                          'hover:border-l-gold hover:bg-gold/5',
                          'hover:shadow-[0_0_20px_rgba(201,168,76,0.08)]',
                          'transition-all duration-200 group/prompt',
                        )}
                        style={{ animation: `fadeInUp 0.4s ease ${idx * 0.1}s both` }}
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center group-hover/prompt:bg-gold/20 transition-colors">
                          <Icon className="h-3.5 w-3.5 text-gold" />
                        </div>
                        <span className="text-[12px] text-muted group-hover/prompt:text-[#f5f5f5] transition-colors leading-snug font-body">
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
          <div className="flex-shrink-0 border-t border-[#1e1e1e] bg-[#111111] px-6 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-end gap-3 bg-transparent border border-[#1e1e1e] rounded-lg px-4 py-3 focus-within:border-gold/30 focus-within:shadow-[0_0_20px_rgba(201,168,76,0.08)] transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question..."
                  rows={1}
                  className={cn(
                    'flex-1 bg-transparent text-sm text-[#f5f5f5] font-body',
                    'placeholder:font-body placeholder:text-muted-deep',
                    'resize-none outline-none',
                    'min-h-[24px] max-h-[160px]',
                  )}
                  disabled={isStreaming}
                />

                {/* Character count + send */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      'font-mono text-[10px] tabular-nums',
                      input.length > MAX_CHARS * 0.9
                        ? 'text-[#DC2626]'
                        : 'text-muted-deep'
                    )}
                  >
                    {input.length}/{MAX_CHARS}
                  </span>

                  {/* Hexagonal send button */}
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className={cn(
                      'flex items-center justify-center w-9 h-9',
                      'transition-all duration-200',
                      input.trim() && !isStreaming
                        ? 'text-[#080808] hover:shadow-[0_0_15px_rgba(201,168,76,0.4)]'
                        : 'text-muted-deep cursor-not-allowed'
                    )}
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      background: input.trim() && !isStreaming
                        ? '#c9a84c'
                        : '#1e1e1e',
                    }}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="font-body text-[10px] text-muted-deep text-center mt-2">
                AI responses may contain inaccuracies. Verify critical data independently.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatInterface;
