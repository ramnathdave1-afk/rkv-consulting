'use client';

import React, { useEffect, useState } from 'react';
import FullScreenCalendar, { type CalendarDay } from '@/components/calendar/FullScreenCalendar';
import { Skeleton } from '@/components/ui/Skeleton';

export default function CalendarPage() {
  const [data, setData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/calendar');
        if (!res.ok) throw new Error('Failed to fetch calendar events');
        const json = await res.json();
        setData(json.events || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  if (loading) {
    return <CalendarSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Failed to load calendar
          </p>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <FullScreenCalendar data={data} />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header skeleton */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <Skeleton width={20} height={20} />
          <div>
            <Skeleton width={180} height={24} />
            <Skeleton width={120} height={16} className="mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton width={60} height={28} />
          <Skeleton width={28} height={28} />
          <Skeleton width={28} height={28} />
        </div>
      </div>

      {/* Legend skeleton */}
      <div
        className="flex items-center gap-4 px-6 py-2 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={80} height={14} />
        ))}
      </div>

      {/* Weekday headers */}
      <div
        className="grid grid-cols-7 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="py-2 flex justify-center">
            <Skeleton width={28} height={14} />
          </div>
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="p-2 border-b border-r"
            style={{ borderColor: 'var(--border)' }}
          >
            <Skeleton width={20} height={16} />
            <div className="mt-2 space-y-1">
              {i % 5 === 0 && <Skeleton width="100%" height={20} />}
              {i % 7 === 2 && <Skeleton width="80%" height={20} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
