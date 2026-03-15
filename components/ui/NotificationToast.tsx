'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Database, Shield, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'agent' | 'ingestion' | 'feasibility' | 'system';
}

const toastIcons = {
  agent: Zap,
  ingestion: Database,
  feasibility: Shield,
  system: Bell,
};

const toastColors = {
  agent: 'border-accent/50 bg-accent/5',
  ingestion: 'border-blue-500/50 bg-blue-500/5',
  feasibility: 'border-purple-500/50 bg-purple-500/5',
  system: 'border-yellow-500/50 bg-yellow-500/5',
};

// Global toast event bus
const listeners: Set<(toast: ToastItem) => void> = new Set();
export function showNotificationToast(toast: Omit<ToastItem, 'id'>) {
  const fullToast = { ...toast, id: crypto.randomUUID() };
  listeners.forEach((fn) => fn(fullToast));
}

export function NotificationToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: ToastItem) => {
    setToasts((prev) => [...prev.slice(-4), toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => { listeners.delete(addToast); };
  }, [addToast]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-16 right-4 z-[60] flex flex-col gap-2 w-80 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 backdrop-blur-md shadow-lg',
                toastColors[toast.type],
              )}
            >
              <Icon size={16} className="mt-0.5 shrink-0 text-text-muted" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{toast.title}</p>
                <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{toast.message}</p>
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
