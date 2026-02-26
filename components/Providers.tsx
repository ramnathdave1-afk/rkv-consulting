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
              background: '#111620',
              color: '#F0EDE8',
              border: '1px solid #1E2530',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
            },
            success: {
              iconTheme: { primary: '#C9A84C', secondary: '#111620' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#111620' },
            },
            duration: 4000,
          }}
        />
      </TooltipPrimitive.Provider>
    </QueryClientProvider>
  );
}
