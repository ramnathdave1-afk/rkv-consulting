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
              background: '#0C1017',
              color: '#F0F2F5',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              boxShadow: '0 0 20px rgba(0, 212, 170, 0.1)',
            },
            success: {
              iconTheme: { primary: '#00D4AA', secondary: '#0C1017' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#0C1017' },
            },
            duration: 4000,
          }}
        />
      </TooltipPrimitive.Provider>
    </QueryClientProvider>
  );
}
