'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  X,
  List,
  Grid3X3,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

export type EventCategory = 'showing' | 'maintenance' | 'call' | 'lease_expiration' | 'campaign';

export interface CalendarEvent {
  id: string;
  name: string;
  time: string;
  datetime: string;
  category: EventCategory;
}

export interface CalendarDay {
  day: string; // ISO date string
  events: CalendarEvent[];
}

interface FullScreenCalendarProps {
  data: CalendarDay[];
}

const categoryColors: Record<EventCategory, { dot: string; bg: string; label: string }> = {
  showing: { dot: 'bg-blue-500', bg: 'bg-blue-500/10', label: 'Showing' },
  maintenance: { dot: 'bg-orange-500', bg: 'bg-orange-500/10', label: 'Maintenance' },
  call: { dot: 'bg-purple-500', bg: 'bg-purple-500/10', label: 'Call' },
  lease_expiration: { dot: 'bg-red-500', bg: 'bg-red-500/10', label: 'Lease Expiration' },
  campaign: { dot: 'bg-teal-500', bg: 'bg-teal-500/10', label: 'Campaign' },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function EventDot({ category }: { category: EventCategory }) {
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full shrink-0', categoryColors[category].dot)}
    />
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const colors = categoryColors[event.category];
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-[var(--radius-sm,6px)] px-2 py-1 text-[12px] font-medium truncate',
        colors.bg,
      )}
      style={{ color: 'var(--text-primary)' }}
    >
      <EventDot category={event.category} />
      <span className="truncate">{event.name}</span>
      {event.time && (
        <span className="ml-auto shrink-0 opacity-60 text-[11px]">{event.time}</span>
      )}
    </div>
  );
}

