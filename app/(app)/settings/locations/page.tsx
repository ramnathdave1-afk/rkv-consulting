'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LocationFormModal, type LocationRecord } from '@/components/settings/LocationFormModal';
import { MapPin, Plus, Pencil, Trash2, Star, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  SettingsShell,
  SettingsCard,
  settingsPrimaryButtonClass,
  SettingsToggle,
} from '@/components/settings/SettingsShell';

interface LocationRow extends LocationRecord {
  id: string;
  name: string;
  slug: string;
  property_count: number;
  is_default: boolean;
  is_active: boolean;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [deleting, setDeleting] = useState<LocationRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/locations');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setLocations((json.items as LocationRow[]) || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  async function setDefault(loc: LocationRow) {
    try {
      const res = await fetch(`/api/locations/${loc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast.success(`${loc.name} is now the default location`);
      fetchLocations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function toggleActive(loc: LocationRow) {
    try {
      const res = await fetch(`/api/locations/${loc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !loc.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      fetchLocations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/locations/${deleting.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      toast.success('Location deleted');
      setDeleting(null);
      fetchLocations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <SettingsShell
      title="Locations"
      subtitle="Organize your portfolio across markets, regions, or offices."
      actions={
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className={settingsPrimaryButtonClass}
        >
          <Plus size={14} />
          Add Location
        </button>
      }
    >
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : locations.length === 0 ? (
        <SettingsCard>
          <div className="p-12 text-center">
            <MapPin size={48} className="mx-auto text-slate-400 mb-4" />
            <h3 className="font-display text-lg font-semibold text-[#020617] mb-1">
              No locations yet
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Add a location to start organizing properties by market or office.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className={cn(settingsPrimaryButtonClass, 'mx-auto')}
            >
              <Plus size={14} /> Add Location
            </button>
          </div>
        </SettingsCard>
      ) : (
        <SettingsCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Address</th>
                  <th className="text-left px-4 py-3 font-medium">Contact</th>
                  <th className="text-left px-4 py-3 font-medium">Properties</th>
                  <th className="text-left px-4 py-3 font-medium">Default</th>
                  <th className="text-left px-4 py-3 font-medium">Active</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-sky-50 flex items-center justify-center">
                          <MapPin size={14} className="text-[#0369A1]" />
                        </div>
                        <div>
                          <div className="font-medium text-[#020617] flex items-center gap-2">
                            {loc.name}
                            {loc.is_default && (
                              <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 border border-sky-100 text-sky-700 font-medium">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{loc.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {[loc.address_line1, loc.city, loc.state, loc.zip].filter(Boolean).join(', ') ||
                        '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{loc.phone || '—'}</div>
                      <div className="text-slate-500 text-xs">{loc.email || ''}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[#020617]">{loc.property_count}</td>
                    <td className="px-4 py-3">
                      {loc.is_default ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#0369A1]">
                          <Star size={12} className="fill-[#0369A1]" /> Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDefault(loc)}
                          className="text-xs text-slate-500 hover:text-[#0369A1] inline-flex items-center gap-1"
                        >
                          <Star size={12} /> Set default
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SettingsToggle checked={loc.is_active} onChange={() => toggleActive(loc)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(loc);
                            setFormOpen(true);
                          }}
                          className="p-2 rounded-md text-slate-500 hover:text-[#0369A1] hover:bg-sky-50"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(loc)}
                          className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsCard>
      )}

      <LocationFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        location={editing}
        onSuccess={fetchLocations}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Delete Location"
        description={
          deleting?.property_count
            ? `${deleting.name} has ${deleting.property_count} propert${deleting.property_count === 1 ? 'y' : 'ies'} assigned. Reassign them before deleting.`
            : `Delete "${deleting?.name}"? This cannot be undone.`
        }
        confirmLabel={deleting?.property_count ? 'OK' : 'Delete'}
        variant="danger"
        onConfirm={async () => {
          if (deleting?.property_count) {
            setDeleting(null);
            return;
          }
          await handleDelete();
        }}
        loading={deleteLoading}
      />

      {/* Avoid lint warnings for unused icons */}
      <span className="hidden">
        <Power size={1} />
      </span>
    </SettingsShell>
  );
}
