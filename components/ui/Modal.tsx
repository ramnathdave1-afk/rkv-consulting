'use client';

import React, { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export interface ModalContentProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Set false to hide the default close button */
  showClose?: boolean;
}

export interface ModalHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Max width map                                                      */
/* ------------------------------------------------------------------ */

const maxWidthMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[90vw]',
};

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 350 },
  },
  exit: { opacity: 0, scale: 0.97, y: 5, transition: { duration: 0.15 } },
};

/* ------------------------------------------------------------------ */
/*  Close icon                                                         */
/* ------------------------------------------------------------------ */

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Compound components                                                */
/* ------------------------------------------------------------------ */

/** Root wrapper -- manages open state */
function Modal({ open, onOpenChange, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog.Root>
  );
}

/** Trigger element that opens the modal */
function ModalTrigger({
  children,
  className,
  asChild = true,
}: {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}) {
  return (
    <Dialog.Trigger asChild={asChild} className={className}>
      {children}
    </Dialog.Trigger>
  );
}

/** Content panel with overlay + animation */
function ModalContent({
  children,
  className,
  maxWidth = 'md',
  showClose = true,
}: ModalContentProps) {
  return (
    <Dialog.Portal>
      <AnimatePresence>
        {/* Overlay */}
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />
        </Dialog.Overlay>

        {/* Content */}
        <Dialog.Content asChild>
          <motion.div
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)]',
              '-translate-x-1/2 -translate-y-1/2',
              'backdrop-blur-xl rounded-lg',
              'focus:outline-none',
              maxWidthMap[maxWidth],
              className,
            )}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {children}

            {showClose && (
              <Dialog.Close asChild>
                <button
                  className={cn(
                    'absolute right-4 top-4 p-1.5 rounded-lg',
                    'text-muted hover:text-white hover:bg-[#c9a84c08]',
                    'transition-colors duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,168,76,0.20)]',
                  )}
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </Dialog.Close>
            )}
          </motion.div>
        </Dialog.Content>
      </AnimatePresence>
    </Dialog.Portal>
  );
}

/** Header with title and optional description */
function ModalHeader({ title, description, className }: ModalHeaderProps) {
  return (
    <div className={cn('px-6 pt-6 pb-2', className)}>
      <Dialog.Title className="text-lg font-display font-bold text-white">
        {title}
      </Dialog.Title>
      {description && (
        <Dialog.Description className="text-sm text-muted mt-1 font-body">
          {description}
        </Dialog.Description>
      )}
    </div>
  );
}

/** Footer - typically for action buttons */
function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 flex items-center justify-end gap-3',
        className,
      )}
      style={{ borderTop: '1px solid #1e1e1e' }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Display names                                                      */
/* ------------------------------------------------------------------ */

Modal.displayName = 'Modal';
ModalTrigger.displayName = 'ModalTrigger';
ModalContent.displayName = 'ModalContent';
ModalHeader.displayName = 'ModalHeader';
ModalFooter.displayName = 'ModalFooter';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Modal, ModalTrigger, ModalContent, ModalHeader, ModalFooter };
export default Modal;
