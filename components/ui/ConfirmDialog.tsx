'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  loading?: boolean;
}

const variantStyles = {
  danger: 'bg-danger hover:bg-danger/90 text-white',
  warning: 'bg-warning hover:bg-warning/90 text-bg-primary',
  default: 'bg-accent hover:bg-accent-hover text-bg-primary',
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm glass-card p-6 rounded-xl shadow-2xl">
          <div className="flex items-start gap-3">
            {variant === 'danger' && (
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-danger-muted flex items-center justify-center">
                <AlertTriangle size={16} className="text-danger" />
              </div>
            )}
            <div className="flex-1">
              <Dialog.Title className="font-display text-base font-bold text-text-primary">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-text-secondary mt-1">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close className="p-1 rounded text-text-muted hover:text-text-primary transition-colors">
              <X size={14} />
            </Dialog.Close>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors">
              {cancelLabel}
            </Dialog.Close>
            <button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${variantStyles[variant]}`}
            >
              {loading ? 'Loading...' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
