'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from 'react-beautiful-dnd';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Plus,
  LayoutGrid,
  List,
  ClipboardList,
  Clock,
  CheckCircle2,
  DollarSign,
  Droplets,
  Zap,
  Wind,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  Phone,
  Camera,
  ArrowUpDown,
  Bug,
  Shield,
  Hammer,
  TreePine,
  Search,
  User,
  MapPin,
  Edit3,
  UserPlus,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';

import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useGeolocation } from '@/hooks/useGeolocation';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type MaintenanceStatus = 'open' | 'assigned' | 'in_progress' | 'completed';
type Priority = 'emergency' | 'high' | 'normal' | 'low';
type Category =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'general'
  | 'exterior'
  | 'pest_control'
  | 'safety'
  | 'structural'
  | 'landscaping'
  | 'other';

interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id: string | null;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: MaintenanceStatus;
  estimated_cost: number | null;
  actual_cost: number | null;
  photos: string[];
  contractor_name: string | null;
  contractor_phone: string | null;
  contractor_bid: number | null;
  completion_notes: string | null;
  created_at: string;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  user_id: string;
  // Joined fields
  property?: {
    id: string;
    address: string;
    name: string;
  };
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    unit: string | null;
  };
}

interface Property {
  id: string;
  address: string;
  name: string;
}

interface PropertyWithLocation extends Property {
  city?: string;
  state?: string;
  zip?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface MatchedContractor {
  id: string;
  company_name?: string;
  contact_name?: string;
  phone?: string;
  trade?: string;
  city?: string;
  state?: string;
  composite_score?: number;
  score_composite?: number;
  google_rating?: number;
  google_review_count?: number;
  price_range_min?: number;
  price_range_max?: number;
  [key: string]: unknown;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  unit: string | null;
  property_id: string;
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const STATUS_COLUMNS: {
  id: MaintenanceStatus;
  label: string;
  borderColor: string;
  dotColor: string;
}[] = [
  { id: 'open', label: 'Open', borderColor: 'border-gold', dotColor: 'bg-gold' },
  { id: 'assigned', label: 'Assigned', borderColor: 'border-blue-400', dotColor: 'bg-blue-400' },
  { id: 'in_progress', label: 'In Progress', borderColor: 'border-orange-400', dotColor: 'bg-orange-400' },
  { id: 'completed', label: 'Completed', borderColor: 'border-green', dotColor: 'bg-green' },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string; variant: 'danger' | 'warning' | 'default' | 'info' }> = {
  emergency: { label: 'Emergency', className: 'bg-red/15 text-red border-red/20', variant: 'danger' },
  high: { label: 'High', className: 'bg-orange-400/15 text-orange-400 border-orange-400/20', variant: 'warning' },
  normal: { label: 'Normal', className: 'bg-gold/15 text-gold border-gold/20', variant: 'default' },
  low: { label: 'Low', className: 'bg-muted/15 text-muted border-muted/20', variant: 'info' },
};

const CATEGORY_CONFIG: Record<Category, { label: string; icon: React.ElementType }> = {
  plumbing: { label: 'Plumbing', icon: Droplets },
  electrical: { label: 'Electrical', icon: Zap },
  hvac: { label: 'HVAC', icon: Wind },
  appliance: { label: 'Appliance', icon: Hammer },
  general: { label: 'General', icon: Wrench },
  exterior: { label: 'Exterior', icon: TreePine },
  pest_control: { label: 'Pest Control', icon: Bug },
  safety: { label: 'Safety', icon: Shield },
  structural: { label: 'Structural', icon: Hammer },
  landscaping: { label: 'Landscaping', icon: TreePine },
  other: { label: 'Other', icon: Wrench },
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_CONFIG).map(([value, { label }]) => ({
  value,
  label,
}));

const PRIORITY_OPTIONS: { value: Priority; label: string; description: string }[] = [
  { value: 'emergency', label: 'Emergency', description: 'Immediate safety risk or major damage' },
  { value: 'high', label: 'High', description: 'Major inconvenience, needs quick action' },
  { value: 'normal', label: 'Normal', description: 'Standard repair, schedule within a week' },
  { value: 'low', label: 'Low', description: 'Minor issue, can be scheduled flexibly' },
];

type SortField = 'property' | 'title' | 'priority' | 'status' | 'tenant' | 'category' | 'days_open' | 'estimated_cost' | 'created_at';
type SortDir = 'asc' | 'desc';

/* ================================================================== */
/*  Suggested Contractors (placeholder data)                           */
/* ================================================================== */

/* (Placeholder contractors removed — now uses live matching API) */

/* ================================================================== */
/*  Helper: days open                                                  */
/* ================================================================== */

function daysOpen(createdAt: string): number {
  return differenceInDays(new Date(), new Date(createdAt));
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

/* ---- Stat Card ---- */
function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  iconBg: string;
}) {
  return (
    <Card className="rounded-lg flex items-center gap-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      <div className={cn('flex items-center justify-center w-11 h-11 rounded-xl', iconBg)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="label">{label}</p>
        <p className="text-2xl font-mono font-bold text-white leading-tight">{value}</p>
      </div>
    </Card>
  );
}

/* ---- Priority Badge ---- */
function PriorityBadge({ priority }: { priority: Priority }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border', config.className)}>
      {config.label}
    </span>
  );
}

/* ---- Status Badge ---- */
function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const col = STATUS_COLUMNS.find((c) => c.id === status);
  const labelMap: Record<MaintenanceStatus, string> = {
    open: 'Open',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  const colorMap: Record<MaintenanceStatus, string> = {
    open: 'bg-gold/15 text-gold border-gold/20',
    assigned: 'bg-blue-400/15 text-blue-400 border-blue-400/20',
    in_progress: 'bg-orange-400/15 text-orange-400 border-orange-400/20',
    completed: 'bg-green/15 text-green border-green/20',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border', colorMap[status])}>
      <span className={cn('w-1.5 h-1.5 rounded-full', col?.dotColor)} />
      {labelMap[status]}
    </span>
  );
}

/* ---- Star Rating ---- */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            'w-3.5 h-3.5',
            s <= Math.round(rating) ? 'fill-gold text-gold' : 'text-border',
          )}
        />
      ))}
      <span className="text-xs text-muted ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

/* ================================================================== */
/*  Kanban Card                                                        */
/* ================================================================== */

