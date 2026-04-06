'use client';

import React, { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem
      storageKey="rkv-theme"
    >
      <QueryClientProvider client={queryClient}>
        <TooltipPrimitive.Provider delayDuration={200}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
                boxShadow: 'var(--shadow-md)',
              },
              success: {
                iconTheme: { primary: 'var(--accent)', secondary: 'var(--bg-elevated)' },
              },
              error: {
                iconTheme: { primary: 'var(--danger)', secondary: 'var(--bg-elevated)' },
              },
              duration: 4000,
            }}
          />
        </TooltipPrimitive.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
