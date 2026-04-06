'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Column definition ──────────────────────────────────────────────
export interface TableColumn<T> {
  key: string;
  label: string;
  /** Column span out of 12 */
  span?: number;
  /** Render cell content */
  render: (row: T, index: number) => React.ReactNode;
  /** Header alignment */
  align?: 'left' | 'center' | 'right';
  /** Hide on mobile */
  hideOnMobile?: boolean;
  /** Mark as action column — hidden by default, shown on row hover */
  isAction?: boolean;
}

// ─── Row status for gradient effect ─────────────────────────────────
export type RowStatus = 'active' | 'warning' | 'critical' | 'inactive' | 'info' | 'success' | 'default';

// ─── Detail panel content ───────────────────────────────────────────
export interface DetailPanelProps<T> {
  row: T;
  onClose: () => void;
}

// ─── Props ──────────────────────────────────────────────────────────
interface AnimatedTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  getKey: (row: T) => string;
  getRowNumber?: (row: T, index: number) => string;
  getRowStatus?: (row: T) => RowStatus;
  detailPanel?: React.ComponentType<DetailPanelProps<T>>;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  className?: string;
}

export function AnimatedTable<T>({
  columns,
  data,
  getKey,
  getRowNumber,
  getRowStatus,
  detailPanel: DetailPanel,
  onRowClick,
  emptyState,
  title,
  subtitle,
  headerRight,
  className,
}: AnimatedTableProps<T>) {
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  const handleRowClick = (row: T) => {
    if (DetailPanel) {
      setSelectedRow(row);
    } else if (onRowClick) {
      onRowClick(row);
    }
  };

  /* Map numeric span to static Tailwind class so JIT can detect them */
  const spanClass = (span: number) => {
    const map: Record<number, string> = {
      1: 'col-span-1',
      2: 'col-span-2',
      3: 'col-span-3',
      4: 'col-span-4',
      5: 'col-span-5',
      6: 'col-span-6',
      7: 'col-span-7',
      8: 'col-span-8',
      9: 'col-span-9',
      10: 'col-span-10',
      11: 'col-span-11',
      12: 'col-span-12',
    };
    return map[span] || 'col-span-2';
  };

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        borderRadius: '16px',
        background: 'var(--bg-surface, #ffffff)',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        border: '1px solid var(--border, #f3f4f6)',
      }}
    >
      {/* Header */}
      {(title || headerRight) && (
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border, #f3f4f6)' }}
        >
          <div className="flex items-center gap-3">
            {title && (
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary, #111827)' }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="text-xs" style={{ color: 'var(--text-tertiary, #6b7280)' }}>
                {subtitle}
              </span>
            )}
          </div>
          {headerRight}
        </div>
      )}

      {/* Column headers — reference style */}
      <div
        className="grid grid-cols-12 gap-3 px-6 py-4"
        style={{
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-tertiary, #6b7280)',
          borderBottom: '1px solid var(--border, #f3f4f6)',
        }}
      >
        {getRowNumber && <div className="col-span-1 min-w-0 overflow-hidden truncate">#</div>}
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn(
              spanClass(col.span || 2),
              'min-w-0 overflow-hidden truncate',
              col.hideOnMobile && 'hidden md:block',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
            )}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div>
        {data.length === 0 && emptyState ? (
          <div className="px-6 py-12 text-center">{emptyState}</div>
        ) : (
          data.map((row, index) => {
            const key = getKey(row);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="relative cursor-pointer group row-hover"
                onClick={() => handleRowClick(row)}
                style={{
                  height: '48px',
                  borderBottom: '1px solid var(--border-light, #f9fafb)',
                }}
              >
                {/* Grid content */}
                <div className="relative grid grid-cols-12 gap-3 items-center h-full px-6 text-sm">
                  {getRowNumber && (
                    <div className="col-span-1 min-w-0 overflow-hidden">
                      <span
                        className="text-lg font-bold"
                        style={{ color: 'var(--text-tertiary, #6b7280)', opacity: 0.5 }}
                      >
                        {getRowNumber(row, index)}
                      </span>
                    </div>
                  )}
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className={cn(
                        spanClass(col.span || 2),
                        'min-w-0 overflow-hidden',
                        !col.isAction && 'truncate',
                        col.hideOnMobile && 'hidden md:block',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.isAction && 'flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                      )}
                    >
                      {col.render(row, index)}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Detail panel overlay */}
      <AnimatePresence>
        {selectedRow && DetailPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col z-10 overflow-hidden"
            style={{
              background: 'color-mix(in srgb, var(--bg-primary, #ffffff) 85%, transparent)',
              backdropFilter: 'blur(8px)',
              borderRadius: '16px',
            }}
          >
            <DetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Status badge helper ────────────────────────────────────────────
// Reference design badge classes: badge-green, badge-amber, badge-red, badge-blue, badge-purple

type BadgeCategory = 'green' | 'amber' | 'red' | 'gray' | 'blue' | 'purple';

const badgeFills: Record<BadgeCategory, { bg: string; text: string }> = {
  green:  { bg: '#ecfdf5', text: '#059669' },
  amber:  { bg: '#fffbeb', text: '#d97706' },
  red:    { bg: '#fef2f2', text: '#dc2626' },
  gray:   { bg: '#f3f4f6', text: '#6b7280' },
  blue:   { bg: '#eff6ff', text: '#2563eb' },
  purple: { bg: '#f5f3ff', text: '#7c3aed' },
};

const badgeFillsDark: Record<BadgeCategory, { bg: string; text: string }> = {
  green:  { bg: '#064e3b', text: '#34d399' },
  amber:  { bg: '#451a03', text: '#fbbf24' },
  red:    { bg: '#450a0a', text: '#f87171' },
  gray:   { bg: '#1f2937', text: '#9ca3af' },
  blue:   { bg: '#1e3a5f', text: '#60a5fa' },
  purple: { bg: '#2e1065', text: '#a78bfa' },
};

const statusToCategory: Record<string, BadgeCategory> = {
  active: 'green',
  occupied: 'green',
  completed: 'green',
  approved: 'green',
  renewed: 'green',
  success: 'green',
  low: 'green',

  pending: 'amber',
  assigned: 'amber',
  paused: 'amber',
  applicant: 'amber',
  medium: 'amber',
  notice: 'amber',

  delinquent: 'red',
  open: 'red',
  critical: 'red',
  overdue: 'red',
  emergency: 'red',
  inactive: 'red',
  expired: 'red',
  vacant: 'red',
  denied: 'red',
  terminated: 'red',
  high: 'red',

  vacating: 'gray',
  closed: 'gray',
  cancelled: 'gray',
  past: 'gray',
  draft: 'gray',

  in_progress: 'blue',
  scheduled: 'blue',
  sending: 'blue',
  prospect: 'blue',
  make_ready: 'blue',
  info: 'blue',

  parts_needed: 'purple',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const category = statusToCategory[status] || 'gray';
  const light = badgeFills[category];
  const dark = badgeFillsDark[category];

  return (
    <span
      className={cn(`inline-flex items-center select-none whitespace-nowrap status-badge-${category}`, className)}
      style={{
        height: '22px',
        padding: '0 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: '22px',
        backgroundColor: light.bg,
        color: light.text,
      }}
    >
      <style>{`
        [data-theme="dark"] .status-badge-${category},
        .dark .status-badge-${category} {
          background-color: ${dark.bg} !important;
          color: ${dark.text} !important;
        }
      `}</style>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Occupancy progress bar (inline, reference style) ───────────────
export function ProgressBars({ percentage, status = 'active' }: { percentage: number; status?: string }) {
  const getColor = () => {
    if (status === 'active' || status === 'success') return 'var(--accent, #0d9488)';
    if (status === 'warning' || status === 'paused') return '#d97706';
    if (status === 'critical' || status === 'inactive') return '#dc2626';
    return 'var(--accent, #0d9488)';
  };

  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          width: '64px',
          height: '6px',
          backgroundColor: 'var(--bg-hover, #f3f4f6)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(percentage, 100)}%`,
            height: '100%',
            backgroundColor: getColor(),
            borderRadius: '9999px',
            transition: 'width 300ms ease',
          }}
        />
      </div>
      <span
        className="text-xs font-medium min-w-[2.5rem]"
        style={{ color: 'var(--text-secondary, #6b7280)' }}
      >
        {percentage}%
      </span>
    </div>
  );
}