function KanbanCard({
  request,
  index,
  onClick,
}: {
  request: MaintenanceRequest;
  index: number;
  onClick: () => void;
}) {
  const catConfig = CATEGORY_CONFIG[request.category] || CATEGORY_CONFIG.general;
  const CatIcon = catConfig.icon as React.ComponentType<{ className?: string }>;
  const days = daysOpen(request.created_at);

  return (
    <Draggable draggableId={request.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            'rounded-lg rounded-lg p-4 cursor-grab select-none',
            'hover:border-gold/20 hover:shadow-glow-sm transition-all duration-200',
            snapshot.isDragging && 'shadow-glow border-gold/30 rotate-1 scale-[1.02]',
          )}
          style={{ background: '#111111', border: '1px solid #1e1e1e' }}
        >
          {/* Property address */}
          <p className="text-xs text-muted font-body truncate mb-1">
            {request.property?.address || 'Unknown Property'}
          </p>

          {/* Title */}
          <p className="text-sm font-semibold text-white font-body leading-snug mb-2 line-clamp-2">
            {request.title}
          </p>

          {/* Priority + Category */}
          <div className="flex items-center gap-2 mb-3">
            <PriorityBadge priority={request.priority} />
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <CatIcon className="w-3 h-3" />
              {catConfig.label}
            </span>
          </div>

          {/* Tenant */}
          {request.tenant && (
            <p className="text-xs text-text font-body mb-2 truncate">
              {request.tenant.first_name} {request.tenant.last_name}
              {request.tenant.unit && <span className="text-muted"> - Unit {request.tenant.unit}</span>}
            </p>
          )}

          {/* Bottom row: days open + cost */}
          <div className="flex items-center justify-between text-xs text-muted font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {days === 0 ? 'Today' : `${days}d open`}
            </span>
            {request.estimated_cost != null && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${request.estimated_cost.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

/* ================================================================== */
/*  Kanban Column                                                      */
/* ================================================================== */

function KanbanColumn({
  column,
  requests,
  onCardClick,
}: {
  column: (typeof STATUS_COLUMNS)[number];
  requests: MaintenanceRequest[];
  onCardClick: (req: MaintenanceRequest) => void;
}) {
  return (
    <div className={cn('rounded-xl p-4 min-w-[280px] flex flex-col border-t-2', column.borderColor)} style={{ background: '#111111' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', column.dotColor)} />
          <h3 className="label">{column.label}</h3>
        </div>
        <span className="flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-border/60 text-[10px] font-bold font-mono text-muted px-1.5">
          {requests.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 flex flex-col gap-3 min-h-[120px] rounded-lg p-1 transition-colors duration-200',
              snapshot.isDraggingOver && 'bg-gold/5 ring-1 ring-gold/20',
            )}
          >
            {requests.map((req, index) => (
              <KanbanCard
                key={req.id}
                request={req}
                index={index}
                onClick={() => onCardClick(req)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

/* ================================================================== */
/*  List View                                                          */
/* ================================================================== */

function ListView({
  requests,
  sortField,
  sortDir,
  onSort,
  onRowClick,
}: {
  requests: MaintenanceRequest[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onRowClick: (req: MaintenanceRequest) => void;
}) {
  const headers: { field: SortField; label: string; className?: string }[] = [
    { field: 'property', label: 'Property' },
    { field: 'title', label: 'Title' },
    { field: 'priority', label: 'Priority' },
    { field: 'status', label: 'Status' },
    { field: 'tenant', label: 'Tenant' },
    { field: 'category', label: 'Category' },
    { field: 'days_open', label: 'Days Open', className: 'text-right' },
    { field: 'estimated_cost', label: 'Est. Cost', className: 'text-right' },
    { field: 'created_at', label: 'Date' },
  ];

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {headers.map((h) => (
                <th
                  key={h.field}
                  onClick={() => onSort(h.field)}
                  className={cn(
                    'px-4 py-3 text-[10px] font-medium text-gold uppercase tracking-wider cursor-pointer',
                    'hover:text-white transition-colors whitespace-nowrap select-none',
                    h.className,
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {h.label}
                    {sortField === h.field ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => {
              const days = daysOpen(req.created_at);
              const catConfig = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.general;
              const CatIcon = catConfig.icon as React.ComponentType<{ className?: string }>;

              return (
                <tr
                  key={req.id}
                  onClick={() => onRowClick(req)}
                  className="border-b border-border/50 hover:bg-card/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-text font-body max-w-[200px] truncate">
                    {req.property?.address || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-sm text-white font-body font-medium max-w-[220px] truncate">
                    {req.title}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={req.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-body whitespace-nowrap">
                    {req.tenant
                      ? `${req.tenant.first_name} ${req.tenant.last_name}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <CatIcon className="w-3.5 h-3.5" />
                      {catConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted font-mono text-right tabular-nums">
                    {days === 0 ? 'Today' : `${days}d`}
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-mono text-right tabular-nums">
                    {req.estimated_cost != null
                      ? `$${req.estimated_cost.toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted font-mono whitespace-nowrap">
                    {format(new Date(req.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Detail Side Panel                                                  */
/* ================================================================== */

function DetailPanel({
  request,
  onClose,
  onMarkComplete,
  onUpdateNotes,
  onUpdateStatus,
  onAssignContractor,
  onAddCost,
}: {
  request: MaintenanceRequest;
  onClose: () => void;
  onMarkComplete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateStatus: (id: string, status: MaintenanceStatus) => void;
  onAssignContractor: (id: string, name: string, phone: string) => void;
  onAddCost: (id: string, cost: number) => void;
}) {
  const [notes, setNotes] = useState(request.completion_notes || '');
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [contractorName, setContractorName] = useState(request.contractor_name || '');
  const [contractorPhone, setContractorPhone] = useState(request.contractor_phone || '');
  const [showCostForm, setShowCostForm] = useState(false);
  const [newCost, setNewCost] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const catConfig = CATEGORY_CONFIG[request.category] || CATEGORY_CONFIG.general;
  const CatIcon = catConfig.icon as React.ComponentType<{ className?: string }>;

  /* Timeline */
  const timelineSteps = [
    { label: 'Created', date: request.created_at, active: true },
    { label: 'Assigned', date: request.assigned_at, active: !!request.assigned_at },
    { label: 'Work Started', date: request.started_at, active: !!request.started_at },
    { label: 'Completed', date: request.completed_at, active: !!request.completed_at },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 440, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 440, opacity: 0 }}
        transition={{ type: 'spring' as const, damping: 28, stiffness: 300 }}
        className="fixed right-0 top-16 bottom-0 w-[440px] z-40 overflow-y-auto shadow-card"
        style={{ background: '#111111', borderLeft: '1px solid #1e1e1e' }}
      >
        {/* Header */}
        <div className="sticky top-0 backdrop-blur-sm px-6 py-4 flex items-start justify-between z-10" style={{ background: 'rgba(4,8,16,0.95)', borderBottom: '1px solid #1e1e1e' }}>
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-3 h-3 text-muted" />
              <p className="text-xs text-muted font-body">
                {request.property?.address || 'Unknown Property'}
              </p>
            </div>
            <h2 className="text-lg font-display font-semibold text-white leading-snug">
              {request.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <PriorityBadge priority={request.priority} />
            <StatusBadge status={request.status} />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <CatIcon className="w-3.5 h-3.5" />
              {catConfig.label}
            </span>
          </div>

          {/* Description */}
          <div>
            <h4 className="label mb-2">Description</h4>
            <p className="text-sm text-text font-body leading-relaxed">
              {request.description || 'No description provided.'}
            </p>
          </div>

          {/* Property Address */}
          <div>
            <h4 className="label mb-2">Property</h4>
            <div className="rounded-lg rounded-lg p-3 flex items-center gap-3" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-gold" />
              </div>
              <div>
                <p className="text-sm font-medium text-white font-body">
                  {request.property?.name || 'Property'}
                </p>
                <p className="text-xs text-muted font-mono">{request.property?.address || 'No address'}</p>
              </div>
            </div>
          </div>

          {/* Tenant info */}
          {request.tenant && (
            <div>
              <h4 className="label mb-2">Reported By</h4>
              <div className="rounded-lg rounded-lg p-3" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-400/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white font-body">
                      {request.tenant.first_name} {request.tenant.last_name}
                    </p>
                    {request.tenant.unit && (
                      <p className="text-xs text-muted font-mono mt-0.5">Unit {request.tenant.unit}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                  <p className="text-xs text-muted font-mono">{request.tenant.email}</p>
                  {request.tenant.phone && (
                    <p className="text-xs text-muted font-mono flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      {request.tenant.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cost Tracking */}
          <div>
            <h4 className="label mb-2">Cost Tracking</h4>
            <div className="rounded-lg rounded-lg p-3" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="label">Estimated</p>
                  <p className="text-sm font-semibold text-white font-mono mt-0.5">
                    {request.estimated_cost != null ? `$${request.estimated_cost.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="label">Actual</p>
                  <p className={cn(
                    'text-sm font-semibold font-mono mt-0.5',
                    request.actual_cost != null
                      ? request.actual_cost > (request.estimated_cost || 0)
                        ? 'text-red'
                        : 'text-green'
                      : 'text-white',
                  )}>
                    {request.actual_cost != null ? `$${request.actual_cost.toLocaleString()}` : '-'}
                  </p>
                </div>
              </div>
              {request.estimated_cost != null && request.actual_cost != null && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Variance</span>
                    <span className={cn(
                      'font-semibold font-mono',
                      request.actual_cost - request.estimated_cost > 0 ? 'text-red' : 'text-green',
                    )}>
                      {request.actual_cost - request.estimated_cost > 0 ? '+' : ''}
                      ${(request.actual_cost - request.estimated_cost).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          <div>
            <h4 className="label mb-3">Timeline</h4>
            <div className="relative pl-6">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gold/30" />
              <div className="space-y-4">
                {timelineSteps.map((step) => (
                  <div key={step.label} className="relative flex items-start gap-3">
                    {/* Dot */}
                    <div
                      className={cn(
                        'absolute -left-6 top-0.5 w-[14px] h-[14px] rounded-full border-2 z-10',
                        step.active
                          ? 'bg-gold border-gold/40'
                          : 'bg-deep border-border',
                      )}
                    />
                    <div>
                      <p className={cn('text-sm font-body', step.active ? 'text-white font-medium' : 'text-muted')}>
                        {step.label}
                      </p>
                      {step.date && (
                        <p className="text-xs text-muted font-mono mt-0.5">
                          {format(new Date(step.date), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Photo Gallery */}
          <div>
            <h4 className="label mb-2">Photos</h4>
            {request.photos && request.photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {request.photos.map((photo, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-lg overflow-hidden bg-card border border-border group"
                  >
                    <Image
                      src={photo}
                      alt={`Maintenance photo ${i + 1}`}
                      fill
                      sizes="120px"
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Camera className="w-6 h-6 text-muted/40 mx-auto mb-2" />
                <p className="text-xs text-muted">No photos attached</p>
                <p className="text-[10px] text-muted/60 mt-1">Photos will appear here when uploaded</p>
              </div>
            )}
          </div>

          {/* Contractor Section */}
          <div>
            <h4 className="label mb-2">Contractor</h4>
            {request.contractor_name ? (
              <div className="rounded-lg rounded-lg p-3" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-green" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white font-body">{request.contractor_name}</p>
                    {request.contractor_phone && (
                      <p className="text-xs text-muted font-mono mt-0.5 flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        {request.contractor_phone}
                      </p>
                    )}
                  </div>
                </div>
                {request.contractor_bid != null && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-gold font-mono flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3" />
                      Bid: ${request.contractor_bid.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg p-3 text-center" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <p className="text-xs text-muted mb-2">No contractor assigned</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <h4 className="label mb-2">Completion Notes</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => onUpdateNotes(request.id, notes)}
              placeholder="Add notes about the repair, parts used, etc."
              className={cn(
                'w-full bg-card text-white font-body text-sm',
                'border border-border rounded-lg px-3 py-2.5',
                'placeholder:text-muted/60',
                'transition-all duration-200',
                'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40',
                'min-h-[80px] resize-y',
              )}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Update Status */}
            {request.status !== 'completed' && (
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-card border border-border text-white hover:border-gold/30 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  Update Status
                  <ChevronDown className="w-3 h-3 ml-auto" />
                </button>
                {showStatusMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-card z-20 overflow-hidden">
                    {STATUS_COLUMNS.filter((c) => c.id !== request.status).map((col) => (
                      <button
                        key={col.id}
                        onClick={() => {
                          onUpdateStatus(request.id, col.id);
                          setShowStatusMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text hover:bg-white/5 transition-colors"
                      >
                        <span className={cn('w-2 h-2 rounded-full', col.dotColor)} />
                        {col.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Assign Contractor */}
            {!showAssignForm ? (
              <button
                onClick={() => setShowAssignForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-card border border-border text-white hover:border-gold/30 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Assign Contractor
              </button>
            ) : (
              <div className="bg-card border border-border rounded-lg p-3 space-y-3">
                <p className="text-xs font-semibold text-white">Assign Contractor</p>
                <input
                  type="text"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="Contractor name"
                  className="w-full h-9 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                />
                <input
                  type="text"
                  value={contractorPhone}
                  onChange={(e) => setContractorPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full h-9 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAssignForm(false)}
                    className="flex-1 py-2 rounded-lg text-xs text-muted hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (contractorName.trim()) {
                        onAssignContractor(request.id, contractorName, contractorPhone);
                        setShowAssignForm(false);
                      }
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gold text-black hover:brightness-110 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Add Cost */}
            {!showCostForm ? (
              <button
                onClick={() => setShowCostForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-card border border-border text-white hover:border-gold/30 transition-all"
              >
                <DollarSign className="w-4 h-4" />
                Add Cost
              </button>
            ) : (
              <div className="bg-card border border-border rounded-lg p-3 space-y-3">
                <p className="text-xs font-semibold text-white">Actual Cost</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                  <input
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full h-9 rounded-lg bg-deep border border-border pl-7 pr-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCostForm(false)}
                    className="flex-1 py-2 rounded-lg text-xs text-muted hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const cost = parseFloat(newCost);
                      if (!isNaN(cost) && cost >= 0) {
                        onAddCost(request.id, cost);
                        setShowCostForm(false);
                        setNewCost('');
                      }
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gold text-black hover:brightness-110 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Mark Complete */}
            {request.status !== 'completed' && (
              <Button
                variant="primary"
                fullWidth
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => onMarkComplete(request.id)}
              >
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================================================================== */
/*  New Request Modal                                                  */
/* ================================================================== */

function NewRequestModal({
  open,
  onOpenChange,
  properties,
  tenants,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  tenants: Tenant[];
  onSubmit: (data: {
    property_id: string;
    tenant_id: string | null;
    title: string;
    description: string;
    category: Category;
    priority: Priority;
    estimated_cost: number | null;
    photos: File[];
  }) => void;
}) {
  const [propertyId, setPropertyId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [priority, setPriority] = useState<Priority>('normal');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Filtered tenants based on selected property
  const propertyTenants = useMemo(() => {
    if (!propertyId) return [];
    return tenants.filter((t) => t.property_id === propertyId);
  }, [propertyId, tenants]);

  // Auto-select tenant when only one for the property
  useEffect(() => {
    if (propertyTenants.length === 1) {
      setTenantId(propertyTenants[0].id);
    } else {
      setTenantId('');
    }
  }, [propertyTenants]);

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setPhotos((prev) => [...prev, ...acceptedFiles].slice(0, 10));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic'] },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024,
  });

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setPropertyId('');
    setTenantId('');
    setTitle('');
    setDescription('');
    setCategory('general');
    setPriority('normal');
    setEstimatedCost('');
    setPhotos([]);
    setSubmitting(false);
  }

  async function handleSubmit() {
    if (!propertyId || !title.trim()) return;
    setSubmitting(true);
    await onSubmit({
      property_id: propertyId,
      tenant_id: tenantId || null,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      photos,
    });
    resetForm();
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <ModalContent maxWidth="xl" className="max-h-[90vh] overflow-y-auto">
        <ModalHeader
          title="New Maintenance Request"
          description="Submit a maintenance request for one of your properties"
        />

        <div className="px-6 py-4 space-y-5">
          {/* Property selector */}
          <Select
            label="Property"
            placeholder="Select a property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            options={properties.map((p) => ({
              value: p.id,
              label: p.name ? `${p.name} - ${p.address}` : p.address,
            }))}
          />

          {/* Tenant - auto-populated */}
          {propertyTenants.length > 0 && (
            <Select
              label="Tenant / Unit"
              placeholder="Select tenant"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              options={propertyTenants.map((t) => ({
                value: t.id,
                label: `${t.first_name} ${t.last_name}${t.unit ? ` - Unit ${t.unit}` : ''}`,
              }))}
            />
          )}

          {/* Title */}
          <Input
            label="Title"
            placeholder="e.g. Leaking kitchen faucet"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Description */}
          <Textarea
            label="Description"
            placeholder="Describe the issue in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Category */}
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            options={CATEGORY_OPTIONS}
          />

          {/* Priority -- radio cards */}
          <div>
            <label className="block text-sm text-muted font-body mb-2">Priority</label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const isSelected = priority === opt.value;
                const colorMap: Record<Priority, string> = {
                  emergency: 'border-red bg-red/5',
                  high: 'border-orange-400 bg-orange-400/5',
                  normal: 'border-gold bg-gold/5',
                  low: 'border-muted bg-muted/5',
                };
                const textMap: Record<Priority, string> = {
                  emergency: 'text-red',
                  high: 'text-orange-400',
                  normal: 'text-gold',
                  low: 'text-muted',
                };

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={cn(
                      'text-left rounded-lg border p-3 transition-all duration-200',
                      isSelected
                        ? colorMap[opt.value]
                        : 'border-border bg-deep hover:border-border/80',
                    )}
                  >
                    <p className={cn('text-sm font-semibold font-body', isSelected ? textMap[opt.value] : 'text-white')}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-muted font-body mt-0.5">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm text-muted font-body mb-2">Photos</label>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer',
                'transition-all duration-200',
                isDragActive
                  ? 'border-gold bg-gold/5'
                  : 'border-border hover:border-gold/30 hover:bg-card/50',
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-gold" />
                </div>
                <p className="text-sm text-text font-body">
                  {isDragActive ? 'Drop photos here' : 'Drag photos here or click to browse'}
                </p>
                <p className="text-xs text-muted font-body">
                  Up to 10 images, max 10MB each
                </p>
              </div>
            </div>

            {/* Photo previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {photos.map((file, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-card border border-border group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Budget Estimate */}
          <Input
            label="Budget Estimate"
            type="number"
            placeholder="0.00"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            icon={<DollarSign className="w-4 h-4" />}
          />
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            disabled={!propertyId || !title.trim()}
            onClick={handleSubmit}
            icon={<Plus className="w-4 h-4" />}
          >
            Submit Request
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/* ================================================================== */
/*  Add Contractor Form (when no match results)                        */
/* ================================================================== */

function AddContractorForm({
  category,
  city,
  state,
  onAdded,
  hasPropertyLocation,
  geoHook,
  locationLabel,
}: {
  category: string;
  city: string;
  state: string;
  onAdded: (c: MatchedContractor) => void;
  hasPropertyLocation: boolean;
  geoHook: { requestLocation: () => void; loading: boolean; location: { city: string; state: string; zip: string } | null };
  locationLabel: string | null;
}) {
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company.trim(),
          contact_name: contact.trim() || undefined,
          phone: phone.trim() || undefined,
          trade: category,
          city: city || undefined,
          state: state || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onAdded({
          id: data.id,
          company_name: data.company_name || company.trim(),
          contact_name: data.contact_name || contact.trim(),
          phone: data.phone || phone.trim(),
          trade: data.trade || category,
          city: data.city || city,
          state: data.state || state,
          score_composite: 0.5,
        });
        setCompany('');
        setContact('');
        setPhone('');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg p-8 text-center" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      <Search className="w-8 h-8 text-muted-deep mx-auto mb-3" />
      <p className="font-mono text-sm text-muted-deep">NO CONTRACTORS FOUND</p>
      <p className="font-mono text-[11px] text-muted-deep mt-1">
        No contractors matched for {category} in {locationLabel}
      </p>
      <form onSubmit={handleSubmit} className="mt-6 max-w-sm mx-auto text-left space-y-3">
        <Input placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} className="bg-deep border-border" />
        <Input placeholder="Contact name" value={contact} onChange={(e) => setContact(e.target.value)} className="bg-deep border-border" />
        <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-deep border-border" />
        <Button type="submit" disabled={saving} className="w-full">{saving ? 'Adding…' : 'Add this contractor'}</Button>
      </form>
      {hasPropertyLocation && !geoHook.location && (
        <button
          type="button"
          onClick={geoHook.requestLocation}
          disabled={geoHook.loading}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-mono font-medium text-gold border border-gold/30 hover:bg-gold/10 transition-all uppercase tracking-wider"
        >
          <MapPin className="w-3.5 h-3.5" />
          Try Your Location Instead
        </button>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Contractor Matching Section                                        */
/* ================================================================== */

function ContractorMatching({
  selectedRequest,
  onAssignContractor,
}: {
  selectedRequest: MaintenanceRequest | null;
  onAssignContractor: (id: string, name: string, phone: string) => void;
}) {
  const [contractors, setContractors] = useState<MatchedContractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const geoHook = useGeolocation();
  const lastFetchKey = useRef('');

  // Determine location source
  const propertyLocation = selectedRequest?.property
    ? {
        city: (selectedRequest.property as PropertyWithLocation).city || '',
        state: (selectedRequest.property as PropertyWithLocation).state || '',
        zip: (selectedRequest.property as PropertyWithLocation).zip || '',
      }
    : null;

  const hasPropertyLocation = propertyLocation && (propertyLocation.city || propertyLocation.zip);
  const activeLocation = hasPropertyLocation
    ? propertyLocation
    : geoHook.location
      ? { city: geoHook.location.city, state: geoHook.location.state, zip: geoHook.location.zip }
      : null;

  const locationLabel = hasPropertyLocation
    ? `${propertyLocation!.city}${propertyLocation!.state ? `, ${propertyLocation!.state}` : ''}`
    : geoHook.location
      ? `${geoHook.location.city}${geoHook.location.state ? `, ${geoHook.location.state}` : ''}`
      : null;

  const locationSource = hasPropertyLocation ? 'PROPERTY' : geoHook.location ? 'YOUR LOCATION' : null;

  // Fetch contractors when location + category are available
  useEffect(() => {
    if (!selectedRequest || !activeLocation) return;
    const category = selectedRequest.category || 'general';
    const fetchKey = `${category}-${activeLocation.city}-${activeLocation.state}-${activeLocation.zip}`;
    if (fetchKey === lastFetchKey.current) return;
    lastFetchKey.current = fetchKey;

    async function fetchContractors() {
      setLoading(true);
      setMatchError(null);
      try {
        const res = await fetch('/api/contractors/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: selectedRequest!.category || 'general',
            city: activeLocation!.city,
            state: activeLocation!.state,
            zip: activeLocation!.zip,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to match');
        setContractors(data.contractors || []);
      } catch (err) {
        setMatchError(err instanceof Error ? err.message : 'Failed to find contractors');
        setContractors([]);
      } finally {
        setLoading(false);
      }
    }

    fetchContractors();
  }, [selectedRequest, activeLocation]);

  // Reset when request changes
  useEffect(() => {
    lastFetchKey.current = '';
    setContractors([]);
    setMatchError(null);
  }, [selectedRequest?.id]);

  function handleAssign(contractor: MatchedContractor) {
    if (!selectedRequest) return;
    setAssigningId(contractor.id);
    onAssignContractor(
      selectedRequest.id,
      contractor.company_name || contractor.contact_name || 'Unknown',
      contractor.phone || ''
    );
    setTimeout(() => setAssigningId(null), 1000);
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="label text-[11px]">Contractor Matching</h3>
          <p className="text-xs text-muted font-body mt-0.5">
            Location-based matching by category, score, and ratings
          </p>
        </div>
        <div className="flex items-center gap-3">
          {locationSource && locationLabel && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green/20 bg-green/5">
              <span className="pulse-dot" />
              <span className="font-mono text-[10px] text-green uppercase tracking-wider">
                {locationSource}: {locationLabel}
              </span>
            </div>
          )}
          {!hasPropertyLocation && !geoHook.location && (
            <button
              onClick={geoHook.requestLocation}
              disabled={geoHook.loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-medium text-gold border border-gold/30 hover:bg-gold/10 transition-all uppercase tracking-wider text-[11px]"
            >
              <MapPin className="w-3.5 h-3.5" />
              {geoHook.loading ? 'Locating...' : 'Share Location'}
            </button>
          )}
        </div>
      </div>

      {/* Geolocation error */}
      {geoHook.error && !hasPropertyLocation && (
        <div className="mb-4 px-4 py-2.5 rounded-lg border border-red/20 bg-red/5">
          <p className="font-mono text-[11px] text-red">{geoHook.error}</p>
        </div>
      )}

      {/* No request selected */}
      {!selectedRequest && (
        <div className="rounded-lg p-8 text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <MapPin className="w-8 h-8 text-muted-deep mx-auto mb-3" />
          <p className="font-mono text-sm text-muted-deep">SELECT A MAINTENANCE REQUEST</p>
          <p className="font-mono text-[11px] text-muted-deep mt-1">
            to find contractors in the area
          </p>
        </div>
      )}

      {/* Loading */}
      {selectedRequest && loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg p-5 relative overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="space-y-3">
                <div className="h-4 w-32 rounded bg-border/30 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gold/5 to-transparent" />
                </div>
                <div className="h-3 w-20 rounded bg-border/30 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gold/5 to-transparent" />
                </div>
                <div className="h-3 w-full rounded bg-border/30 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gold/5 to-transparent" />
                </div>
                <div className="h-8 w-full rounded bg-border/30 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gold/5 to-transparent" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No location available */}
      {selectedRequest && !loading && !activeLocation && !geoHook.error && (
        <div className="rounded-lg p-8 text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <MapPin className="w-8 h-8 text-gold/40 mx-auto mb-3" />
          <p className="font-mono text-sm text-muted">LOCATION REQUIRED</p>
          <p className="font-mono text-[11px] text-muted-deep mt-1 mb-4">
            Share your location to find nearby contractors
          </p>
          <button
            onClick={geoHook.requestLocation}
            disabled={geoHook.loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-mono font-medium text-gold border border-gold/30 hover:bg-gold/10 transition-all uppercase tracking-wider"
          >
            <MapPin className="w-3.5 h-3.5" />
            {geoHook.loading ? 'Locating...' : 'Enable Location'}
          </button>
        </div>
      )}

      {/* Error */}
      {selectedRequest && !loading && matchError && (
        <div className="rounded-lg p-6 text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <p className="font-mono text-sm text-red">{matchError}</p>
        </div>
      )}

      {/* Empty results */}
      {selectedRequest && !loading && !matchError && activeLocation && contractors.length === 0 && (
        <AddContractorForm
          category={selectedRequest.category || 'general'}
          city={activeLocation.city}
          state={activeLocation.state}
          onAdded={(c) => setContractors((prev) => [...prev, c])}
          hasPropertyLocation={!!hasPropertyLocation}
          geoHook={geoHook}
          locationLabel={locationLabel}
        />
      )}

      {/* Contractor cards */}
      {selectedRequest && !loading && contractors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contractors.map((contractor) => {
            const score = contractor.composite_score || contractor.score_composite || 0;
            const rating = contractor.google_rating || 0;
            const isAssigning = assigningId === contractor.id;

            return (
              <div
                key={contractor.id}
                className="rounded-lg p-5 transition-all duration-300 hover:shadow-glow-sm"
                style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              >
                <div className="space-y-3">
                  {/* Name & trade */}
                  <div>
                    <p className="text-sm font-semibold text-white font-body">
                      {contractor.company_name || contractor.contact_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted font-mono mt-0.5">{contractor.trade || 'General'}</p>
                  </div>

                  {/* Score bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-muted-deep uppercase tracking-wider">Score</span>
                      <span className="font-mono text-[11px] text-gold font-medium">{(score * 10).toFixed(0)}/100</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border/30 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, score * 10)}%`,
                          background: score >= 7 ? '#c9a84c' : score >= 5 ? '#FFB800' : '#DC2626',
                        }}
                      />
                    </div>
                  </div>

                  {/* Rating */}
                  {rating > 0 && <StarRating rating={rating} />}

                  {/* Price & Location */}
                  <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                    {contractor.price_range_min != null && contractor.price_range_max != null ? (
                      <span>${contractor.price_range_min}–${contractor.price_range_max}</span>
                    ) : (
                      <span>—</span>
                    )}
                    {contractor.city && (
                      <span className="text-muted-deep">{contractor.city}{contractor.state ? `, ${contractor.state}` : ''}</span>
                    )}
                  </div>

                  {/* Assign button */}
                  <button
                    onClick={() => handleAssign(contractor)}
                    disabled={isAssigning}
                    className={cn(
                      'w-full py-2 rounded-lg text-[11px] font-mono font-medium uppercase tracking-wider transition-all',
                      isAssigning
                        ? 'bg-green/10 text-green border border-green/30'
                        : 'text-gold border border-gold/30 hover:bg-gold/10'
                    )}
                  >
                    {isAssigning ? 'Assigned' : 'Assign'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Loading Skeleton                                                   */
/* ================================================================== */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="card" height="88px" />
        ))}
      </div>
      {/* Toggle + board */}
      <Skeleton variant="text" width="200px" height="40px" />
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="min-w-[280px]">
            <Skeleton variant="card" height="400px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Preventive Maintenance Scheduler                                   */
/* ================================================================== */

const PREVENTIVE_ITEMS = [
  { id: 'hvac_filter', label: 'HVAC Filter Replacement', frequency: 90, icon: Wind, category: 'hvac' as Category },
  { id: 'hvac_service', label: 'HVAC Annual Service', frequency: 365, icon: Wind, category: 'hvac' as Category },
  { id: 'gutter_clean', label: 'Gutter Cleaning', frequency: 180, icon: Droplets, category: 'exterior' as Category },
  { id: 'smoke_detector', label: 'Smoke Detector Battery', frequency: 365, icon: Shield, category: 'safety' as Category },
  { id: 'water_heater', label: 'Water Heater Flush', frequency: 365, icon: Droplets, category: 'plumbing' as Category },
  { id: 'pest_inspect', label: 'Pest Inspection', frequency: 180, icon: Bug, category: 'pest_control' as Category },
  { id: 'roof_inspect', label: 'Roof Inspection', frequency: 365, icon: Hammer, category: 'exterior' as Category },
  { id: 'landscape', label: 'Landscaping Service', frequency: 30, icon: TreePine, category: 'landscaping' as Category },
  { id: 'fire_extinguisher', label: 'Fire Extinguisher Check', frequency: 365, icon: Shield, category: 'safety' as Category },
  { id: 'plumbing_inspect', label: 'Plumbing Inspection', frequency: 365, icon: Droplets, category: 'plumbing' as Category },
];

interface PreventiveRecord {
  property_id: string;
  item_id: string;
  last_completed: string | null;
}

function PreventiveScheduler({ properties }: { properties: Property[] }) {
  const [records, setRecords] = useState<PreventiveRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(properties[0]?.id || null);

  function getRecord(propertyId: string, itemId: string): PreventiveRecord | undefined {
    return records.find((r) => r.property_id === propertyId && r.item_id === itemId);
  }

  function getDaysUntilDue(lastCompleted: string | null, frequencyDays: number): number {
    if (!lastCompleted) return -1; // overdue (never done)
    const last = new Date(lastCompleted);
    const next = new Date(last.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
    return Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  function getStatusBadge(daysUntil: number) {
    if (daysUntil < 0) return { label: 'Overdue', className: 'bg-red/15 text-red' };
    if (daysUntil <= 14) return { label: `${daysUntil}d`, className: 'bg-orange-400/15 text-orange-400' };
    if (daysUntil <= 30) return { label: `${daysUntil}d`, className: 'bg-gold/15 text-gold' };
    return { label: `${daysUntil}d`, className: 'bg-green/15 text-green' };
  }

  function markComplete(propertyId: string, itemId: string) {
    const today = new Date().toISOString().split('T')[0];
    setRecords((prev) => {
      const existing = prev.findIndex(
        (r) => r.property_id === propertyId && r.item_id === itemId
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], last_completed: today };
        return updated;
      }
      return [...prev, { property_id: propertyId, item_id: itemId, last_completed: today }];
    });
  }

  const overdueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const prop of properties) {
      let count = 0;
      for (const item of PREVENTIVE_ITEMS) {
        const rec = getRecord(prop.id, item.id);
        const days = getDaysUntilDue(rec?.last_completed || null, item.frequency);
        if (days < 0) count++;
      }
      counts[prop.id] = count;
    }
    return counts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, records]);

  if (properties.length === 0) {
    return (
      <EmptyState
        icon={<Shield />}
        title="No properties to schedule"
        description="Add properties to set up preventive maintenance schedules."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-medium text-white font-body">Preventive Maintenance Schedule</h3>
          <p className="text-xs text-muted font-body mt-0.5">Track recurring maintenance to protect your investments</p>
        </div>
        <div className="text-xs text-muted font-body">
          {Object.values(overdueCounts).reduce((a, b) => a + b, 0)} items overdue
        </div>
      </div>

      {properties.map((prop) => (
        <div key={prop.id} className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <button
            onClick={() => setExpanded(expanded === prop.id ? null : prop.id)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted" />
              <span className="text-sm font-medium text-white font-body">{prop.address}</span>
              {overdueCounts[prop.id] > 0 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red/15 text-red">
                  {overdueCounts[prop.id]} overdue
                </span>
              )}
            </div>
            {expanded === prop.id ? (
              <ChevronUp className="h-4 w-4 text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted" />
            )}
          </button>

          {expanded === prop.id && (
            <div className="border-t border-border/30 divide-y divide-border/20">
              {PREVENTIVE_ITEMS.map((item) => {
                const rec = getRecord(prop.id, item.id);
                const daysUntil = getDaysUntilDue(rec?.last_completed || null, item.frequency);
                const status = getStatusBadge(daysUntil);
                const Icon = item.icon as React.ComponentType<{ className?: string; strokeWidth?: number }>;

                return (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted" />
                      <div>
                        <p className="text-sm text-white font-body">{item.label}</p>
                        <p className="text-[10px] text-muted font-body">
                          Every {item.frequency < 365 ? `${item.frequency} days` : 'year'}
                          {rec?.last_completed && (
                            <> · Last: {format(new Date(rec.last_completed), 'MMM d, yyyy')}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', status.className)}>
                        {status.label}
                      </span>
                      <button
                        onClick={() => markComplete(prop.id, item.id)}
                        className="text-xs text-gold hover:text-gold-light transition-colors font-body"
                      >
                        Mark Done
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function MaintenancePage() {
  const supabase = createClient();

  /* ---- State ---- */
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list' | 'preventive'>('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  /* ---- Fetch data ---- */
  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [reqRes, propRes, tenRes] = await Promise.all([
        supabase
          .from('maintenance_requests')
          .select('*, property:properties(id, address, name, city, state, zip), tenant:tenants(id, first_name, last_name, email, phone, unit)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('properties')
          .select('id, address, name')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
        supabase
          .from('tenants')
          .select('id, first_name, last_name, email, phone, unit, property_id')
          .eq('user_id', user.id),
      ]);

      if (reqRes.data) setRequests(reqRes.data as MaintenanceRequest[]);
      if (propRes.data) setProperties(propRes.data as Property[]);
      if (tenRes.data) setTenants(tenRes.data as Tenant[]);
    } catch (err) {
      console.error('Failed to fetch maintenance data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- Grouped requests for kanban ---- */
  const grouped = useMemo(() => {
    const map: Record<MaintenanceStatus, MaintenanceRequest[]> = {
      open: [],
      assigned: [],
      in_progress: [],
      completed: [],
    };
    requests.forEach((r) => {
      if (map[r.status]) {
        map[r.status].push(r);
      }
    });
    return map;
  }, [requests]);

  /* ---- Sorted requests for list view ---- */
  const sortedRequests = useMemo(() => {
    const sorted = [...requests];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'property':
          cmp = (a.property?.address || '').localeCompare(b.property?.address || '');
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'priority': {
          const order: Record<Priority, number> = { emergency: 0, high: 1, normal: 2, low: 3 };
          cmp = order[a.priority] - order[b.priority];
          break;
        }
        case 'status': {
          const order: Record<MaintenanceStatus, number> = { open: 0, assigned: 1, in_progress: 2, completed: 3 };
          cmp = order[a.status] - order[b.status];
          break;
        }
        case 'tenant': {
          const aName = a.tenant ? `${a.tenant.first_name} ${a.tenant.last_name}` : '';
          const bName = b.tenant ? `${b.tenant.first_name} ${b.tenant.last_name}` : '';
          cmp = aName.localeCompare(bName);
          break;
        }
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
        case 'days_open':
          cmp = daysOpen(a.created_at) - daysOpen(b.created_at);
          break;
        case 'estimated_cost':
          cmp = (a.estimated_cost || 0) - (b.estimated_cost || 0);
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [requests, sortField, sortDir]);

  /* ---- Stats ---- */
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = requests.filter((r) => {
      const d = new Date(r.completed_at || r.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const completedThisMonth = thisMonth.filter((r) => r.status === 'completed').length;
    const totalSpend = thisMonth.reduce((sum, r) => sum + (r.actual_cost || r.estimated_cost || 0), 0);

    return {
      open: grouped.open.length,
      inProgress: grouped.in_progress.length + grouped.assigned.length,
      completedThisMonth,
      totalSpend,
    };
  }, [requests, grouped]);

  /* ---- Drag and Drop handler ---- */
  async function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId as MaintenanceStatus;
    const requestId = draggableId;

    // Optimistic update
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        const updates: Partial<MaintenanceRequest> = { status: newStatus };
        if (newStatus === 'assigned' && !r.assigned_at) {
          updates.assigned_at = new Date().toISOString();
        }
        if (newStatus === 'in_progress' && !r.started_at) {
          updates.started_at = new Date().toISOString();
        }
        if (newStatus === 'completed' && !r.completed_at) {
          updates.completed_at = new Date().toISOString();
        }
        return { ...r, ...updates };
      }),
    );

    // Persist
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'assigned') updateData.assigned_at = new Date().toISOString();
    if (newStatus === 'in_progress') updateData.started_at = new Date().toISOString();
    if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('maintenance_requests')
      .update(updateData)
      .eq('id', requestId);

    if (error) {
      console.error('Failed to update status:', error);
      fetchData(); // revert
    }
  }

  /* ---- Mark complete ---- */
  async function handleMarkComplete(id: string) {
    const now = new Date().toISOString();

    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'completed' as MaintenanceStatus, completed_at: now } : r,
      ),
    );
    setSelectedRequest(null);

    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: 'completed', completed_at: now })
      .eq('id', id);

    if (error) {
      console.error('Failed to mark complete:', error);
      fetchData();
    }
  }

  /* ---- Update notes ---- */
  async function handleUpdateNotes(id: string, notes: string) {
    await supabase
      .from('maintenance_requests')
      .update({ completion_notes: notes })
      .eq('id', id);
  }

  /* ---- Update status ---- */
  async function handleUpdateStatus(id: string, status: MaintenanceStatus) {
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { status };
    if (status === 'assigned') updateData.assigned_at = now;
    if (status === 'in_progress') updateData.started_at = now;
    if (status === 'completed') updateData.completed_at = now;

    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, ...updateData } as MaintenanceRequest : r,
      ),
    );

    // Update selected request in panel
    setSelectedRequest((prev) =>
      prev && prev.id === id ? { ...prev, ...updateData } as MaintenanceRequest : prev,
    );

    const { error } = await supabase
      .from('maintenance_requests')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Failed to update status:', error);
      fetchData();
    }
  }

  /* ---- Assign contractor ---- */
  async function handleAssignContractor(id: string, name: string, phone: string) {
    const now = new Date().toISOString();

    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, contractor_name: name, contractor_phone: phone, status: r.status === 'open' ? 'assigned' : r.status, assigned_at: r.assigned_at || now } as MaintenanceRequest
          : r,
      ),
    );

    setSelectedRequest((prev) =>
      prev && prev.id === id
        ? { ...prev, contractor_name: name, contractor_phone: phone, status: prev.status === 'open' ? 'assigned' : prev.status, assigned_at: prev.assigned_at || now } as MaintenanceRequest
        : prev,
    );

    const updateData: Record<string, unknown> = { contractor_name: name, contractor_phone: phone };
    // Auto-advance to assigned if currently open
    const req = requests.find((r) => r.id === id);
    if (req && req.status === 'open') {
      updateData.status = 'assigned';
      updateData.assigned_at = now;
    }

    const { error } = await supabase
      .from('maintenance_requests')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Failed to assign contractor:', error);
      fetchData();
    }
  }

  /* ---- Add cost ---- */
  async function handleAddCost(id: string, cost: number) {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, actual_cost: cost } : r,
      ),
    );

    setSelectedRequest((prev) =>
      prev && prev.id === id ? { ...prev, actual_cost: cost } : prev,
    );

    const { error } = await supabase
      .from('maintenance_requests')
      .update({ actual_cost: cost })
      .eq('id', id);

    if (error) {
      console.error('Failed to add cost:', error);
      fetchData();
    }
  }

  /* ---- Submit new request ---- */
  async function handleSubmitRequest(data: {
    property_id: string;
    tenant_id: string | null;
    title: string;
    description: string;
    category: Category;
    priority: Priority;
    estimated_cost: number | null;
    photos: File[];
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upload photos if any
    const photoUrls: string[] = [];
    for (const file of data.photos) {
      const ext = file.name.split('.').pop();
      const path = `maintenance/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('maintenance-photos')
        .upload(path, file);

      if (uploadData && !uploadError) {
        const { data: urlData } = supabase.storage
          .from('maintenance-photos')
          .getPublicUrl(path);
        if (urlData?.publicUrl) {
          photoUrls.push(urlData.publicUrl);
        }
      }
    }

    const { error } = await supabase.from('maintenance_requests').insert({
      user_id: user.id,
      property_id: data.property_id,
      tenant_id: data.tenant_id,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: 'open',
      estimated_cost: data.estimated_cost,
      photos: photoUrls,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to create request:', error);
    } else {
      fetchData();
    }
  }

  /* ---- Sort handler ---- */
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  /* ---- Card click ---- */
  function handleCardClick(req: MaintenanceRequest) {
    setSelectedRequest(req);
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Maintenance</h1>
            <p className="text-sm text-muted font-body mt-1">Manage repairs and maintenance requests</p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  Page Header                                                  */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Maintenance</h1>
          <p className="text-sm text-muted font-body mt-1">Manage repairs and maintenance requests</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
        >
          New Request
        </Button>
      </div>

      {/* ============================================================ */}
      {/*  Stats Row                                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ClipboardList}
          label="Open Requests"
          value={stats.open}
          iconBg="bg-gold/10 text-gold"
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={stats.inProgress}
          iconBg="bg-orange-400/10 text-orange-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed This Month"
          value={stats.completedThisMonth}
          iconBg="bg-green/10 text-green"
        />
        <StatCard
          icon={DollarSign}
          label="Total Spend This Month"
          value={`$${stats.totalSpend.toLocaleString()}`}
          iconBg="bg-blue-400/10 text-blue-400"
        />
      </div>

      {/* ============================================================ */}
      {/*  View Toggle                                                  */}
      {/* ============================================================ */}
      <div className="flex items-center gap-1 bg-deep border border-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setView('kanban')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-body font-medium transition-all duration-200',
            view === 'kanban'
              ? 'bg-gold/15 text-gold'
              : 'text-muted hover:text-white',
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Kanban
        </button>
        <button
          onClick={() => setView('list')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-body font-medium transition-all duration-200',
            view === 'list'
              ? 'bg-gold/15 text-gold'
              : 'text-muted hover:text-white',
          )}
        >
          <List className="w-4 h-4" />
          List
        </button>
        <button
          onClick={() => setView('preventive')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-body font-medium transition-all duration-200',
            view === 'preventive'
              ? 'bg-gold/15 text-gold'
              : 'text-muted hover:text-white',
          )}
        >
          <Shield className="w-4 h-4" />
          Preventive
        </button>
      </div>

      {/* ============================================================ */}
      {/*  Preventive Maintenance Scheduler                              */}
      {/* ============================================================ */}
      {view === 'preventive' && (
        <PreventiveScheduler properties={properties} />
      )}

      {/* ============================================================ */}
      {/*  Content                                                      */}
      {/* ============================================================ */}
      {view !== 'preventive' && (
        requests.length === 0 ? (
          <EmptyState
            icon={<Wrench />}
            title="No maintenance requests yet"
            description="Create your first maintenance request to start tracking repairs and upkeep across your properties."
            action={{
              label: 'New Request',
              onClick: () => setModalOpen(true),
              icon: <Plus />,
            }}
          />
        ) : view === 'kanban' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {STATUS_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  requests={grouped[col.id]}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
          </DragDropContext>
        ) : (
          <ListView
            requests={sortedRequests}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={handleCardClick}
          />
        )
      )}

      {/* ============================================================ */}
      {/*  Contractor Auto-Matching                                     */}
      {/* ============================================================ */}
      <ContractorMatching
        selectedRequest={selectedRequest}
        onAssignContractor={handleAssignContractor}
      />

      {/* ============================================================ */}
      {/*  New Request Modal                                            */}
      {/* ============================================================ */}
      <NewRequestModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        properties={properties}
        tenants={tenants}
        onSubmit={handleSubmitRequest}
      />

      {/* ============================================================ */}
      {/*  Detail Side Panel                                            */}
      {/* ============================================================ */}
      <AnimatePresence>
        {selectedRequest && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="fixed inset-0 bg-black/40 z-30"
            />
            <DetailPanel
              key={selectedRequest.id}
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onMarkComplete={handleMarkComplete}
              onUpdateNotes={handleUpdateNotes}
              onUpdateStatus={handleUpdateStatus}
              onAssignContractor={handleAssignContractor}
              onAddCost={handleAddCost}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
