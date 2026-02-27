'use client';

import React from 'react';
import toast, { Toaster as HotToaster, type ToastOptions } from 'react-hot-toast';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Theme tokens                                                       */
/* ------------------------------------------------------------------ */

const toastBaseStyle: React.CSSProperties = {
  background: '#0C1018',
  color: '#E2E8F0',
  border: '1px solid #161E2A',
  borderRadius: '0.5rem',
  padding: '12px 16px',
  fontSize: '0.8125rem',
  fontFamily: 'var(--font-body), Inter, system-ui, sans-serif',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 30px rgba(5, 150, 105, 0.03)',
};

/* ------------------------------------------------------------------ */
/*  Custom toast functions                                             */
/* ------------------------------------------------------------------ */

const customToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, {
      style: {
        ...toastBaseStyle,
        borderLeft: '3px solid #059669',
      },
      iconTheme: {
        primary: '#059669',
        secondary: '#0C1018',
      },
      ...options,
    }),

  error: (message: string, options?: ToastOptions) =>
    toast.error(message, {
      style: {
        ...toastBaseStyle,
        borderLeft: '3px solid #DC2626',
      },
      iconTheme: {
        primary: '#DC2626',
        secondary: '#0C1018',
      },
      ...options,
    }),

  info: (message: string, options?: ToastOptions) =>
    toast(message, {
      style: {
        ...toastBaseStyle,
        borderLeft: '3px solid #059669',
      },
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#059669"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      ),
      ...options,
    }),

  loading: (message: string, options?: ToastOptions) =>
    toast.loading(message, {
      style: toastBaseStyle,
      ...options,
    }),

  dismiss: toast.dismiss,
  promise: toast.promise,
};

/* ------------------------------------------------------------------ */
/*  Pre-configured Toaster component                                   */
/* ------------------------------------------------------------------ */

interface ToasterProps {
  className?: string;
}

function Toaster({ className }: ToasterProps) {
  return (
    <div className={cn(className)}>
      <HotToaster
        position="bottom-right"
        gutter={8}
        containerStyle={{
          bottom: 24,
          right: 24,
        }}
        toastOptions={{
          duration: 4000,
          style: toastBaseStyle,
          success: {
            style: {
              ...toastBaseStyle,
              borderLeft: '3px solid #059669',
            },
            iconTheme: {
              primary: '#059669',
              secondary: '#0C1018',
            },
          },
          error: {
            style: {
              ...toastBaseStyle,
              borderLeft: '3px solid #DC2626',
            },
            iconTheme: {
              primary: '#DC2626',
              secondary: '#0C1018',
            },
          },
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Display names                                                      */
/* ------------------------------------------------------------------ */

Toaster.displayName = 'Toaster';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Toaster, customToast as toast };
export default Toaster;
