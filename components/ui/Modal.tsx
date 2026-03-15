'use client';

import React, { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export interface ModalContentProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

const maxWidthMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };

function Modal({ open, onOpenChange, children }: ModalProps) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>{children}</Dialog.Root>;
}

function ModalTrigger({ children, asChild = true }: { children: ReactNode; asChild?: boolean }) {
  return <Dialog.Trigger asChild={asChild}>{children}</Dialog.Trigger>;
}

function ModalContent({ children, className, maxWidth = 'md', showClose = true }: ModalContentProps) {
  return (
    <Dialog.Portal>
      <AnimatePresence>
        <Dialog.Overlay asChild>
          <motion.div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2',
              'bg-bg-secondary border border-border rounded-xl backdrop-blur-xl focus:outline-none',
              maxWidthMap[maxWidth],
              className,
            )}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 350 } }}
            exit={{ opacity: 0, scale: 0.97, y: 5, transition: { duration: 0.15 } }}
          >
            {children}
            {showClose && (
              <Dialog.Close asChild>
                <button className="absolute right-4 top-4 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors" aria-label="Close">
                  <X size={16} />
                </button>
              </Dialog.Close>
            )}
          </motion.div>
        </Dialog.Content>
      </AnimatePresence>
    </Dialog.Portal>
  );
}

function ModalHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-6 pt-6 pb-2">
      <Dialog.Title className="text-lg font-display font-bold text-text-primary">{title}</Dialog.Title>
      {description && <Dialog.Description className="text-sm text-text-secondary mt-1">{description}</Dialog.Description>}
    </div>
  );
}

function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4 flex items-center justify-end gap-3 border-t border-border', className)}>{children}</div>;
}

Modal.displayName = 'Modal';
ModalTrigger.displayName = 'ModalTrigger';
ModalContent.displayName = 'ModalContent';
ModalHeader.displayName = 'ModalHeader';
ModalFooter.displayName = 'ModalFooter';

export { Modal, ModalTrigger, ModalContent, ModalHeader, ModalFooter };
export default Modal;
