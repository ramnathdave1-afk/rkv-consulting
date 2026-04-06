'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import {
  MapPin,
  Camera,
  Phone,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Play,
  Package,
  Clock,
  Wrench,
  AlertTriangle,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

/* ─── Types ─── */

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

/* ─── Constants ─── */

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  emergency: { color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', label: 'EMERGENCY' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30', label: 'HIGH' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', label: 'MEDIUM' },
  low: { color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30', label: 'LOW' },
};

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'parts_needed', label: 'Parts Needed' },
];

/* ─── Component ─── */

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

  /* ─── Fetch ─── */

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
    } catch (err) {
      toast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  }, [selectedVendor, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Actions ─── */

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
          : 'Marked complete'
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
      { enableHighAccuracy: true, timeout: 10000 }
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

    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  /* ─── Filtered list ─── */

  const filtered = activeTab === 'all'
    ? workOrders
    : workOrders.filter((wo) => wo.status === activeTab);

  /* ─── Loading state ─── */

  if (loading) {
    return (
      <div className="min-h-screen p-4 space-y-4">
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
    <div className="min-h-screen p-4 pb-24 space-y-5">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Wrench size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-text-primary">Field Ops</h1>
            <p className="text-sm text-text-secondary">Mobile technician dashboard</p>
          </div>
        </div>
      </motion.div>

      {/* ─── Vendor Selector (Admin View) ─── */}
      <div className="glass-card p-3 rounded-xl">
        <label className="text-xs font-medium text-text-muted mb-1 block">Technician / Vendor</label>
        <select
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
          className="w-full h-12 rounded-lg bg-bg-primary border border-border px-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none"
        >
          <option value="">All Vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}{v.company ? ` — ${v.company}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ─── KPI Cards ─── */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <KPICard icon={<Clock size={18} />} label="Assigned" value={kpis.assigned} color="text-yellow-400" />
        <KPICard icon={<Play size={18} />} label="In Progress" value={kpis.in_progress} color="text-blue-400" />
        <KPICard icon={<CheckCircle2 size={18} />} label="Done Today" value={kpis.completed_today} color="text-emerald-400" />
      </motion.div>

      {/* ─── Status Tabs ─── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-shrink-0 h-10 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.value
                ? 'bg-accent text-bg-primary'
                : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Work Order Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-8 text-center col-span-full"
            >
              <Wrench size={40} className="mx-auto text-text-muted mb-3" />
              <h3 className="text-base font-semibold text-text-primary mb-1">No work orders</h3>
              <p className="text-sm text-text-secondary">
                No work orders match the current filter.
              </p>
            </motion.div>
          ) : (
            filtered.map((wo, i) => (
              <motion.div
                key={wo.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
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

/* ─── KPI Card ─── */

function KPICard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4 text-center">
      <div className={`mx-auto mb-1 ${color}`}>{icon}</div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}

/* ─── Work Order Card ─── */

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
  const p = priorityConfig[wo.priority] || priorityConfig.low;
  const photos = wo.photos || [];

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Card Header */}
      <div className="p-5 space-y-3">
        {/* Priority + Status Row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide border ${p.bg} ${p.color}`}
          >
            <AlertTriangle size={14} className="mr-1.5" />
            {p.label}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-bg-elevated text-text-secondary capitalize">
            {wo.status.replace('_', ' ')}
          </span>
        </div>

        {/* Title + Category */}
        <div>
          <h3 className="text-base font-semibold text-text-primary leading-tight">{wo.title}</h3>
          <p className="text-sm text-text-muted capitalize mt-0.5">{wo.category?.replace('_', ' ')}</p>
        </div>

        {/* Property + Unit */}
        {wo.properties && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={16} className="text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-text-primary font-medium">
                {wo.properties.name}
                {wo.units ? ` — Unit ${wo.units.unit_number}` : ''}
              </p>
              {wo.properties.address && (
                <p className="text-text-muted text-xs">{wo.properties.address}</p>
              )}
            </div>
          </div>
        )}

        {/* Tenant */}
        {wo.tenants && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-text-secondary">
              {wo.tenants.first_name} {wo.tenants.last_name}
            </span>
            {wo.tenants.phone && (
              <a
                href={`tel:${wo.tenants.phone}`}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-accent/10 text-accent text-sm font-medium active:scale-95 transition-transform"
              >
                <Phone size={16} />
                Call
              </a>
            )}
          </div>
        )}

        {/* Description (truncated / expandable) */}
        {wo.description && (
          <div>
            <p
              className={`text-sm text-text-secondary leading-relaxed ${
                !expanded ? 'line-clamp-2' : ''
              }`}
            >
              {wo.description}
            </p>
            {wo.description.length > 100 && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1 text-xs text-accent mt-1 active:opacity-70"
              >
                {expanded ? (
                  <>
                    Show less <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    Read more <ChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Check-in Badge */}
        {checkinTime && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Checked in at {checkinTime}</span>
          </div>
        )}

        {/* Photo Thumbnails */}
        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((url, idx) => (
              <div
                key={idx}
                className="w-16 h-16 rounded-lg bg-bg-elevated border border-border flex items-center justify-center shrink-0 overflow-hidden"
              >
                <ImageIcon size={20} className="text-text-muted" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-5 pb-5 space-y-2">
        {/* GPS Check-in + Photo buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            fullWidth
            icon={<MapPin size={18} />}
            onClick={onCheckin}
            loading={updating && !checkinTime}
            disabled={!!checkinTime}
            className="h-12 text-base"
          >
            {checkinTime ? 'Checked In' : 'GPS Check-In'}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            icon={<Camera size={18} />}
            onClick={onPhotoUpload}
            loading={photoUploading}
            className="h-12 shrink-0 px-4"
          />
        </div>

        {/* Status Action Buttons */}
        <div className="flex gap-2">
          {wo.status === 'assigned' && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<Play size={18} />}
              onClick={() => onUpdateStatus('in_progress')}
              loading={updating}
              className="h-12 text-base"
            >
              Accept
            </Button>
          )}
          {(wo.status === 'assigned' || wo.status === 'in_progress') && (
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              icon={<Package size={18} />}
              onClick={() => onUpdateStatus('parts_needed')}
              loading={updating}
              className="h-12 text-base"
            >
              Request Parts
            </Button>
          )}
          {(wo.status === 'in_progress' || wo.status === 'parts_needed') && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<CheckCircle2 size={18} />}
              onClick={() => onUpdateStatus('completed')}
              loading={updating}
              className="h-12 text-base"
            >
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
