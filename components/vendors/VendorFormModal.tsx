'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Vendor } from '@/lib/types';

const SPECIALTY_OPTIONS = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'pest',
  'structural',
  'cosmetic',
  'safety',
  'general',
  'turnover',
] as const;

interface VendorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
  onSuccess: () => void;
}

interface FormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  specialty: string[];
  hourly_rate: string;
  is_preferred: boolean;
  notes: string;
}

const emptyForm: FormState = {
  name: '',
  company: '',
  email: '',
  phone: '',
  specialty: [],
  hourly_rate: '',
  is_preferred: false,
  notes: '',
};

export default function VendorFormModal({ open, onOpenChange, vendor, onSuccess }: VendorFormModalProps) {
  const isEdit = !!vendor;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name || '',
        company: vendor.company || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        specialty: vendor.specialty || [],
        hourly_rate: vendor.hourly_rate != null ? String(vendor.hourly_rate) : '',
        is_preferred: vendor.is_preferred || false,
        notes: vendor.notes || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [vendor, open]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSpecialty(s: string) {
    setForm((prev) => ({
      ...prev,
      specialty: prev.specialty.includes(s)
        ? prev.specialty.filter((x) => x !== s)
        : [...prev.specialty, s],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Vendor name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        specialty: form.specialty,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        is_preferred: form.is_preferred,
        notes: form.notes.trim() || null,
      };

      const url = isEdit ? `/api/vendors/${vendor.id}` : '/api/vendors';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save vendor');
      }

      toast.success(isEdit ? 'Vendor updated' : 'Vendor added');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="lg">
        <ModalHeader
          title={isEdit ? 'Edit Vendor' : 'Add Vendor'}
          description={isEdit ? 'Update vendor information.' : 'Add a new maintenance vendor.'}
        />
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Row: Name + Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Name *"
                placeholder="John Smith"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
              <Input
                label="Company"
                placeholder="Smith Plumbing LLC"
                value={form.company}
                onChange={(e) => updateField('company', e.target.value)}
              />
            </div>

            {/* Row: Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="vendor@example.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
              <Input
                label="Phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>

            {/* Specialties */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Specialties</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_OPTIONS.map((s) => {
                  const active = form.specialty.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSpecialty(s)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                        active
                          ? 'bg-accent text-white'
                          : 'bg-bg-elevated text-text-secondary border border-border hover:border-accent hover:text-accent'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row: Hourly Rate + Preferred */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <Input
                label="Hourly Rate ($)"
                type="number"
                step="0.01"
                min="0"
                placeholder="75.00"
                value={form.hourly_rate}
                onChange={(e) => updateField('hourly_rate', e.target.value)}
              />
              <label className="flex items-center gap-2 h-9 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_preferred}
                  onChange={(e) => updateField('is_preferred', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent bg-bg-primary"
                />
                <span className="text-sm text-text-primary">Preferred Vendor</span>
              </label>
            </div>

            {/* Notes */}
            <Textarea
              label="Notes"
              placeholder="Any additional information about this vendor..."
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
            />
          </div>

          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save Changes' : 'Add Vendor'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
