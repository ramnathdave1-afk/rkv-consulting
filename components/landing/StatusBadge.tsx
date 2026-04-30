'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Overall = 'operational' | 'partial_outage' | 'major_outage';

interface HealthResponse {
  overall_status: Overall;
}

const COPY: Record<Overall, string> = {
  operational: 'All Systems Operational',
  partial_outage: 'Partial Outage',
  major_outage: 'Major Outage',
};

const DOT: Record<Overall, string> = {
  operational: 'bg-emerald-400',
  partial_outage: 'bg-amber-400',
  major_outage: 'bg-red-400',
};

/**
 * Compact "Status: X" pill with a colored dot, suitable for footers.
 * Polls /api/status/health every 60s. Falls back to 'operational' on error.
 */
export function StatusBadge({ className }: { className?: string }) {
  const [overall, setOverall] = useState<Overall>('operational');

  useEffect(() => {
    let cancelled = false;
    async function fetchOnce() {
      try {
        const res = await fetch('/api/status/health', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as HealthResponse;
        if (!cancelled) setOverall(data.overall_status);
      } catch {
        // ignore — keep previous value
      }
    }
    fetchOnce();
    const id = setInterval(fetchOnce, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Link
      href="/status"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-bg-secondary/40 px-3 py-1 text-xs text-text-secondary hover:text-text-primary hover:border-accent/40 transition',
        className,
      )}
    >
      <span className={cn('inline-block h-2 w-2 rounded-full', DOT[overall])}>
        <span
          className={cn(
            'inline-block h-2 w-2 rounded-full animate-ping opacity-60',
            DOT[overall],
          )}
        />
      </span>
      <span>Status: {COPY[overall]}</span>
    </Link>
  );
}
