'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import ChecklistDetailModal from '@/components/move-ins/ChecklistDetailModal';
import CreateMoveInModal from '@/components/move-ins/CreateMoveInModal';
import toast from 'react-hot-toast';
import { format, parseISO, isAfter, isBefore, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  Plus,
  CalendarDays,
  Home,
  User,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface MoveInChecklist {
  id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  move_in_date: string | null;
  welcome_email_sent: boolean;
  completed_at: string | null;
  created_at: string;
  tenants: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  properties: { id: string; name: string; address_line1: string } | null;
  units: { id: string; unit_number: string } | null;
  total_items: number;
  completed_items: number;
}

const statusConfig: Record<string, { variant: 'warning' | 'info' | 'success'; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  in_progress: { variant: 'info', label: 'In Progress' },
  completed: { variant: 'success', label: 'Completed' },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, type: 'spring' as const, damping: 22, stiffness: 260 },
  }),
};

export default function MoveInsPage() {
  const [checklists, setChecklists] = useState<MoveInChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchChecklists = useCallback(async () => {
    try {
      const res = await fetch('/api/move-ins');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setChecklists(json.checklists || []);
    } catch {
      toast.error('Failed to load move-ins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  // KPI calculations
  const now = new Date();
  const thirtyDaysOut = addDays(now, 30);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const upcoming = useMemo(
    () =>
      checklists.filter(
        (c) =>
          c.status !== 'completed' &&
          c.move_in_date &&
          isAfter(parseISO(c.move_in_date), now) &&
          isBefore(parseISO(c.move_in_date), thirtyDaysOut),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checklists],
  );

  const inProgress = useMemo(
    () => checklists.filter((c) => c.status === 'in_progress'),
    [checklists],
  );

  const completedThisMonth = useMemo(
    () =>
      checklists.filter(
        (c) =>
          c.status === 'completed' &&
          c.completed_at &&
          isAfter(parseISO(c.completed_at), monthStart) &&
          isBefore(parseISO(c.completed_at), monthEnd),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checklists],
  );

  // Sections
  const upcomingSection = useMemo(
    () =>
      checklists
        .filter((c) => c.status !== 'completed' && c.status !== 'in_progress')
        .sort((a, b) => {
          if (!a.move_in_date) return 1;
          if (!b.move_in_date) return -1;
          return parseISO(a.move_in_date).getTime() - parseISO(b.move_in_date).getTime();
        }),
    [checklists],
  );

  const inProgressSection = useMemo(
    () =>
      checklists
        .filter((c) => c.status === 'in_progress')
        .sort((a, b) => {
          if (!a.move_in_date) return 1;
          if (!b.move_in_date) return -1;
          return parseISO(a.move_in_date).getTime() - parseISO(b.move_in_date).getTime();
        }),
    [checklists],
  );

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Move-Ins</h1>
          <p className="text-sm text-text-secondary">
            Track move-in checklists and onboard new tenants
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          New Move-In
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          className="glass-card p-4 flex items-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
            <Clock size={20} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{upcoming.length}</p>
            <p className="text-xs text-text-muted">Upcoming (30 days)</p>
          </div>
        </motion.div>
        <motion.div
          className="glass-card p-4 flex items-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{inProgress.length}</p>
            <p className="text-xs text-text-muted">In Progress</p>
          </div>
        </motion.div>
        <motion.div
          className="glass-card p-4 flex items-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{completedThisMonth.length}</p>
            <p className="text-xs text-text-muted">Completed This Month</p>
          </div>
        </motion.div>
      </div>

      {/* Empty state */}
      {checklists.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <ClipboardCheck size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No move-ins yet</h3>
          <p className="text-sm text-text-secondary">
            Create your first move-in checklist to start tracking tenant onboarding.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Move-Ins */}
          {upcomingSection.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                Upcoming Move-Ins ({upcomingSection.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcomingSection.map((c, i) => (
                  <MoveInCard key={c.id} checklist={c} index={i} onClick={() => openDetail(c.id)} />
                ))}
              </div>
            </section>
          )}

          {/* In Progress */}
          {inProgressSection.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                In Progress ({inProgressSection.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {inProgressSection.map((c, i) => (
                  <MoveInCard key={c.id} checklist={c} index={i} onClick={() => openDetail(c.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Completed (collapsed) */}
          {checklists.filter((c) => c.status === 'completed').length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                Completed ({checklists.filter((c) => c.status === 'completed').length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {checklists
                  .filter((c) => c.status === 'completed')
                  .slice(0, 6)
                  .map((c, i) => (
                    <MoveInCard key={c.id} checklist={c} index={i} onClick={() => openDetail(c.id)} />
                  ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateMoveInModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchChecklists}
      />
      <ChecklistDetailModal
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailId(null);
        }}
        checklistId={detailId}
        onUpdated={fetchChecklists}
      />
    </div>
  );
}

// ─── Move-In Card ──────────────────────────────────────────────────

interface MoveInCardProps {
  checklist: MoveInChecklist;
  index: number;
  onClick: () => void;
}

function MoveInCard({ checklist, index, onClick }: MoveInCardProps) {
  const pct =
    checklist.total_items > 0
      ? Math.round((checklist.completed_items / checklist.total_items) * 100)
      : 0;
  const sc = statusConfig[checklist.status] || statusConfig.pending;

  return (
    <motion.div
      className="glass-card p-4 flex flex-col gap-3 cursor-pointer hover:border-accent/30 transition-colors group"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      onClick={onClick}
    >
      {/* Top: tenant + status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <User size={18} className="text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">
              {checklist.tenants
                ? `${checklist.tenants.first_name} ${checklist.tenants.last_name}`
                : 'Unknown Tenant'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Home size={10} className="text-text-muted shrink-0" />
              <span className="text-[11px] text-text-muted truncate">
                {checklist.properties?.name || 'Unknown property'}
                {checklist.units ? ` / ${checklist.units.unit_number}` : ''}
              </span>
            </div>
          </div>
        </div>
        <Badge variant={sc.variant} size="sm" dot>
          {sc.label}
        </Badge>
      </div>

      {/* Move-in date */}
      <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
        <CalendarDays size={11} className="text-text-muted shrink-0" />
        <span>
          {checklist.move_in_date
            ? format(parseISO(checklist.move_in_date), 'MMM d, yyyy')
            : 'No date set'}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-text-muted">
            {checklist.completed_items}/{checklist.total_items} items
          </span>
          <span className="text-[10px] font-semibold text-accent">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end pt-1 border-t border-border">
        <span className="text-[11px] text-text-muted flex items-center gap-1 group-hover:text-accent transition-colors">
          View Checklist <ArrowRight size={11} />
        </span>
      </div>
    </motion.div>
  );
}
