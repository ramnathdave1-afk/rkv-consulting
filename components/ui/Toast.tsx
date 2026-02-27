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
  borderRadius: '8px',
  padding: '12px 16px',
  fontSize: '13px',
  fontFamily: 'var(--font-body), Inter, system-ui, sans-serif',
};

/* ------------------------------------------------------------------ */
/*  Custom toast functions                                             */
/* ------------------------------------------------------------------ */

const customToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, {
      style: {
        ...toastBaseStyle,
        background: '#059669',
        borderColor: '#059669',
        color: '#FFFFFF',
      },
      iconTheme: {
        primary: '#FFFFFF',
        secondary: '#059669',
      },
      ...options,
    }),

  error: (message: string, options?: ToastOptions) =>
    toast.error(message, {
      style: {
        ...toastBaseStyle,
        background: '#DC2626',
        borderColor: '#DC2626',
        color: '#FFFFFF',
      },
      iconTheme: {
        primary: '#FFFFFF',
        secondary: '#DC2626',
      },
      ...options,
    }),

  warning: (message: string, options?: ToastOptions) =>
    toast(message, {
      style: {
        ...toastBaseStyle,
        background: '#D97706',
        borderColor: '#D97706',
        color: '#FFFFFF',
      },
      iconTheme: {
        primary: '#FFFFFF',
        secondary: '#D97706',
      },
      ...options,
    }),

  info: (message: string, options?: ToastOptions) =>
    toast(message, {
      style: {
        ...toastBaseStyle,
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
          duration: 3000,
          style: toastBaseStyle,
          success: {
            style: {
              ...toastBaseStyle,
              background: '#059669',
              borderColor: '#059669',
              color: '#FFFFFF',
            },
            iconTheme: {
              primary: '#FFFFFF',
              secondary: '#059669',
            },
          },
          error: {
            style: {
              ...toastBaseStyle,
              background: '#DC2626',
              borderColor: '#DC2626',
              color: '#FFFFFF',
            },
            iconTheme: {
              primary: '#FFFFFF',
              secondary: '#DC2626',
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
