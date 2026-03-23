'use client';

import React, { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { WorkOrder, Property, Unit, Tenant, Vendor } from '@/lib/types';

interface WorkOrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder?: WorkOrder | null;
  onSuccess: () => void;
}

const categoryOptions = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'pest', label: 'Pest Control' },
  { value: 'structural', label: 'Structural' },
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'safety', label: 'Safety' },
  { value: 'general', label: 'General' },
  { value: 'turnover', label: 'Turnover' },
];

const priorityOptions = [
  { value: 'emergency', label: 'Emergency (P1)' },
  { value: 'high', label: 'High (P2)' },
  { value: 'medium', label: 'Medium (P3)' },
  { value: 'low', label: 'Low' },
];

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'parts_needed', label: 'Parts Needed' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function WorkOrderFormModal({ open, onOpenChange, workOrder, onSuccess }: WorkOrderFormModalProps) {
  const supabase = createClient();
  const isEdit = !!workOrder;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('open');
  const [scheduledDate, setScheduledDate] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    if (open) {
      loadDropdownData();
      if (workOrder) {
        setTitle(workOrder.title);
        setDescription(workOrder.description || '');
        setPropertyId(workOrder.property_id);
        setUnitId(workOrder.unit_id || '');
        setTenantId(workOrder.tenant_id || '');
        setVendorId(workOrder.vendor_id || '');
        setCategory(workOrder.category);
        setPriority(workOrder.priority);
        setStatus(workOrder.status);
        setScheduledDate(workOrder.scheduled_date || '');
        setCost(workOrder.cost?.toString() || '');
      } else {
        resetForm();
      }
    }
  }, [open, workOrder]);

  useEffect(() => {
    if (propertyId) {
      loadUnits(propertyId);
    } else {
      setUnits([]);
      setUnitId('');
    }
  }, [propertyId]);

  async function loadDropdownData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile) return;

    const [propsRes, tenantsRes, vendorsRes] = await Promise.all([
      supabase.from('properties').select('*').eq('org_id', profile.org_id).order('name'),
      supabase.from('tenants').select('*').eq('org_id', profile.org_id).in('status', ['active', 'prospect', 'applicant']).order('last_name'),
      supabase.from('vendors').select('*').eq('org_id', profile.org_id).order('name'),
    ]);

    setProperties((propsRes.data as Property[]) || []);
    setTenants((tenantsRes.data as Tenant[]) || []);
    setVendors((vendorsRes.data as Vendor[]) || []);
  }

  async function loadUnits(propId: string) {
    const { data } = await supabase.from('units').select('*').eq('property_id', propId).order('unit_number');
    setUnits((data as Unit[]) || []);
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setPropertyId('');
    setUnitId('');
    setTenantId('');
    setVendorId('');
    setCategory('general');
    setPriority('medium');
    setStatus('open');
    setScheduledDate('');
    setCost('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !propertyId) {
      toast.error('Title and property are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        property_id: propertyId,
        unit_id: unitId || null,
        tenant_id: tenantId || null,
        vendor_id: vendorId || null,
        category,
        priority,
        status,
        scheduled_date: scheduledDate || null,
        cost: cost ? parseFloat(cost) : null,
      };

      if (isEdit) {
        const res = await fetch(`/api/work-orders/${workOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
        toast.success('Work order updated');
      } else {
        const res = await fetch('/api/work-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, source: 'manual' }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
        toast.success('Work order created');
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="lg">
        <ModalHeader
          title={isEdit ? 'Edit Work Order' : 'New Work Order'}
          description={isEdit ? 'Update work order details' : 'Create a maintenance work order'}
        />
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Leaking faucet in kitchen" required />
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail..." />

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Property"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                options={properties.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Select property"
              />
              <SelectField
                label="Unit"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                options={units.map((u) => ({ value: u.id, label: u.unit_number }))}
                placeholder={propertyId ? 'Select unit' : 'Select property first'}
                disabled={!propertyId}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions} />
              <SelectField label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} options={priorityOptions} />
              <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Assign Tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                options={tenants.map((t) => ({ value: t.id, label: `${t.first_name} ${t.last_name}` }))}
                placeholder="Optional"
              />
              <SelectField
                label="Assign Vendor"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                options={vendors.map((v) => ({ value: v.id, label: v.company ? `${v.name} (${v.company})` : v.name }))}
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Scheduled Date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              <Input label="Cost ($)" type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEdit ? 'Update' : 'Create Work Order'}</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
