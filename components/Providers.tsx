'use client';

import React, { useState } from 'react';
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
    <QueryClientProvider client={queryClient}>
      <TooltipPrimitive.Provider delayDuration={200}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111111',
              color: '#f5f5f5',
              border: '1px solid #1e1e1e',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              boxShadow: '0 0 20px rgba(201, 168, 76, 0.1)',
            },
            success: {
              iconTheme: { primary: '#c9a84c', secondary: '#111111' },
            },
            error: {
              iconTheme: { primary: '#DC2626', secondary: '#111111' },
            },
            duration: 4000,
          }}
        />
      </TooltipPrimitive.Provider>
    </QueryClientProvider>
  );
}
