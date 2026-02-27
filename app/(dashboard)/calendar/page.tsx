'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  DollarSign,
  Home,
  Users,
  Wrench,
  FileText,
  Phone,
  Eye,
  Clock,
  Send,
  RefreshCw,
  Landmark,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

/* ================================================================== */
/*  TYPE DEFINITIONS                                                    */
/* ================================================================== */

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  type: 'rent_due' | 'lease_expiry' | 'maintenance' | 'mortgage' | 'deal_closing' | 'tax_deadline' | 'meeting' | 'call' | 'showing' | 'inspection' | 'deadline' | 'other';
  color: string;
  propertyId?: string | null;
  propertyAddress?: string | null;
  propertyType?: string | null;
  propertyRent?: number | null;
  tenantId?: string | null;
  tenantName?: string | null;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  amount?: number | null;
  notes?: string | null;
  source: 'auto' | 'manual';
}

interface ManualEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'call' | 'showing' | 'inspection' | 'deadline' | 'other';
  propertyId: string;
  notes: string;
  color: string;
}

interface PropertyOption {
  id: string;
  address: string;
  property_type: string;
  monthly_rent: number | null;
}

type ViewMode = 'month' | 'week';

/* ================================================================== */
/*  CONSTANTS                                                           */
/* ================================================================== */

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  rent_due: '#059669',
  lease_expiry: '#D97706',
  maintenance: '#0EA5E9',
  mortgage: '#0EA5E9',
  deal_closing: '#059669',
  tax_deadline: '#DC2626',
  meeting: '#8B5CF6',
  call: '#06B6D4',
  showing: '#F59E0B',
  inspection: '#EC4899',
  deadline: '#DC2626',
  other: '#6B7280',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  rent_due: 'Rent Due',
  lease_expiry: 'Lease Expiry',
  maintenance: 'Maintenance',
  mortgage: 'Mortgage',
  deal_closing: 'Deal Closing',
  tax_deadline: 'Tax Deadline',
  meeting: 'Meeting',
  call: 'Call',
  showing: 'Showing',
  inspection: 'Inspection',
  deadline: 'Deadline',
  other: 'Other',
};

const MANUAL_EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Call' },
  { value: 'showing', label: 'Showing' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'other', label: 'Other' },
];

/* Tax quarter deadlines (month is 0-indexed) */
const TAX_DEADLINES = [
  { month: 3, day: 15 },  // April 15
  { month: 5, day: 15 },  // June 15
  { month: 8, day: 15 },  // September 15
  { month: 0, day: 15 },  // January 15
];

