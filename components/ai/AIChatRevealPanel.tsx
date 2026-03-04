'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MessageBubble } from '@/components/ai/MessageBubble';
import { StreamingResponse } from '@/components/ai/StreamingResponse';

export interface AIChatRevealPanelMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIChatRevealPanelProps {
  messages: AIChatRevealPanelMessage[];
  streamingContent?: string;
  isStreaming?: boolean;
  onSendMessage?: (content: string) => void;
  onNewConversation?: () => void;
  userInitials?: string;
  isEmpty?: boolean;
  /** Optional: custom empty state (e.g. quick action buttons) */
  emptyState?: React.ReactNode;
}

const MAX_CHARS = 4000;

export function AIChatRevealPanel({
  messages,
  streamingContent = '',
  isStreaming = false,
  onSendMessage,
  onNewConversation,
  userInitials = 'U',
  emptyState,
}: AIChatRevealPanelProps) {
  const [hovered, setHovered] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isEmpty = messages.length === 0 && !isStreaming;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage?.(trimmed);
    setInput('');
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex h-full w-full flex-col overflow-hidden"
    >
      <div className="relative flex flex-1 flex-col min-h-0">
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-0 h-full w-full"
              style={{
                background: 'radial-gradient(ellipse at 50% 40%, rgba(0,180,216,0.08) 0%, transparent 70%)',
              }}
            />
          )}
        </AnimatePresence>

        <div className="relative z-10 flex flex-1 flex-col min-h-0 p-4">
          <div className="flex flex-shrink-0 flex-col items-center justify-center py-2 text-center">
            <h1 className="flex select-none flex-col py-2 text-center text-2xl font-extrabold leading-none tracking-tight md:flex-row md:text-3xl lg:text-4xl">
              <span
                data-content="AI."
                className="relative before:absolute before:bottom-0 before:left-0 before:top-0 before:z-0 before:w-full before:px-2 before:content-[attr(data-content)] before:animate-gradient-background-1"
              >
                <span className="from-gradient-1-start to-gradient-1-end animate-gradient-foreground-1 bg-gradient-to-r bg-clip-text px-2 text-transparent">
                  AI.
                </span>
              </span>
              <span
                data-content="Chat."
                className="relative before:absolute before:bottom-0 before:left-0 before:top-0 before:z-0 before:w-full before:px-2 before:content-[attr(data-content)] before:animate-gradient-background-2"
              >
                <span className="from-gradient-2-start to-gradient-2-end animate-gradient-foreground-2 bg-gradient-to-r bg-clip-text px-2 text-transparent">
                  Chat.
                </span>
              </span>
              <span
                data-content="Experience."
                className="relative before:absolute before:bottom-0 before:left-0 before:top-0 before:z-0 before:w-full before:px-2 before:content-[attr(data-content)] before:animate-gradient-background-3"
              >
                <span className="from-gradient-3-start to-gradient-3-end animate-gradient-foreground-3 bg-gradient-to-r bg-clip-text px-2 text-transparent">
                  Experience.
                </span>
              </span>
            </h1>
            <p className="mx-auto mt-1 text-center text-xs text-white/50 md:max-w-2xl">
              How can I help you today?
            </p>
          </div>

          <ScrollArea className="flex-1 min-h-0 w-full overflow-auto px-1">
            <div id="chat" className="w-full py-4">
              {isEmpty ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  {emptyState ?? (
                    <p className="text-sm text-white/40">Send a message to get started.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      timestamp={msg.timestamp}
                      userInitials={userInitials}
                    />
                  ))}
                  {isStreaming && (
                    <StreamingResponse content={streamingContent} isStreaming={isStreaming} />
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="relative mt-2 flex-shrink-0 w-full">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  className="pl-12 pr-12 bg-[var(--card-bg)] border-white/10 text-white placeholder:text-white/40"
                  placeholder="Ask something with AI"
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                  disabled={isStreaming}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-1.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-sm p-0 text-white/60 hover:text-[var(--accent-primary)] hover:bg-white/5"
                  onClick={onNewConversation}
                >
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">New Chat</span>
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-sm p-0"
                  disabled={!input.trim() || isStreaming}
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
