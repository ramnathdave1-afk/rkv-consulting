'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useChatStore } from '@/store/chat-store';

export function ChatToggle() {
  const chatOpen = useAppStore((s) => s.chatOpen);
  const toggleChat = useAppStore((s) => s.toggleChat);
  const messages = useChatStore((s) => s.messages);

  // Show unread dot if the last message is from the assistant and chat is closed
  const lastMessage = messages[messages.length - 1];
  const hasUnread = !chatOpen && lastMessage?.role === 'assistant';

  return (
    <AnimatePresence>
      {!chatOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={toggleChat}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg shadow-accent/25 text-white hover:shadow-accent/40 transition-shadow"
          aria-label="Open AI chat"
        >
          <MessageSquare size={22} />

          {/* Pulse glow ring */}
          <span className="absolute inset-0 rounded-full bg-accent/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />

          {/* Outer glow */}
          <span className="absolute -inset-1 rounded-full bg-accent/10 blur-sm pointer-events-none" />

          {/* Unread indicator */}
          {hasUnread && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 border-2 border-bg-primary"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </motion.span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
