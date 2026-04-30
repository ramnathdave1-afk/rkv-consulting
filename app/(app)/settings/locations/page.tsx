'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LocationFormModal, type LocationRecord } from '@/components/settings/LocationFormModal';
import { MapPin, Plus, Pencil, Trash2, Star, Power } from 'lucide-react';
import toast from 'react-hot-toast';

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

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

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

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Locations</h1>
          <p className="text-sm text-text-secondary">Organize your portfolio across markets, regions, or offices.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => { setEditing(null); setFormOpen(true); }}>
          Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <MapPin size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No locations yet</h3>
          <p className="text-sm text-text-secondary mb-4">Add a location to start organizing properties by market or office.</p>
          <Button icon={<Plus size={16} />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            Add Location
          </Button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-tertiary">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Address</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Properties</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-b border-border last:border-0 hover:bg-white/[0.02]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <MapPin size={14} className="text-accent" />
                      </div>
                      <div>
                        <div className="font-medium text-text-primary flex items-center gap-2">
                          {loc.name}
                          {loc.is_default && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted">{loc.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-text-secondary">
                    {[loc.address_line1, loc.city, loc.state, loc.zip].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="p-3 text-text-secondary">
                    <div>{loc.phone || '—'}</div>
                    <div className="text-text-muted text-xs">{loc.email || ''}</div>
                  </td>
                  <td className="p-3 text-text-secondary">{loc.property_count}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleActive(loc)}
                      className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${loc.is_active ? 'bg-green-500/10 text-green-400' : 'bg-white/[0.04] text-text-muted'}`}
                      title="Toggle active"
                    >
                      <Power size={11} /> {loc.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {!loc.is_default && (
                        <button
                          onClick={() => setDefault(loc)}
                          className="p-1.5 rounded-md text-text-tertiary hover:text-accent hover:bg-accent/10"
                          title="Set as default"
                        >
                          <Star size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditing(loc); setFormOpen(true); }}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-accent hover:bg-accent/10"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleting(loc)}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-red-400 hover:bg-red-500/10"
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
      )}

      <LocationFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        location={editing}
        onSuccess={fetchLocations}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o) setDeleting(null); }}
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
    </div>
  );
}
