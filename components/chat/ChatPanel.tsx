'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useChatStore } from '@/store/chat-store';
import { cn } from '@/lib/utils';

export function ChatPanel() {
  const chatOpen = useAppStore((s) => s.chatOpen);
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const activeVertical = useAppStore((s) => s.activeVertical);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);

  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingText = useChatStore((s) => s.streamingText);
  const addMessage = useChatStore((s) => s.addMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setStreamingText = useChatStore((s) => s.setStreamingText);
  const finalizeStreaming = useChatStore((s) => s.finalizeStreaming);
  const clearHistory = useChatStore((s) => s.clearHistory);
  const context = useChatStore((s) => s.context);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  useEffect(() => {
    if (chatOpen) inputRef.current?.focus();
  }, [chatOpen]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userContent = input.trim();
    addMessage('user', userContent);
    setInput('');
    setStreaming(true);
    setStreamingText('');

    const allMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userContent },
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          context: { ...context, vertical: activeVertical, siteId: selectedSiteId },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat error: ${response.status}`);
      }

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
              // skip malformed SSE lines
            }
          }
        }
      }

      finalizeStreaming();
      if (!fullText) {
        addMessage('assistant', 'No response received.');
        setStreaming(false);
      }
    } catch {
      addMessage('assistant', 'Error: Unable to connect to AI. Please try again.');
      setStreaming(false);
      setStreamingText('');
    }
  }, [input, isStreaming, messages, context, activeVertical, selectedSiteId, addMessage, setStreaming, setStreamingText, finalizeStreaming]);

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
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed right-0 top-0 z-50 flex h-screen w-[420px] flex-col border-l border-border bg-bg-primary/95 backdrop-blur-xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Sparkles size={16} className="text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Meridian AI</h3>
                <p className="text-[10px] text-text-muted">
                  {activeVertical.replace('_', ' ')} intelligence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearHistory}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
                title="Clear chat"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 mb-4">
                  <Bot size={24} className="text-accent" />
                </div>
                <p className="text-sm font-medium text-text-primary mb-1">Ask Meridian AI</p>
                <p className="text-xs text-text-muted mb-6">
                  Get insights on sites, parcels, zoning, grid capacity, and feasibility analysis.
                </p>
                <div className="space-y-2 w-full">
                  {[
                    'Find solar sites near Phoenix with 50+ acres',
                    'What zoning is compatible with data centers?',
                    'Analyze grid capacity in Maricopa County',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                      className="w-full rounded-lg border border-border bg-bg-secondary/40 px-3 py-2 text-left text-xs text-text-muted hover:border-accent/30 hover:text-text-primary transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex gap-2',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10">
                    <Bot size={12} className="text-accent" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-accent text-white'
                      : 'bg-bg-secondary/60 border border-border text-text-primary',
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                {msg.role === 'user' && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/20">
                    <User size={12} className="text-accent" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Streaming */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10">
                  <Bot size={12} className="text-accent animate-pulse" />
                </div>
                <div className="max-w-[85%] rounded-xl bg-bg-secondary/60 border border-border px-3 py-2 text-xs leading-relaxed text-text-primary">
                  <div className="whitespace-pre-wrap">
                    {streamingText || (
                      <span className="flex items-center gap-1 text-text-muted">
                        <span className="animate-pulse">Thinking</span>
                        <span className="inline-flex gap-0.5">
                          <span className="h-1 w-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-1 w-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-1 w-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-bg-secondary/40 px-3 py-2 focus-within:border-accent/50 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about sites, zoning, grid capacity..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none max-h-24"
                disabled={isStreaming}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-30 hover:bg-accent/80 transition-colors"
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