/* ================================================================== */
/*  HELPER FUNCTIONS                                                    */
/* ================================================================== */

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getWeekDates(year: number, month: number, day: number): Date[] {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getLeaseExpiryColor(leaseEnd: string): string {
  const end = new Date(leaseEnd);
  const now = new Date();
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return '#DC2626';
  if (diffDays <= 90) return '#D97706';
  return '#059669';
}

function generateId(): string {
  return `manual_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ================================================================== */
/*  CALENDAR STATS BAR                                                  */
/* ================================================================== */

function CalendarStatsBar({
  events,
  currentYear,
  currentMonth,
}: {
  events: CalendarEvent[];
  currentYear: number;
  currentMonth: number;
}) {
  const monthEvents = useMemo(() => {
    return events.filter((e) => {
      const { year, month } = parseDate(e.date);
      return year === currentYear && month === currentMonth;
    });
  }, [events, currentYear, currentMonth]);

  const totalEvents = monthEvents.length;
  const rentCollections = monthEvents.filter((e) => e.type === 'rent_due').length;
  const maintenanceScheduled = monthEvents.filter((e) => e.type === 'maintenance').length;
  const leasesExpiring = monthEvents.filter((e) => e.type === 'lease_expiry').length;

  const stats = [
    { label: 'Events This Month', value: totalEvents, variant: 'default' as const, icon: CalendarDays },
    { label: 'Rent Collections', value: rentCollections, variant: 'success' as const, icon: DollarSign },
    { label: 'Maintenance', value: maintenanceScheduled, variant: 'violet' as const, icon: Wrench },
    { label: 'Leases Expiring', value: leasesExpiring, variant: leasesExpiring > 0 ? 'warning' as const : 'muted' as const, icon: FileText },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-lg px-4 py-3"
          style={{ background: '#0C1018', border: '1px solid #161E2A' }}
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
            style={{ background: `${EVENT_TYPE_COLORS[stat.variant === 'success' ? 'rent_due' : stat.variant === 'violet' ? 'maintenance' : stat.variant === 'warning' ? 'lease_expiry' : 'other']}15` }}
          >
            <stat.icon
              size={16}
              style={{ color: EVENT_TYPE_COLORS[stat.variant === 'success' ? 'rent_due' : stat.variant === 'violet' ? 'maintenance' : stat.variant === 'warning' ? 'lease_expiry' : 'other'] }}
            />
          </div>
          <div>
            <p className="text-lg font-display font-bold text-white leading-none">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted font-body mt-0.5">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  EVENT DOT COMPONENT                                                 */
/* ================================================================== */

function EventDot({ color, title }: { color: string; title?: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
      title={title}
    />
  );
}

/* ================================================================== */
/*  MONTHLY CALENDAR GRID                                               */
/* ================================================================== */

function MonthlyCalendarGrid({
  year,
  month,
  events,
  onSelectDate,
  selectedDate,
  onSelectEvent,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1);

  /* Build the event map for this month */
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      const { year: ey, month: em } = parseDate(e.date);
      if (ey === year && em === month) {
        if (!map[e.date]) map[e.date] = [];
        map[e.date].push(e);
      }
    });
    return map;
  }, [events, year, month]);

  /* Cells: prev-month padding + current month + next-month padding */
  const cells: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

  /* Previous month trailing days */
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, isCurrentMonth: false, dateStr: formatDate(y, m, d) });
  }

  /* Current month */
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true, dateStr: formatDate(year, month, d) });
  }

  /* Next month leading days */
  const remaining = 42 - cells.length; // 6 rows * 7
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, isCurrentMonth: false, dateStr: formatDate(y, m, d) });
  }

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] uppercase tracking-wider font-body text-muted py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px" style={{ background: '#161E2A' }}>
        {cells.map((cell, idx) => {
          const dayEvents = eventsByDate[cell.dateStr] || [];
          const visibleEvents = dayEvents.slice(0, 3);
          const overflowCount = dayEvents.length - 3;
          const { year: cy, month: cm, day: cd } = parseDate(cell.dateStr);
          const today = isToday(cy, cm, cd);
          const isSelected = selectedDate === cell.dateStr;

          return (
            <button
              key={idx}
              onClick={() => {
                onSelectDate(cell.dateStr);
                if (dayEvents.length === 1) {
                  onSelectEvent(dayEvents[0]);
                }
              }}
              className={cn(
                'relative flex flex-col items-start p-1.5 min-h-[80px] md:min-h-[100px] transition-all duration-150',
                'hover:bg-tertiary/80 focus:outline-none focus:z-10',
                cell.isCurrentMonth ? 'bg-card' : 'bg-deep',
                isSelected && 'ring-1 ring-gold/40 z-10',
              )}
              style={{
                background: isSelected ? '#0F1620' : cell.isCurrentMonth ? '#0C1018' : '#060910',
              }}
            >
              {/* Day number */}
              <span
                className={cn(
                  'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-body transition-colors',
                  !cell.isCurrentMonth && 'text-muted-deep',
                  cell.isCurrentMonth && 'text-white',
                  today && 'bg-gold text-black font-bold',
                )}
              >
                {cell.day}
              </span>

              {/* Event dots */}
              {dayEvents.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-1 w-full">
                  {visibleEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      className="flex items-center gap-1 w-full text-left group/evt rounded px-0.5 hover:bg-white/5 transition-colors"
                    >
                      <EventDot color={event.color} />
                      <span className="text-[9px] md:text-[10px] text-muted group-hover/evt:text-white truncate font-body leading-tight">
                        {event.title.length > 18 ? event.title.slice(0, 18) + '...' : event.title}
                      </span>
                    </button>
                  ))}
                  {overflowCount > 0 && (
                    <span className="text-[9px] text-muted font-body px-0.5">
                      +{overflowCount} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  WEEKLY CALENDAR VIEW                                                */
/* ================================================================== */

function WeeklyCalendarView({
  year,
  month,
  day,
  events,
  onSelectEvent,
}: {
  year: number;
  month: number;
  day: number;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const weekDates = useMemo(() => getWeekDates(year, month, day), [year, month, day]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-px" style={{ background: '#161E2A' }}>
        {weekDates.map((date) => {
          const dateStr = formatDate(date.getFullYear(), date.getMonth(), date.getDate());
          const dayEvents = eventsByDate[dateStr] || [];
          const today = isToday(date.getFullYear(), date.getMonth(), date.getDate());

          return (
            <div
              key={dateStr}
              className="flex flex-col min-h-[400px]"
              style={{ background: '#0C1018' }}
            >
              {/* Day header */}
              <div
                className={cn(
                  'flex flex-col items-center py-3 border-b',
                )}
                style={{ borderColor: '#161E2A' }}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted font-body">
                  {DAYS_OF_WEEK[date.getDay()]}
                </span>
                <span
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-display font-bold mt-1',
                    today ? 'bg-gold text-black' : 'text-white',
                  )}
                >
                  {date.getDate()}
                </span>
                <span className="text-[9px] text-muted font-body mt-0.5">
                  {MONTH_NAMES[date.getMonth()].slice(0, 3)}
                </span>
              </div>

              {/* Events list */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {dayEvents.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[10px] text-muted-deep font-body">No events</span>
                  </div>
                )}
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className="w-full text-left rounded-md px-2 py-1.5 transition-all duration-150 hover:brightness-125 group/wk"
                    style={{
                      background: `${event.color}12`,
                      borderLeft: `2px solid ${event.color}`,
                    }}
                  >
                    <p className="text-[10px] font-body text-white truncate group-hover/wk:text-white leading-tight">
                      {event.title}
                    </p>
                    {event.time && (
                      <p className="text-[9px] text-muted font-mono mt-0.5">{event.time}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  EVENT DETAIL SIDE PANEL                                             */
/* ================================================================== */

function EventDetailPanel({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const typeLabel = EVENT_TYPE_LABELS[event.type] || event.type;

  const handleAction = (action: string) => {
    toast.success(action, {
      style: {
        background: '#0C1018',
        color: '#E2E8F0',
        border: '1px solid #161E2A',
      },
      iconTheme: {
        primary: '#059669',
        secondary: '#080B0F',
      },
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[384px] overflow-y-auto animate-slide-in-right"
        style={{
          background: '#0C1018',
          borderLeft: '1px solid #161E2A',
          boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#161E2A' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: event.color }}
            />
            <Badge
              size="sm"
              variant={
                event.type === 'rent_due' ? 'success' :
                event.type === 'tax_deadline' ? 'danger' :
                event.type === 'maintenance' ? 'violet' :
                event.type === 'lease_expiry' ? 'warning' :
                'default'
              }
            >
              {typeLabel}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Title */}
          <div>
            <h3 className="text-lg font-display font-bold text-white leading-snug">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted font-body">
              <CalendarIcon size={14} />
              <span>
                {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            {event.time && (
              <div className="flex items-center gap-2 mt-1 text-sm text-muted font-body">
                <Clock size={14} />
                <span>{event.time}</span>
              </div>
            )}
          </div>

          {/* Amount if present */}
          {event.amount != null && event.amount > 0 && (
            <div
              className="flex items-center gap-3 rounded-lg p-4"
              style={{ background: '#060910', border: '1px solid #161E2A' }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{ background: `${event.color}15` }}
              >
                <DollarSign size={18} style={{ color: event.color }} />
              </div>
              <div>
                <p className="text-xs text-muted font-body uppercase tracking-wider">Amount</p>
                <p className="text-lg font-display font-bold text-white">
                  {formatCurrency(event.amount)}
                </p>
              </div>
            </div>
          )}

          {/* Property card */}
          {event.propertyAddress && (
            <div
              className="rounded-lg p-4"
              style={{ background: '#060910', border: '1px solid #161E2A' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Home size={14} className="text-gold" />
                <span className="text-[10px] uppercase tracking-wider text-muted font-body">Linked Property</span>
              </div>
              <p className="text-sm font-body text-white font-medium">{event.propertyAddress}</p>
              {event.propertyType && (
                <p className="text-xs text-muted font-body mt-1 capitalize">
                  {event.propertyType.replace(/_/g, ' ')}
                </p>
              )}
              {event.propertyRent != null && event.propertyRent > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <DollarSign size={12} className="text-gold" />
                  <span className="text-xs text-muted font-body">
                    {formatCurrency(event.propertyRent)}/mo
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tenant card */}
          {event.tenantName && (
            <div
              className="rounded-lg p-4"
              style={{ background: '#060910', border: '1px solid #161E2A' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-gold" />
                <span className="text-[10px] uppercase tracking-wider text-muted font-body">Tenant</span>
              </div>
              <p className="text-sm font-body text-white font-medium">{event.tenantName}</p>
              {event.tenantEmail && (
                <p className="text-xs text-muted font-body mt-1">{event.tenantEmail}</p>
              )}
              {event.tenantPhone && (
                <div className="flex items-center gap-1 mt-1">
                  <Phone size={12} className="text-muted" />
                  <span className="text-xs text-muted font-body">{event.tenantPhone}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-body mb-1.5">Notes</p>
              <p className="text-sm text-white/80 font-body leading-relaxed">{event.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {event.type === 'rent_due' && (
              <Button
                variant="primary"
                fullWidth
                icon={<Send size={14} />}
                onClick={() => handleAction('Rent reminder sent to ' + (event.tenantName || 'tenant'))}
              >
                Send Reminder
              </Button>
            )}
            {event.type === 'lease_expiry' && (
              <Button
                variant="primary"
                fullWidth
                icon={<RefreshCw size={14} />}
                onClick={() => handleAction('Renewal offer sent for ' + (event.propertyAddress || 'property'))}
              >
                Send Renewal Offer
              </Button>
            )}
            {event.type === 'maintenance' && (
              <Button
                variant="primary"
                fullWidth
                icon={<Phone size={14} />}
                onClick={() => handleAction('Contractor confirmation sent for: ' + event.title)}
              >
                Confirm with Contractor
              </Button>
            )}
            {event.type === 'tax_deadline' && (
              <Button
                variant="primary"
                fullWidth
                icon={<Eye size={14} />}
                onClick={() => handleAction('Opening tax estimate view...')}
              >
                View Tax Estimate
              </Button>
            )}
            {event.type === 'deal_closing' && (
              <Button
                variant="primary"
                fullWidth
                icon={<FileText size={14} />}
                onClick={() => handleAction('Opening deal details for: ' + event.title)}
              >
                View Deal Details
              </Button>
            )}
            {event.type === 'mortgage' && (
              <Button
                variant="primary"
                fullWidth
                icon={<Landmark size={14} />}
                onClick={() => handleAction('Opening payment details...')}
              >
                View Payment Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ================================================================== */
/*  ADD EVENT MODAL                                                     */
/* ================================================================== */

function AddEventModal({
  open,
  onClose,
  onAdd,
  properties,
  preselectedDate,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (event: ManualEvent) => void;
  properties: PropertyOption[];
  preselectedDate?: string | null;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(preselectedDate || '');
  const [time, setTime] = useState('');
  const [type, setType] = useState('meeting');
  const [propertyId, setPropertyId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (preselectedDate) setDate(preselectedDate);
  }, [preselectedDate]);

  const handleSubmit = () => {
    if (!title.trim() || !date) {
      toast.error('Title and date are required');
      return;
    }

    const newEvent: ManualEvent = {
      id: generateId(),
      title: title.trim(),
      date,
      time,
      type: type as ManualEvent['type'],
      propertyId,
      notes,
      color: EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.other,
    };

    onAdd(newEvent);
    setTitle('');
    setDate('');
    setTime('');
    setType('meeting');
    setPropertyId('');
    setNotes('');
    onClose();
    toast.success('Event added to calendar', {
      style: {
        background: '#0C1018',
        color: '#E2E8F0',
        border: '1px solid #161E2A',
      },
      iconTheme: {
        primary: '#059669',
        secondary: '#080B0F',
      },
    });
  };

  const propertyOptions = [
    { value: '', label: 'None' },
    ...properties.map((p) => ({ value: p.id, label: p.address })),
  ];

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
      <ModalContent maxWidth="md">
        <ModalHeader title="Add Event" description="Create a new calendar event" />
        <div className="px-6 py-4 space-y-4">
          <Input
            label="Title"
            placeholder="Event title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              label="Time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <Select
            label="Type"
            options={MANUAL_EVENT_TYPES}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <Select
            label="Property"
            options={propertyOptions}
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            placeholder="Link to property (optional)"
          />
          <Textarea
            label="Notes"
            placeholder="Additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" onClick={handleSubmit} icon={<Plus size={14} />}>
            Add Event
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/* ================================================================== */
/*  LOADING SKELETON                                                    */
/* ================================================================== */

function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats bar skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="card" height="64px" />
        ))}
      </div>
      {/* Calendar skeleton */}
      <Skeleton variant="card" height="500px" />
    </div>
  );
}

/* ================================================================== */
/*  DAY EVENTS LIST (for selected date)                                 */
/* ================================================================== */

function DayEventsList({
  date,
  events,
  onSelectEvent,
}: {
  date: string;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const dayEvents = events.filter((e) => e.date === date);

  if (dayEvents.length === 0) return null;

  const { year, month, day } = parseDate(date);
  const dateObj = new Date(year, month, day);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: '#0C1018', border: '1px solid #161E2A' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: '#161E2A' }}>
        <h3 className="text-sm font-display font-semibold text-white">{formattedDate}</h3>
        <p className="text-[10px] text-muted font-body mt-0.5">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="divide-y" style={{ borderColor: '#161E2A' }}>
        {dayEvents.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
            style={{ borderColor: '#161E2A' }}
          >
            <div
              className="w-2 h-8 rounded-full shrink-0"
              style={{ backgroundColor: event.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-body text-white truncate">{event.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {event.time && (
                  <span className="text-[10px] text-muted font-mono">{event.time}</span>
                )}
                <Badge size="sm" variant="muted">{EVENT_TYPE_LABELS[event.type]}</Badge>
              </div>
            </div>
            {event.amount != null && event.amount > 0 && (
              <span className="text-xs font-mono text-gold shrink-0">
                {formatCurrency(event.amount)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN PAGE COMPONENT                                                 */
/* ================================================================== */

export default function CalendarPage() {
  /* ---------------------------------------------------------------- */
  /*  State                                                            */
  /* ---------------------------------------------------------------- */
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [manualEvents, setManualEvents] = useState<ManualEvent[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  All events (auto + manual) merged                                */
  /* ---------------------------------------------------------------- */
  const allEvents = useMemo(() => {
    const manualMapped: CalendarEvent[] = manualEvents.map((me) => {
      const prop = properties.find((p) => p.id === me.propertyId);
      return {
        id: me.id,
        title: me.title,
        date: me.date,
        time: me.time || undefined,
        type: me.type,
        color: me.color,
        propertyId: me.propertyId || null,
        propertyAddress: prop?.address || null,
        propertyType: prop?.property_type || null,
        propertyRent: prop?.monthly_rent || null,
        tenantId: null,
        tenantName: null,
        tenantEmail: null,
        tenantPhone: null,
        amount: null,
        notes: me.notes || null,
        source: 'manual' as const,
      };
    });
    return [...events, ...manualMapped];
  }, [events, manualEvents, properties]);

  /* ---------------------------------------------------------------- */
  /*  Navigation helpers                                               */
  /* ---------------------------------------------------------------- */
  const goToPrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDay(now.getDate());
  }, []);

  const goToPrevWeek = useCallback(() => {
    const d = new Date(currentYear, currentMonth, selectedDay);
    d.setDate(d.getDate() - 7);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
    setSelectedDay(d.getDate());
  }, [currentYear, currentMonth, selectedDay]);

  const goToNextWeek = useCallback(() => {
    const d = new Date(currentYear, currentMonth, selectedDay);
    d.setDate(d.getDate() + 7);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
    setSelectedDay(d.getDate());
  }, [currentYear, currentMonth, selectedDay]);

  /* ---------------------------------------------------------------- */
  /*  Fetch data from Supabase                                         */
  /* ---------------------------------------------------------------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const generatedEvents: CalendarEvent[] = [];

    try {
      /* ---- Fetch properties ---- */
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, address, city, state, property_type, monthly_rent, mortgage_payment, status');

      const props: PropertyOption[] = (propertiesData || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        address: p.address as string,
        property_type: p.property_type as string,
        monthly_rent: p.monthly_rent as number | null,
      }));
      setProperties(props);

      /* ---- Fetch tenants with property join ---- */
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('id, first_name, last_name, email, phone, lease_start, lease_end, monthly_rent, status, property_id, properties(id, address, property_type, monthly_rent)')
        .eq('status', 'active');

      if (tenantsData) {
        for (const tenant of tenantsData as Record<string, unknown>[]) {
          const tenantId = tenant.id as string;
          const firstName = tenant.first_name as string;
          const lastName = tenant.last_name as string;
          const tenantEmail = tenant.email as string | null;
          const tenantPhone = tenant.phone as string | null;
          const monthlyRent = tenant.monthly_rent as number;
          const leaseEnd = tenant.lease_end as string | null;
          const propertyId = tenant.property_id as string;
          const property = tenant.properties as Record<string, unknown> | null;
          const propAddress = property?.address as string | null;
          const propType = property?.property_type as string | null;
          const propRent = property?.monthly_rent as number | null;

          /* Rent due: 1st of every month for the visible range (current +-2 months) */
          for (let offset = -2; offset <= 2; offset++) {
            let m = currentMonth + offset;
            let y = currentYear;
            if (m < 0) { m += 12; y -= 1; }
            if (m > 11) { m -= 12; y += 1; }
            const rentDate = formatDate(y, m, 1);

            generatedEvents.push({
              id: `rent_${tenantId}_${rentDate}`,
              title: `${firstName} ${lastName} — Rent Due ${formatCurrency(monthlyRent)}`,
              date: rentDate,
              type: 'rent_due',
              color: '#059669',
              propertyId,
              propertyAddress: propAddress,
              propertyType: propType,
              propertyRent: propRent,
              tenantId,
              tenantName: `${firstName} ${lastName}`,
              tenantEmail,
              tenantPhone,
              amount: monthlyRent,
              notes: null,
              source: 'auto',
            });
          }

          /* Lease expiration */
          if (leaseEnd) {
            generatedEvents.push({
              id: `lease_${tenantId}_${leaseEnd}`,
              title: `${propAddress || 'Property'} Lease Expires`,
              date: leaseEnd,
              type: 'lease_expiry',
              color: getLeaseExpiryColor(leaseEnd),
              propertyId,
              propertyAddress: propAddress,
              propertyType: propType,
              propertyRent: propRent,
              tenantId,
              tenantName: `${firstName} ${lastName}`,
              tenantEmail,
              tenantPhone,
              amount: null,
              notes: `Lease for ${firstName} ${lastName} expires on this date.`,
              source: 'auto',
            });
          }
        }
      }

      /* ---- Fetch maintenance requests with property join ---- */
      const { data: maintenanceData } = await supabase
        .from('maintenance_requests')
        .select('id, title, scheduled_date, status, property_id, properties(id, address, property_type, monthly_rent)')
        .not('scheduled_date', 'is', null);

      if (maintenanceData) {
        for (const req of maintenanceData as Record<string, unknown>[]) {
          const scheduledDate = req.scheduled_date as string;
          if (!scheduledDate) continue;
          const property = req.properties as Record<string, unknown> | null;
          const propAddress = property?.address as string | null;

          generatedEvents.push({
            id: `maint_${req.id}`,
            title: `${req.title} at ${propAddress || 'Property'}`,
            date: scheduledDate,
            type: 'maintenance',
            color: '#0EA5E9',
            propertyId: req.property_id as string,
            propertyAddress: propAddress,
            propertyType: property?.property_type as string | null,
            propertyRent: property?.monthly_rent as number | null,
            tenantId: null,
            tenantName: null,
            tenantEmail: null,
            tenantPhone: null,
            amount: null,
            notes: `Status: ${req.status}`,
            source: 'auto',
          });
        }
      }

      /* ---- Fetch recurring mortgage transactions ---- */
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('id, category, amount, description, date, recurring, recurring_frequency, property_id')
        .eq('recurring', true)
        .eq('category', 'mortgage');

      if (transactionsData) {
        for (const tx of transactionsData as Record<string, unknown>[]) {
          const txAmount = tx.amount as number;
          const txDate = tx.date as string;
          const txDescription = tx.description as string | null;
          const prop = props.find((p) => p.id === tx.property_id);

          /* Generate monthly mortgage events for the visible range */
          if (txDate) {
            const { day: payDay } = parseDate(txDate);
            for (let offset = -2; offset <= 2; offset++) {
              let m = currentMonth + offset;
              let y = currentYear;
              if (m < 0) { m += 12; y -= 1; }
              if (m > 11) { m -= 12; y += 1; }
              const maxDay = getDaysInMonth(y, m);
              const effectiveDay = Math.min(payDay, maxDay);
              const mortDate = formatDate(y, m, effectiveDay);

              generatedEvents.push({
                id: `mortgage_${tx.id}_${mortDate}`,
                title: `Mortgage Payment — ${formatCurrency(txAmount)}`,
                date: mortDate,
                type: 'mortgage',
                color: '#0EA5E9',
                propertyId: tx.property_id as string | null,
                propertyAddress: prop?.address || null,
                propertyType: prop?.property_type || null,
                propertyRent: prop?.monthly_rent || null,
                tenantId: null,
                tenantName: null,
                tenantEmail: null,
                tenantPhone: null,
                amount: txAmount,
                notes: txDescription,
                source: 'auto',
              });
            }
          }
        }
      }

      /* ---- Fetch deals with close_date ---- */
      const { data: dealsData } = await supabase
        .from('deals')
        .select('id, title, close_date, address, asking_price, offer_price, stage')
        .not('close_date', 'is', null);

      if (dealsData) {
        for (const deal of dealsData as Record<string, unknown>[]) {
          const closeDate = deal.close_date as string;
          if (!closeDate) continue;

          generatedEvents.push({
            id: `deal_${deal.id}`,
            title: `${deal.title} — Closing`,
            date: closeDate,
            type: 'deal_closing',
            color: '#059669',
            propertyId: null,
            propertyAddress: deal.address as string | null,
            propertyType: null,
            propertyRent: null,
            tenantId: null,
            tenantName: null,
            tenantEmail: null,
            tenantPhone: null,
            amount: (deal.offer_price || deal.asking_price) as number | null,
            notes: `Stage: ${deal.stage}`,
            source: 'auto',
          });
        }
      }

      /* ---- Static quarterly tax deadlines ---- */
      for (let yearOffset = -1; yearOffset <= 1; yearOffset++) {
        const taxYear = currentYear + yearOffset;
        for (const { month: tm, day: td } of TAX_DEADLINES) {
          const taxDate = formatDate(taxYear, tm, td);
          generatedEvents.push({
            id: `tax_${taxDate}`,
            title: 'Quarterly Tax Payment Due',
            date: taxDate,
            type: 'tax_deadline',
            color: '#DC2626',
            propertyId: null,
            propertyAddress: null,
            propertyType: null,
            propertyRent: null,
            tenantId: null,
            tenantName: null,
            tenantEmail: null,
            tenantPhone: null,
            amount: null,
            notes: 'Estimated quarterly tax payment deadline for the IRS.',
            source: 'auto',
          });
        }
      }

      /* Also generate mortgage from properties that have mortgage_payment */
      if (propertiesData) {
        for (const prop of propertiesData as Record<string, unknown>[]) {
          const mortgagePayment = prop.mortgage_payment as number | null;
          if (!mortgagePayment || mortgagePayment <= 0) continue;

          /* Check if we already have a transaction-based mortgage for this property */
          const alreadyHasMortgage = generatedEvents.some(
            (e) => e.type === 'mortgage' && e.propertyId === prop.id
          );
          if (alreadyHasMortgage) continue;

          for (let offset = -2; offset <= 2; offset++) {
            let m = currentMonth + offset;
            let y = currentYear;
            if (m < 0) { m += 12; y -= 1; }
            if (m > 11) { m -= 12; y += 1; }
            const mortDate = formatDate(y, m, 1);

            generatedEvents.push({
              id: `propmort_${prop.id}_${mortDate}`,
              title: `Mortgage Payment — ${formatCurrency(mortgagePayment)}`,
              date: mortDate,
              type: 'mortgage',
              color: '#0EA5E9',
              propertyId: prop.id as string,
              propertyAddress: prop.address as string,
              propertyType: prop.property_type as string,
              propertyRent: prop.monthly_rent as number | null,
              tenantId: null,
              tenantName: null,
              tenantEmail: null,
              tenantPhone: null,
              amount: mortgagePayment,
              notes: null,
              source: 'auto',
            });
          }
        }
      }

      setEvents(generatedEvents);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------------------------------------------------------------- */
  /*  Event handlers                                                   */
  /* ---------------------------------------------------------------- */
  const handleSelectDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    const { day } = parseDate(dateStr);
    setSelectedDay(day);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleAddManualEvent = useCallback((event: ManualEvent) => {
    setManualEvents((prev) => [...prev, event]);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6">
      {/* ============================================================ */}
      {/*  PAGE HEADER                                                  */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
            Investment Calendar
          </h1>
          <p className="text-sm text-muted font-body mt-1">
            Track rent collections, lease expirations, maintenance, and closings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex items-center rounded-lg p-0.5"
            style={{ background: '#060910', border: '1px solid #161E2A' }}
          >
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body transition-all duration-200',
                viewMode === 'month'
                  ? 'bg-gold/15 text-gold'
                  : 'text-muted hover:text-white',
              )}
            >
              <CalendarDays size={14} />
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body transition-all duration-200',
                viewMode === 'week'
                  ? 'bg-gold/15 text-gold'
                  : 'text-muted hover:text-white',
              )}
            >
              <CalendarRange size={14} />
              Week
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
          >
            Today
          </Button>
          <Button
            variant="solid"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setAddModalOpen(true)}
          >
            Add Event
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  LOADING STATE                                                */}
      {/* ============================================================ */}
      {loading ? (
        <CalendarSkeleton />
      ) : (
        <>
          {/* ======================================================== */}
          {/*  STATS BAR                                                */}
          {/* ======================================================== */}
          <CalendarStatsBar
            events={allEvents}
            currentYear={currentYear}
            currentMonth={currentMonth}
          />

          {/* ======================================================== */}
          {/*  CALENDAR NAVIGATION                                      */}
          {/* ======================================================== */}
          <div
            className="flex items-center justify-between rounded-lg px-4 py-3"
            style={{ background: '#0C1018', border: '1px solid #161E2A' }}
          >
            <button
              onClick={viewMode === 'month' ? goToPrevMonth : goToPrevWeek}
              className="p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-display font-bold text-white tracking-tight">
              {viewMode === 'month'
                ? `${MONTH_NAMES[currentMonth]} ${currentYear}`
                : (() => {
                    const weekDates = getWeekDates(currentYear, currentMonth, selectedDay);
                    const first = weekDates[0];
                    const last = weekDates[6];
                    if (first.getMonth() === last.getMonth()) {
                      return `${MONTH_NAMES[first.getMonth()]} ${first.getDate()}–${last.getDate()}, ${first.getFullYear()}`;
                    }
                    return `${MONTH_NAMES[first.getMonth()].slice(0, 3)} ${first.getDate()} – ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${last.getDate()}, ${last.getFullYear()}`;
                  })()
              }
            </h2>
            <button
              onClick={viewMode === 'month' ? goToNextMonth : goToNextWeek}
              className="p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* ======================================================== */}
          {/*  CALENDAR GRID                                            */}
          {/* ======================================================== */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid #161E2A' }}
          >
            {viewMode === 'month' ? (
              <MonthlyCalendarGrid
                year={currentYear}
                month={currentMonth}
                events={allEvents}
                onSelectDate={handleSelectDate}
                selectedDate={selectedDate}
                onSelectEvent={handleSelectEvent}
              />
            ) : (
              <WeeklyCalendarView
                year={currentYear}
                month={currentMonth}
                day={selectedDay}
                events={allEvents}
                onSelectEvent={handleSelectEvent}
              />
            )}
          </div>

          {/* ======================================================== */}
          {/*  DAY EVENTS LIST (below calendar when date selected)      */}
          {/* ======================================================== */}
          {selectedDate && (
            <DayEventsList
              date={selectedDate}
              events={allEvents}
              onSelectEvent={handleSelectEvent}
            />
          )}
        </>
      )}

      {/* ============================================================ */}
      {/*  EVENT DETAIL SIDE PANEL                                      */}
      {/* ============================================================ */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* ============================================================ */}
      {/*  ADD EVENT MODAL                                              */}
      {/* ============================================================ */}
      <AddEventModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddManualEvent}
        properties={properties}
        preselectedDate={selectedDate}
      />
    </div>
  );
}
