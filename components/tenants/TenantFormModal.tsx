'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Tenant, TenantStatus } from '@/lib/types';

const TENANT_STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'applicant', label: 'Applicant' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'notice', label: 'Notice' },
  { value: 'past', label: 'Past' },
  { value: 'denied', label: 'Denied' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'zillow', label: 'Zillow' },
  { value: 'apartments_com', label: 'Apartments.com' },
  { value: 'craigslist', label: 'Craigslist' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'ai_chat', label: 'AI Chat' },
  { value: 'other', label: 'Other' },
];

interface TenantFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant | null;
  onSuccess: () => void;
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: TenantStatus;
  source: string;
  move_in_date: string;
  move_out_date: string;
}

const emptyForm: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  status: 'prospect',
  source: '',
  move_in_date: '',
  move_out_date: '',
};

export function TenantFormModal({ open, onOpenChange, tenant, onSuccess }: TenantFormModalProps) {
  const isEdit = !!tenant;
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (tenant) {
      setForm({
        first_name: tenant.first_name || '',
        last_name: tenant.last_name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        status: tenant.status,
        source: tenant.source || '',
        move_in_date: tenant.move_in_date ? tenant.move_in_date.split('T')[0] : '',
        move_out_date: tenant.move_out_date ? tenant.move_out_date.split('T')[0] : '',
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [tenant, open]);

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!form.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (form.move_in_date && form.move_out_date && form.move_out_date < form.move_in_date) {
      newErrors.move_out_date = 'Move-out must be after move-in';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function onChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        status: form.status,
        source: form.source || null,
        move_in_date: form.move_in_date || null,
        move_out_date: form.move_out_date || null,
      };

      const url = isEdit ? `/api/tenants/${tenant!.id}` : '/api/tenants';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }

      toast.success(isEdit ? 'Tenant updated' : 'Tenant created');
      onSuccess();
      onOpenChange(false);
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
          title={isEdit ? 'Edit Tenant' : 'Add Tenant'}
          description={isEdit ? 'Update tenant information.' : 'Add a new tenant or prospect to your organization.'}
        />
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={form.first_name}
                onChange={(e) => onChange('first_name', e.target.value)}
                error={errors.first_name}
                placeholder="John"
                required
              />
              <Input
                label="Last Name"
                value={form.last_name}
                onChange={(e) => onChange('last_name', e.target.value)}
                error={errors.last_name}
                placeholder="Doe"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => onChange('email', e.target.value)}
                error={errors.email}
                placeholder="john@example.com"
              />
              <Input
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Status"
                value={form.status}
                onChange={(e) => onChange('status', e.target.value)}
                options={TENANT_STATUS_OPTIONS}
              />
              <SelectField
                label="Source"
                value={form.source}
                onChange={(e) => onChange('source', e.target.value)}
                options={SOURCE_OPTIONS}
                placeholder="Select source..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Move-in Date"
                type="date"
                value={form.move_in_date}
                onChange={(e) => onChange('move_in_date', e.target.value)}
              />
              <Input
                label="Move-out Date"
                type="date"
                value={form.move_out_date}
                onChange={(e) => onChange('move_out_date', e.target.value)}
                error={errors.move_out_date}
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save Changes' : 'Add Tenant'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export default TenantFormModal;
