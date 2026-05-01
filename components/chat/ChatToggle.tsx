'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleChat}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0369A1] text-white shadow-lg shadow-sky-900/20 hover:bg-[#0284C7] hover:ring-4 hover:ring-sky-100 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
          aria-label="Open AI chat"
        >
          <Sparkles size={22} />

          {hasUnread && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 border-2 border-white"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </motion.span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
