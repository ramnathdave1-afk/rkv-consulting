'use client';

import React, { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  CalendarDays,
  Home,
  Mail,
  Loader2,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  item_type: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  sort_order: number;
}

interface ChecklistDetail {
  id: string;
  status: string;
  move_in_date: string;
  welcome_email_sent: boolean;
  tenants: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  properties: { id: string; name: string; address_line1: string } | null;
  units: { id: string; unit_number: string } | null;
  move_in_checklist_items: ChecklistItem[];
}

interface ChecklistDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistId: string | null;
  onUpdated: () => void;
}

const statusBadge: Record<string, { variant: 'warning' | 'info' | 'success'; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  in_progress: { variant: 'info', label: 'In Progress' },
  completed: { variant: 'success', label: 'Completed' },
};

export default function ChecklistDetailModal({
  open,
  onOpenChange,
  checklistId,
  onUpdated,
}: ChecklistDetailModalProps) {
  const [checklist, setChecklist] = useState<ChecklistDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!open || !checklistId) {
      setChecklist(null);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/move-ins/${checklistId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setChecklist(json.checklist);
      } catch {
        toast.error('Failed to load checklist');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, checklistId]);

  const handleToggleItem = async (item: ChecklistItem) => {
    if (!checklist) return;
    setToggling(item.id);
    try {
      const res = await fetch(`/api/move-ins/${checklist.id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !item.completed }),
      });
      if (!res.ok) throw new Error('Failed to toggle');

      // Re-fetch to get updated state
      const detailRes = await fetch(`/api/move-ins/${checklist.id}`);
      if (detailRes.ok) {
        const json = await detailRes.json();
        setChecklist(json.checklist);
        onUpdated();
      }
    } catch {
      toast.error('Failed to update item');
    } finally {
      setToggling(null);
    }
  };

  const handleSendWelcomeEmail = async () => {
    if (!checklist || !checklist.tenants?.email) {
      toast.error('Tenant has no email address');
      return;
    }
    setSendingEmail(true);
    try {
      // Mark welcome_email_sent on the checklist
      const res = await fetch(`/api/move-ins/${checklist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ welcome_email_sent: true }),
      });
      if (!res.ok) throw new Error('Failed to send');
      toast.success('Welcome email sent');
      setChecklist((prev) => prev ? { ...prev, welcome_email_sent: true } : prev);
      onUpdated();
    } catch {
      toast.error('Failed to send welcome email');
    } finally {
      setSendingEmail(false);
    }
  };

  const items = checklist?.move_in_checklist_items || [];
  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const sb = statusBadge[checklist?.status || 'pending'] || statusBadge.pending;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="lg">
        {loading || !checklist ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="space-y-3 mt-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <ModalHeader
              title={`${checklist.tenants?.first_name || ''} ${checklist.tenants?.last_name || ''}`}
              description={`${checklist.properties?.name || 'Unknown property'}${checklist.units ? ` / Unit ${checklist.units.unit_number}` : ''}`}
            />
            <div className="px-6 pb-4 space-y-5">
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-text-muted" />
                  <span>
                    Move-in:{' '}
                    {checklist.move_in_date
                      ? format(parseISO(checklist.move_in_date), 'MMM d, yyyy')
                      : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Home size={13} className="text-text-muted" />
                  <span>{checklist.properties?.address_line1 || ''}</span>
                </div>
                <Badge variant={sb.variant} size="sm" dot>
                  {sb.label}
                </Badge>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-text-secondary">
                    Progress
                  </span>
                  <span className="text-xs font-semibold text-accent">
                    {completedCount}/{totalCount} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Checklist items */}
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {items.map((item) => {
                  const isToggling = toggling === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToggleItem(item)}
                      disabled={isToggling}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                        ${item.completed
                          ? 'bg-accent/5 hover:bg-accent/10'
                          : 'bg-bg-elevated/50 hover:bg-bg-elevated'}
                        disabled:opacity-50
                      `}
                    >
                      {isToggling ? (
                        <Loader2 size={18} className="text-accent animate-spin shrink-0" />
                      ) : item.completed ? (
                        <CheckCircle2 size={18} className="text-accent shrink-0" />
                      ) : (
                        <Circle size={18} className="text-text-muted shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            item.completed
                              ? 'text-text-secondary line-through'
                              : 'text-text-primary'
                          }`}
                        >
                          {item.label}
                        </p>
                        {item.completed && item.completed_at && (
                          <p className="text-[10px] text-text-muted mt-0.5">
                            Completed {format(parseISO(item.completed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <ModalFooter>
              <Button
                variant="ghost"
                icon={<Mail size={14} />}
                onClick={handleSendWelcomeEmail}
                loading={sendingEmail}
                disabled={checklist.welcome_email_sent}
              >
                {checklist.welcome_email_sent ? 'Welcome Email Sent' : 'Send Welcome Email'}
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
