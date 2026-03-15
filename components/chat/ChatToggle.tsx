'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

export function ChatToggle() {
  const chatOpen = useAppStore((s) => s.chatOpen);
  const toggleChat = useAppStore((s) => s.toggleChat);

  if (chatOpen) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleChat}
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-lg shadow-accent/25 text-white hover:shadow-accent/40 transition-shadow"
    >
      <MessageSquare size={20} />
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-accent/30 animate-ping" style={{ animationDuration: '3s' }} />
    </motion.button>
  );
}
