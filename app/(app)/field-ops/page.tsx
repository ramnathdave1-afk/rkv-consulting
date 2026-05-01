'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Input';
import {
  MapPin,
  Camera,
  Phone,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Play,
  Package,
  Wrench,
  Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  photos: string[] | null;
  scheduled_date: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  properties: { id: string; name: string; address: string | null } | null;
  units: { id: string; unit_number: string } | null;
  tenants: { id: string; first_name: string; last_name: string; phone: string | null; email: string | null } | null;
  vendors: { id: string; name: string; company: string | null; phone: string | null } | null;
}

interface Vendor {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
}

interface KPIs {
  assigned: number;
  in_progress: number;
  completed_today: number;
}

const PRIORITY_PILL: Record<string, { label: string; cls: string }> = {
  emergency: { label: 'Emergency', cls: 'bg-red-50 text-red-700 border border-red-200 animate-pulse' },
  high: { label: 'High', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  medium: { label: 'Standard', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-500 border border-slate-200' },
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  open: 'bg-red-50 text-red-700 border border-red-200',
  pending: 'bg-red-50 text-red-700 border border-red-200',
  assigned: 'bg-amber-50 text-amber-700 border border-amber-200',
  scheduled: 'bg-amber-50 text-amber-700 border border-amber-200',
  in_progress: 'bg-sky-50 text-sky-700 border border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-700 border border-slate-200',
  parts_needed: 'bg-violet-50 text-violet-700 border border-violet-200',
};

function StatusBadgeOps({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASS[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize whitespace-nowrap ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'parts_needed', label: 'Parts Needed' },
];

export default function FieldOpsPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [kpis, setKpis] = useState<KPIs>({ assigned: 0, in_progress: 0, completed_today: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checkinMap, setCheckinMap] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedVendor) params.set('vendor_id', selectedVendor);
      if (activeTab !== 'all') params.set('status', activeTab);

      const res = await fetch(`/api/field-ops?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setWorkOrders(json.work_orders || []);
      setVendors(json.vendors || []);
      setKpis(json.kpis || { assigned: 0, in_progress: 0, completed_today: 0 });
    } catch {
      toast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  }, [selectedVendor, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function updateStatus(woId: string, newStatus: string) {
    setUpdatingId(woId);
    try {
      const res = await fetch(`/api/field-ops/${woId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success(
        newStatus === 'in_progress'
          ? 'Work order accepted'
          : newStatus === 'parts_needed'
          ? 'Parts requested'
          : 'Marked complete',
      );
      await fetchData();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCheckin(woId: string) {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setUpdatingId(woId);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(`/api/field-ops/${woId}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          if (!res.ok) throw new Error('Check-in failed');
          const json = await res.json();
          const time = new Date(json.checkin_time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          setCheckinMap((prev) => ({ ...prev, [woId]: time }));
          toast.success(`Checked in at ${time}`);
        } catch {
          toast.error('Check-in failed');
        } finally {
          setUpdatingId(null);
        }
      },
      () => {
        toast.error('Location access denied');
        setUpdatingId(null);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function triggerPhotoUpload(woId: string) {
    setPhotoTargetId(woId);
    fileInputRef.current?.click();
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !photoTargetId) return;

    setPhotoUploading(photoTargetId);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch(`/api/field-ops/${photoTargetId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64, filename: file.name }),
        });
        if (!res.ok) throw new Error('Upload failed');
        toast.success('Photo uploaded');
        await fetchData();
        setPhotoUploading(null);
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
        setPhotoUploading(null);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Photo upload failed');
      setPhotoUploading(null);
    }

    e.target.value = '';
  }

  const filtered = activeTab === 'all'
    ? workOrders
    : workOrders.filter((wo) => wo.status === activeTab);

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24 space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617]">Field Ops</h1>
          <p className="text-sm text-slate-500 mt-1">
            {kpis.assigned} assigned · {kpis.in_progress} in progress · {kpis.completed_today} completed today
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="w-full md:w-72">
          <SelectField
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            options={[
              { value: '', label: 'All Technicians / Vendors' },
              ...vendors.map((v) => ({ value: v.id, label: v.company ? `${v.name} — ${v.company}` : v.name })),
            ]}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-shrink-0 h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visit cards / activity log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-200 p-8 text-center col-span-full"
            >
              <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-[#020617] mb-1">No work orders</h3>
              <p className="text-sm text-slate-500">
                No work orders match the current filter.
              </p>
            </motion.div>
          ) : (
            filtered.map((wo, i) => (
              <motion.div
                key={wo.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <WorkOrderCard
                  wo={wo}
                  expanded={expandedId === wo.id}
                  onToggleExpand={() => setExpandedId(expandedId === wo.id ? null : wo.id)}
                  onUpdateStatus={(status) => updateStatus(wo.id, status)}
                  onCheckin={() => handleCheckin(wo.id)}
                  onPhotoUpload={() => triggerPhotoUpload(wo.id)}
                  checkinTime={checkinMap[wo.id] || null}
                  updating={updatingId === wo.id}
                  photoUploading={photoUploading === wo.id}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function WorkOrderCard({
  wo,
  expanded,
  onToggleExpand,
  onUpdateStatus,
  onCheckin,
  onPhotoUpload,
  checkinTime,
  updating,
  photoUploading,
}: {
  wo: WorkOrder;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdateStatus: (status: string) => void;
  onCheckin: () => void;
  onPhotoUpload: () => void;
  checkinTime: string | null;
  updating: boolean;
  photoUploading: boolean;
}) {
  const p = PRIORITY_PILL[wo.priority] || PRIORITY_PILL.medium;
  const photos = wo.photos || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 space-y-3">
        {/* Priority + Status */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide ${p.cls}`}>
            {p.label}
          </span>
          <StatusBadgeOps status={wo.status} />
        </div>

        <div>
          <h3 className="text-base font-semibold text-[#020617] leading-tight">{wo.title}</h3>
          <p className="text-sm text-slate-500 capitalize mt-0.5">{wo.category?.replace(/_/g, ' ')}</p>
        </div>

        {wo.properties && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[#020617] font-medium">
                {wo.properties.name}
                {wo.units ? ` — Unit ${wo.units.unit_number}` : ''}
              </p>
              {wo.properties.address && (
                <p className="text-slate-500 text-xs">{wo.properties.address}</p>
              )}
            </div>
          </div>
        )}

        {wo.tenants && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-600">
              {wo.tenants.first_name} {wo.tenants.last_name}
            </span>
            {wo.tenants.phone && (
              <a
                href={`tel:${wo.tenants.phone}`}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                <Phone size={14} />
                Call
              </a>
            )}
          </div>
        )}

        {wo.description && (
          <div>
            <p className={`text-sm text-slate-600 leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
              {wo.description}
            </p>
            {wo.description.length > 100 && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#020617] mt-1"
              >
                {expanded ? (
                  <>Show less <ChevronUp size={14} /></>
                ) : (
                  <>Read more <ChevronDown size={14} /></>
                )}
              </button>
            )}
          </div>
        )}

        {/* Activity log: check-in */}
        {checkinTime && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Checked in at {checkinTime}</span>
          </div>
        )}

        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0"
              >
                <ImageIcon size={20} className="text-slate-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            fullWidth
            icon={<MapPin size={16} />}
            onClick={onCheckin}
            loading={updating && !checkinTime}
            disabled={!!checkinTime}
          >
            {checkinTime ? 'Checked In' : 'GPS Check-In'}
          </Button>
          <Button
            variant="ghost"
            size="md"
            icon={<Camera size={16} />}
            onClick={onPhotoUpload}
            loading={photoUploading}
            className="shrink-0 px-3"
          />
        </div>

        <div className="flex gap-2">
          {wo.status === 'assigned' && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              icon={<Play size={16} />}
              onClick={() => onUpdateStatus('in_progress')}
              loading={updating}
            >
              Accept
            </Button>
          )}
          {(wo.status === 'assigned' || wo.status === 'in_progress') && (
            <Button
              variant="ghost"
              size="md"
              fullWidth
              icon={<Package size={16} />}
              onClick={() => onUpdateStatus('parts_needed')}
              loading={updating}
            >
              Request Parts
            </Button>
          )}
          {(wo.status === 'in_progress' || wo.status === 'parts_needed') && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              icon={<CheckCircle2 size={16} />}
              onClick={() => onUpdateStatus('completed')}
              loading={updating}
            >
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
