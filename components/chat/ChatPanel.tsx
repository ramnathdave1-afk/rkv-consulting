'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  ChevronDown,
  Paperclip,
  Command,
  LoaderIcon,
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
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-white/90 rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: 'easeInOut',
          }}
          style={{ boxShadow: '0 0 4px rgba(0, 212, 170, 0.3)' }}
        />
      ))}
    </div>
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
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
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

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  }, []);

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
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-6 right-6 z-50 flex w-[400px] flex-col overflow-hidden rounded-2xl border border-white/[0.05] shadow-2xl shadow-black/40"
          style={{ height: '540px' }}
        >
          {/* Glassmorphism background */}
          <div className="absolute inset-0 bg-[#0A0A0B]/95 backdrop-blur-2xl" />
          {/* Subtle glow */}
          <div className="absolute top-0 left-1/4 w-48 h-48 bg-[#00D4AA]/5 rounded-full filter blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-indigo-500/5 rounded-full filter blur-[80px] pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05]">
                <Sparkles size={15} className="text-[#00D4AA]" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0A0A0B]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">RKV Consulting AI</h3>
                <p className="text-[10px] text-white/30">Property management assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearHistory}
                className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.05] hover:text-white/70 transition-colors"
                title="Clear chat"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.05] hover:text-white/70 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="relative flex-1 overflow-y-auto px-4 py-4 space-y-3"
          >
            {/* Empty state */}
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-center px-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 mb-1">
                    How can I help?
                  </h2>
                  <motion.div
                    className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mb-2"
                    initial={{ width: 0 }}
                    animate={{ width: '80%' }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  />
                  <p className="text-[11px] text-white/30 mb-5">
                    Ask about your portfolio or get PM advice
                  </p>
                </motion.div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <motion.button
                      key={q.text}
                      onClick={() => sendMessage(q.text)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.02] hover:bg-white/[0.06] rounded-lg text-[11px] text-white/50 hover:text-white/80 transition-all border border-white/[0.04] hover:border-white/[0.08]"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.06 }}
                    >
                      {q.icon}
                      <span>{q.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05]">
                    <Bot size={12} className="text-[#00D4AA]" />
                  </div>
                )}
                <div className="flex flex-col gap-0.5 max-w-[82%]">
                  <div
                    className={cn(
                      'rounded-xl px-3 py-2 text-xs leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-white text-[#0A0A0B] rounded-br-sm shadow-lg shadow-white/5'
                        : 'bg-white/[0.03] border border-white/[0.06] text-white/85 rounded-bl-sm',
                    )}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  <span
                    className={cn(
                      'text-[9px] text-white/20 px-1',
                      msg.role === 'user' ? 'text-right' : 'text-left',
                    )}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                {msg.role === 'user' && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10">
                    <User size={12} className="text-white/70" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Streaming */}
            {isStreaming && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05]">
                  <Bot size={12} className="text-[#00D4AA]" />
                </div>
                <div className="max-w-[82%] rounded-xl rounded-bl-sm bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-xs leading-relaxed text-white/85">
                  <div className="whitespace-pre-wrap">
                    {streamingText || (
                      <span className="flex items-center gap-1.5 text-white/40">
                        <span>Thinking</span>
                        <TypingDots />
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom */}
          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToBottom}
                className="absolute bottom-[76px] left-1/2 -translate-x-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.08] shadow-lg hover:bg-white/[0.1] transition-colors"
              >
                <ChevronDown size={14} className="text-white/50" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className="relative border-t border-white/[0.05] p-3">
            <div className="backdrop-blur-xl bg-white/[0.02] rounded-xl border border-white/[0.05]">
              <div className="px-3 py-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Ask about your properties..."
                  rows={1}
                  className="w-full resize-none bg-transparent text-xs text-white/90 placeholder:text-white/20 outline-none leading-relaxed"
                  style={{ height: '44px', maxHeight: '120px', overflow: 'hidden' }}
                  disabled={isStreaming}
                />
              </div>
              <div className="px-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button className="p-1.5 text-white/25 hover:text-white/60 rounded-lg transition-colors">
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-white/25 hover:text-white/60 rounded-lg transition-colors">
                    <Command className="w-3.5 h-3.5" />
                  </button>
                </div>
                <motion.button
                  onClick={() => sendMessage()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5',
                    input.trim()
                      ? 'bg-white text-[#0A0A0B] shadow-lg shadow-white/10'
                      : 'bg-white/[0.05] text-white/30',
                  )}
                >
                  {isStreaming ? (
                    <LoaderIcon className="w-3.5 h-3.5 animate-[spin_2s_linear_infinite]" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Focus glow effect */}
          {inputFocused && (
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#00D4AA]/5 rounded-full filter blur-[60px] pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