function DayDetailPanel({
  date,
  events,
  onClose,
}: {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="w-full lg:w-80 shrink-0 rounded-[var(--radius-lg,16px)] border overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <p
            className="text-[15px] font-semibold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            {format(date, 'EEEE')}
          </p>
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            {format(date, 'MMMM d, yyyy')}
          </p>
        </div>
        <Button variant="icon" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>
      <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-center py-8 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            No events this day
          </p>
        ) : (
          events.map((event) => {
            const colors = categoryColors[event.category];
            return (
              <div
                key={event.id}
                className={cn(
                  'rounded-[var(--radius-md,10px)] p-3 border',
                  colors.bg,
                )}
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <EventDot category={event.category} />
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {colors.label}
                  </span>
                </div>
                <p
                  className="text-[14px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {event.name}
                </p>
                {event.time && (
                  <p className="flex items-center gap-1.5 mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    <Clock size={12} />
                    {event.time}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

export default function FullScreenCalendar({ data }: FullScreenCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Build a map from date string to events
  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of data) {
      const key = day.day; // YYYY-MM-DD
      map.set(key, day.events);
    }
    return map;
  }, [data]);

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventMap.get(key) || [];
  }, [selectedDate, eventMap]);

  // Events for the current month (list view)
  const monthEvents = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const result: { date: Date; events: CalendarEvent[] }[] = [];

    let day = monthStart;
    while (day <= monthEnd) {
      const key = format(day, 'yyyy-MM-dd');
      const events = eventMap.get(key);
      if (events && events.length > 0) {
        result.push({ date: day, events });
      }
      day = addDays(day, 1);
    }
    return result;
  }, [currentMonth, eventMap]);

  const goToPrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);
  const goToNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);
  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  }, []);

  // Count total events this month
  const totalMonthEvents = useMemo(() => {
    return monthEvents.reduce((acc, d) => acc + d.events.length, 0);
  }, [monthEvents]);

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 lg:px-6 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <CalendarIcon size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h1
              className="text-[20px] lg:text-[24px] font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {format(currentMonth, 'MMMM yyyy')}
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              {totalMonthEvents} event{totalMonthEvents !== 1 ? 's' : ''} this month
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isMobile && (
            <div
              className="flex items-center rounded-[var(--radius-md,10px)] border p-0.5"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                onClick={() => setView('grid')}
                className={cn(
                  'p-1.5 rounded-[var(--radius-sm,6px)] transition-colors',
                  view === 'grid' ? 'bg-[var(--accent-muted)]' : '',
                )}
                style={{ color: view === 'grid' ? 'var(--accent)' : 'var(--text-tertiary)' }}
              >
                <Grid3X3 size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn(
                  'p-1.5 rounded-[var(--radius-sm,6px)] transition-colors',
                  view === 'list' ? 'bg-[var(--accent-muted)]' : '',
                )}
                style={{ color: view === 'list' ? 'var(--accent)' : 'var(--text-tertiary)' }}
              >
                <List size={16} />
              </button>
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="icon" size="sm" onClick={goToPrevMonth}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="icon" size="sm" onClick={goToNextMonth}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap items-center gap-4 px-4 lg:px-6 py-2 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        {Object.entries(categoryColors).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            <span className={cn('w-2.5 h-2.5 rounded-full', val.dot)} />
            {val.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {view === 'grid' || isMobile ? (
          <>
            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Weekday headers */}
              <div
                className="grid grid-cols-7 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-[12px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {isMobile ? day.charAt(0) : day}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                {calendarDays.map((day, idx) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const events = eventMap.get(key) || [];
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(isSelected ? null : day)}
                      className={cn(
                        'relative flex flex-col p-1.5 lg:p-2 border-b border-r text-left transition-colors min-h-[80px] lg:min-h-[100px]',
                        !inMonth && 'opacity-30',
                        isSelected && 'ring-2 ring-[var(--accent)] ring-inset',
                      )}
                      style={{
                        borderColor: 'var(--border)',
                        background: today
                          ? 'var(--accent-muted)'
                          : isSelected
                          ? 'var(--bg-surface)'
                          : 'transparent',
                      }}
                    >
                      <span
                        className={cn(
                          'text-[13px] font-medium mb-1',
                          today && 'text-[var(--accent)] font-bold',
                        )}
                        style={{ color: today ? 'var(--accent)' : inMonth ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                      >
                        {format(day, 'd')}
                      </span>

                      {/* Event dots on mobile, cards on desktop */}
                      {isMobile ? (
                        events.length > 0 && (
                          <div className="flex gap-0.5 flex-wrap">
                            {events.slice(0, 4).map((e) => (
                              <EventDot key={e.id} category={e.category} />
                            ))}
                            {events.length > 4 && (
                              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                                +{events.length - 4}
                              </span>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                          {events.slice(0, 3).map((e) => (
                            <EventCard key={e.id} event={e} />
                          ))}
                          {events.length > 3 && (
                            <span
                              className="text-[11px] font-medium pl-1"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              +{events.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day detail panel */}
            <AnimatePresence>
              {selectedDate && (
                <DayDetailPanel
                  date={selectedDate}
                  events={selectedDayEvents}
                  onClose={() => setSelectedDate(null)}
                />
              )}
            </AnimatePresence>
          </>
        ) : (
          /* List View */
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {monthEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <CalendarIcon size={48} style={{ color: 'var(--text-tertiary)' }} />
                <p className="mt-4 text-[15px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  No events this month
                </p>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto">
                {monthEvents.map(({ date, events }) => (
                  <div key={format(date, 'yyyy-MM-dd')}>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-[var(--radius-md,10px)] text-[15px] font-bold',
                          isToday(date) ? 'bg-[var(--accent)] text-white' : 'border',
                        )}
                        style={
                          isToday(date)
                            ? {}
                            : { borderColor: 'var(--border)', color: 'var(--text-primary)' }
                        }
                      >
                        {format(date, 'd')}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {format(date, 'EEEE')}
                        </p>
                        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                          {format(date, 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 pl-[52px]">
                      {events.map((event) => {
                        const colors = categoryColors[event.category];
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              'flex items-center gap-3 rounded-[var(--radius-md,10px)] px-3 py-2.5 border',
                              colors.bg,
                            )}
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <EventDot category={event.category} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {event.name}
                              </p>
                              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                                {colors.label}
                              </p>
                            </div>
                            {event.time && (
                              <span className="text-[12px] shrink-0 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                <Clock size={12} />
                                {event.time}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
