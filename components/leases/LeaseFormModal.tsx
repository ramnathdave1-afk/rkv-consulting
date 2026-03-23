'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { LeaseStatus } from '@/lib/types';

interface PropertyOption {
  id: string;
  name: string;
}

interface UnitOption {
  id: string;
  unit_number: string;
  property_id: string;
}

interface TenantOption {
  id: string;
  first_name: string;
  last_name: string;
}

export interface LeaseFormData {
  id?: string;
  property_id: string;
  unit_id: string;
  tenant_id: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: string;
  security_deposit: string;
  status: LeaseStatus;
}

const EMPTY_FORM: LeaseFormData = {
  property_id: '',
  unit_id: '',
  tenant_id: '',
  lease_start: '',
  lease_end: '',
  monthly_rent: '',
  security_deposit: '',
  status: 'pending',
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'renewed', label: 'Renewed' },
];

interface LeaseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editLease?: LeaseFormData | null;
  onSuccess: () => void;
}

export default function LeaseFormModal({ open, onOpenChange, editLease, onSuccess }: LeaseFormModalProps) {
  const supabase = createClient();
  const isEdit = Boolean(editLease?.id);

  const [form, setForm] = useState<LeaseFormData>(EMPTY_FORM);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<UnitOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LeaseFormData, string>>>({});

  // Load dropdown data
  const loadOptions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile) return;

    const [propRes, unitRes, tenantRes] = await Promise.all([
      supabase.from('properties').select('id, name').eq('org_id', profile.org_id).order('name'),
      supabase.from('units').select('id, unit_number, property_id').eq('org_id', profile.org_id).order('unit_number'),
      supabase.from('tenants').select('id, first_name, last_name').eq('org_id', profile.org_id).order('last_name'),
    ]);

    setProperties(propRes.data || []);
    setUnits(unitRes.data || []);
    setTenants(tenantRes.data || []);
  }, [supabase]);

  useEffect(() => {
    if (open) {
      loadOptions();
      if (editLease) {
        setForm(editLease);
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [open, editLease, loadOptions]);

  // Filter units when property changes
  useEffect(() => {
    if (form.property_id) {
      setFilteredUnits(units.filter((u) => u.property_id === form.property_id));
    } else {
      setFilteredUnits([]);
    }
  }, [form.property_id, units]);

  const handleChange = (field: keyof LeaseFormData, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Reset unit when property changes
      if (field === 'property_id' && value !== prev.property_id) {
        next.unit_id = '';
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof LeaseFormData, string>> = {};
    if (!form.property_id) errs.property_id = 'Required';
    if (!form.unit_id) errs.unit_id = 'Required';
    if (!form.tenant_id) errs.tenant_id = 'Required';
    if (!form.lease_start) errs.lease_start = 'Required';
    if (!form.lease_end) errs.lease_end = 'Required';
    if (!form.monthly_rent || Number(form.monthly_rent) <= 0) errs.monthly_rent = 'Must be > 0';
    if (form.lease_start && form.lease_end && form.lease_end < form.lease_start) {
      errs.lease_end = 'Must be after start date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      unit_id: form.unit_id,
      tenant_id: form.tenant_id,
      lease_start: form.lease_start,
      lease_end: form.lease_end,
      monthly_rent: Number(form.monthly_rent),
      security_deposit: form.security_deposit ? Number(form.security_deposit) : null,
      status: form.status,
    };

    try {
      let res: Response;
      if (isEdit && editLease?.id) {
        res = await fetch(`/api/leases/${editLease.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/leases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || 'Failed to save lease');
      }

      toast.success(isEdit ? 'Lease updated' : 'Lease created');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const propertyOptions = properties.map((p) => ({ value: p.id, label: p.name }));
  const unitOptions = filteredUnits.map((u) => ({ value: u.id, label: u.unit_number }));
  const tenantOptions = tenants.map((t) => ({ value: t.id, label: `${t.first_name} ${t.last_name}` }));

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="lg">
        <ModalHeader
          title={isEdit ? 'Edit Lease' : 'New Lease'}
          description={isEdit ? 'Update lease details below.' : 'Fill in the lease details below.'}
        />

        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Property + Unit row */}
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Property"
              options={propertyOptions}
              placeholder="Select property..."
              value={form.property_id}
              onChange={(e) => handleChange('property_id', e.target.value)}
              error={errors.property_id}
            />
            <SelectField
              label="Unit"
              options={unitOptions}
              placeholder={form.property_id ? 'Select unit...' : 'Select property first'}
              value={form.unit_id}
              onChange={(e) => handleChange('unit_id', e.target.value)}
              disabled={!form.property_id}
              error={errors.unit_id}
            />
          </div>

          {/* Tenant */}
          <SelectField
            label="Tenant"
            options={tenantOptions}
            placeholder="Select tenant..."
            value={form.tenant_id}
            onChange={(e) => handleChange('tenant_id', e.target.value)}
            error={errors.tenant_id}
          />

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lease Start"
              type="date"
              value={form.lease_start}
              onChange={(e) => handleChange('lease_start', e.target.value)}
              error={errors.lease_start}
            />
            <Input
              label="Lease End"
              type="date"
              value={form.lease_end}
              onChange={(e) => handleChange('lease_end', e.target.value)}
              error={errors.lease_end}
            />
          </div>

          {/* Money row */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monthly Rent ($)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.monthly_rent}
              onChange={(e) => handleChange('monthly_rent', e.target.value)}
              error={errors.monthly_rent}
            />
            <Input
              label="Security Deposit ($)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.security_deposit}
              onChange={(e) => handleChange('security_deposit', e.target.value)}
              error={errors.security_deposit}
            />
          </div>

          {/* Status */}
          <SelectField
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value as LeaseStatus)}
          />
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Update Lease' : 'Create Lease'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
