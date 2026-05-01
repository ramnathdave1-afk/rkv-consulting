'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  Trash2,
  Loader2,
  Building2,
  Wrench,
  DollarSign,
  FileText,
  CalendarDays,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useChatStore } from '@/store/chat-store';
import { cn } from '@/lib/utils';

const QUICK_QUESTIONS = [
  { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Occupancy Rate', text: "What's my occupancy rate?" },
  { icon: <Wrench className="w-3.5 h-3.5" />, label: 'Open Work Orders', text: 'How many open work orders do I have?' },
  { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Monthly Revenue', text: "What's my total monthly revenue?" },
  { icon: <FileText className="w-3.5 h-3.5" />, label: 'Expiring Leases', text: 'Show me leases expiring soon' },
  { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Showings', text: 'Any upcoming showings?' },
];

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function TypingDots() {
  return (
    <span className="dot-typing inline-flex">
      <span />
      <span />
      <span />
    </span>
  );
}

export function ChatPanel() {
  const chatOpen = useAppStore((s) => s.chatOpen);
  const setChatOpen = useAppStore((s) => s.setChatOpen);

  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingText = useChatStore((s) => s.streamingText);
  const addMessage = useChatStore((s) => s.addMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setStreamingText = useChatStore((s) => s.setStreamingText);
  const finalizeStreaming = useChatStore((s) => s.finalizeStreaming);
  const clearHistory = useChatStore((s) => s.clearHistory);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  useEffect(() => {
    if (chatOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [chatOpen]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '44px';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = overrideText || input.trim();
      if (!text || isStreaming) return;

      addMessage('user', text);
      if (!overrideText) setInput('');
      if (textareaRef.current) textareaRef.current.style.height = '44px';
      setStreaming(true);
      setStreamingText('');

      const allMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text },
      ];

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages }),
        });

        if (!response.ok || !response.body) throw new Error('Chat error');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  fullText += parsed.delta.text;
                  setStreamingText(fullText);
                }
              } catch {
                // skip
              }
            }
          }
        }

        finalizeStreaming();
        if (!fullText) {
          addMessage('assistant', 'No response received. Please try again.');
          setStreaming(false);
        }
      } catch {
        addMessage('assistant', 'Unable to connect. Please try again.');
        setStreaming(false);
        setStreamingText('');
      }
    },
    [input, isStreaming, messages, addMessage, setStreaming, setStreamingText, finalizeStreaming],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed bottom-6 right-6 z-50 flex w-96 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
          style={{ height: '560px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-50 border border-sky-200">
                <Sparkles size={15} className="text-[#0369A1]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#020617]">Ask anything</h3>
                <p className="text-xs text-slate-500">RKV Consulting AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearHistory}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                title="Clear chat"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50"
          >
            {/* Empty state */}
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-center px-2">
                <h2 className="text-base font-medium text-[#020617] mb-1">
                  How can I help?
                </h2>
                <p className="text-xs text-slate-500 mb-5">
                  Ask about your portfolio or get PM advice
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q.text}
                      onClick={() => sendMessage(q.text)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-sky-50 rounded-md text-xs text-slate-700 hover:text-[#0369A1] transition-colors border border-slate-200 hover:border-sky-200 cursor-pointer"
                    >
                      {q.icon}
                      <span>{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => {
              const alignRight = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={cn('flex flex-col', alignRight ? 'items-end' : 'items-start')}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2 max-w-[75%]',
                      alignRight ? 'bg-sky-100 text-[#020617]' : 'bg-slate-100 text-[#020617]',
                    )}
                  >
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  </div>
                  <div className={cn('flex items-center gap-1 mt-1 px-1', alignRight ? 'flex-row-reverse' : '')}>
                    <span className="text-xs tabular-nums text-slate-400">
                      {formatTime(msg.timestamp)}
                    </span>
                    {msg.role === 'assistant' && (
                      <Sparkles size={10} className="text-slate-500" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Streaming */}
            {isStreaming && (
              <div className="flex flex-col items-start">
                <div className="rounded-2xl px-4 py-2 max-w-[75%] bg-slate-100 text-[#020617]">
                  {streamingText ? (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{streamingText}</div>
                  ) : (
                    <span className="flex items-center gap-2 text-slate-500 text-sm">
                      <span>Thinking</span>
                      <TypingDots />
                    </span>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 bg-white p-3">
            <div className="rounded-md border border-slate-200 bg-white focus-within:border-[#0369A1] focus-within:ring-2 focus-within:ring-[#0369A1] focus-within:ring-offset-2 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your properties..."
                rows={1}
                className="w-full resize-none bg-transparent px-3 py-2 text-sm text-[#020617] placeholder:text-slate-400 outline-none leading-relaxed"
                style={{ minHeight: '44px', maxHeight: '120px' }}
                disabled={isStreaming}
              />
              <div className="px-2 pb-2 flex items-center justify-between">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-600 hover:text-[#0369A1] hover:bg-sky-50 transition-colors cursor-pointer"
                >
                  <Sparkles size={12} />
                  AI Suggest
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                    input.trim()
                      ? 'bg-[#0369A1] text-white hover:bg-[#0284C7]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                  )}
                >
                  {isStreaming ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Send
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">Powered by Claude</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
