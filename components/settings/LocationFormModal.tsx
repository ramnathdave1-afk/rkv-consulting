'use client';

import React, { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export interface LocationRecord {
  id?: string;
  name?: string;
  slug?: string;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  manager_user_id?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  location?: LocationRecord | null;
  onSuccess: () => void;
}

const empty: LocationRecord = {
  name: '',
  slug: '',
  address_line1: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  email: '',
  is_default: false,
  is_active: true,
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function LocationFormModal({ open, onOpenChange, location, onSuccess }: Props) {
  const isEdit = !!location?.id;
  const [form, setForm] = useState<LocationRecord>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (location) {
      setForm({ ...empty, ...location });
      setSlugTouched(true);
    } else {
      setForm(empty);
      setSlugTouched(false);
    }
  }, [location, open]);

  function set<K extends keyof LocationRecord>(key: K, value: LocationRecord[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && !slugTouched) {
        next.slug = slugify(String(value || ''));
      }
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/locations/${location!.id}` : '/api/locations';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          slug: form.slug || slugify(form.name || ''),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      toast.success(isEdit ? 'Location updated' : 'Location created');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="lg">
        <ModalHeader
          title={isEdit ? 'Edit Location' : 'Add Location'}
          description={isEdit ? 'Update this location’s details.' : 'Add a new market or office location.'}
        />
        <form onSubmit={submit}>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Name"
                placeholder="Phoenix"
                value={form.name || ''}
                onChange={(e) => set('name', e.target.value)}
              />
              <Input
                label="Slug"
                placeholder="phoenix"
                value={form.slug || ''}
                onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }}
              />
            </div>

            <Input
              label="Address"
              placeholder="123 Main St"
              value={form.address_line1 || ''}
              onChange={(e) => set('address_line1', e.target.value)}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Input label="City" value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
              <Input label="State" placeholder="AZ" value={form.state || ''} onChange={(e) => set('state', e.target.value)} />
              <Input label="ZIP" value={form.zip || ''} onChange={(e) => set('zip', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone" placeholder="(602) 555-1212" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
              <Input label="Email" type="email" placeholder="phoenix@example.com" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
            </div>

            <Input
              label="Manager (user id)"
              placeholder="optional"
              value={form.manager_user_id || ''}
              onChange={(e) => set('manager_user_id', e.target.value)}
            />

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={!!form.is_default}
                  onChange={(e) => set('is_default', e.target.checked)}
                />
                Default location
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.is_active !== false}
                  onChange={(e) => set('is_active', e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting}>{isEdit ? 'Save Changes' : 'Add Location'}</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
