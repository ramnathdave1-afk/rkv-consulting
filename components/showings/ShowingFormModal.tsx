'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Showing, ShowingStatus, ShowingSource, Property, Unit, Tenant } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface ShowingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showing?: Showing | null;
  onSaved: () => void;
}

const STATUS_OPTIONS: { value: ShowingStatus; label: string }[] = [
  { value: 'requested', label: 'Requested' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No Show' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SOURCE_OPTIONS: { value: ShowingSource; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'ai_chat', label: 'AI Chat' },
  { value: 'website', label: 'Website' },
  { value: 'phone', label: 'Phone' },
  { value: 'walk_in', label: 'Walk-in' },
];

const toLocalDatetime = (iso: string) => {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export default function ShowingFormModal({ open, onOpenChange, showing, onSaved }: ShowingFormModalProps) {
  const supabase = createClient();
  const isEdit = !!showing;

  const [properties, setProperties] = useState<Pick<Property, 'id' | 'name'>[]>([]);
  const [units, setUnits] = useState<Pick<Unit, 'id' | 'unit_number' | 'property_id'>[]>([]);
  const [tenants, setTenants] = useState<Pick<Tenant, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'>[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [prospectPhone, setProspectPhone] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [status, setStatus] = useState<ShowingStatus>('scheduled');
  const [source, setSource] = useState<ShowingSource>('manual');
  const [notes, setNotes] = useState('');

  // Load lookup data
  useEffect(() => {
    if (!open) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const [propRes, tenantRes] = await Promise.all([
        supabase.from('properties').select('id, name').eq('org_id', profile.org_id).order('name'),
        supabase.from('tenants').select('id, first_name, last_name, email, phone').eq('org_id', profile.org_id).in('status', ['prospect', 'applicant', 'active']).order('last_name'),
      ]);
      setProperties(propRes.data || []);
      setTenants(tenantRes.data || []);
    }
    load();
  }, [open, supabase]);

  // Load units when property changes
  useEffect(() => {
    if (!propertyId) { setUnits([]); return; }
    async function loadUnits() {
      const { data } = await supabase
        .from('units')
        .select('id, unit_number, property_id')
        .eq('property_id', propertyId)
        .order('unit_number');
      setUnits(data || []);
    }
    loadUnits();
  }, [propertyId, supabase]);

  // Populate form when editing
  useEffect(() => {
    if (showing) {
      setPropertyId(showing.property_id || '');
      setUnitId(showing.unit_id || '');
      setTenantId(showing.tenant_id || '');
      setProspectName(showing.prospect_name || '');
      setProspectPhone(showing.prospect_phone || '');
      setProspectEmail(showing.prospect_email || '');
      setScheduledAt(showing.scheduled_at ? toLocalDatetime(showing.scheduled_at) : '');
      setDurationMinutes(String(showing.duration_minutes || 30));
      setStatus(showing.status);
      setSource(showing.source);
      setNotes(showing.notes || '');
    } else {
      resetForm();
    }
  }, [showing, open]);

  const resetForm = useCallback(() => {
    setPropertyId('');
    setUnitId('');
    setTenantId('');
    setProspectName('');
    setProspectPhone('');
    setProspectEmail('');
    setScheduledAt('');
    setDurationMinutes('30');
    setStatus('scheduled');
    setSource('manual');
    setNotes('');
  }, []);

  // Autofill prospect info from tenant
  const handleTenantChange = (tid: string) => {
    setTenantId(tid);
    if (tid) {
      const t = tenants.find((t) => t.id === tid);
      if (t) {
        setProspectName(`${t.first_name} ${t.last_name}`);
        setProspectPhone(t.phone || '');
        setProspectEmail(t.email || '');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!propertyId) { toast.error('Please select a property'); return; }
    if (!scheduledAt) { toast.error('Please select a date and time'); return; }
    if (!prospectName && !prospectPhone && !prospectEmail && !tenantId) {
      toast.error('Please provide prospect info or select a tenant');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        property_id: propertyId,
        unit_id: unitId || null,
        tenant_id: tenantId || null,
        prospect_name: prospectName || null,
        prospect_phone: prospectPhone || null,
        prospect_email: prospectEmail || null,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: parseInt(durationMinutes, 10) || 30,
        status,
        source,
        notes: notes || null,
      };

      const url = isEdit ? `/api/showings/${showing!.id}` : '/api/showings';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save showing');
      }

      toast.success(isEdit ? 'Showing updated' : 'Showing scheduled');
      onSaved();
      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const filteredUnits = units.filter((u) => u.property_id === propertyId);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="lg">
        <ModalHeader
          title={isEdit ? 'Edit Showing' : 'Schedule Showing'}
          description={isEdit ? 'Update showing details below.' : 'Fill in the details to schedule a new property showing.'}
        />

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Property & Unit row */}
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Property *"
                value={propertyId}
                onChange={(e) => { setPropertyId(e.target.value); setUnitId(''); }}
                options={properties.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Select property"
              />
              <SelectField
                label="Unit"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                options={filteredUnits.map((u) => ({ value: u.id, label: u.unit_number }))}
                placeholder={propertyId ? 'Select unit' : 'Select property first'}
                disabled={!propertyId}
              />
            </div>

            {/* Existing tenant selector */}
            <SelectField
              label="Link to Existing Tenant (optional)"
              value={tenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              options={[
                { value: '', label: '-- New Prospect --' },
                ...tenants.map((t) => ({
                  value: t.id,
                  label: `${t.first_name} ${t.last_name}${t.phone ? ` (${t.phone})` : ''}`,
                })),
              ]}
            />

            {/* Prospect info */}
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Prospect Name"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                placeholder="Jane Doe"
              />
              <Input
                label="Phone"
                value={prospectPhone}
                onChange={(e) => setProspectPhone(e.target.value)}
                placeholder="+1 555-123-4567"
              />
              <Input
                label="Email"
                type="email"
                value={prospectEmail}
                onChange={(e) => setProspectEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>

            {/* Schedule row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input
                  label="Date & Time *"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <Input
                label="Duration (min)"
                type="number"
                min="5"
                max="240"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>

            {/* Status & Source row */}
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ShowingStatus)}
                options={STATUS_OPTIONS}
              />
              <SelectField
                label="Source"
                value={source}
                onChange={(e) => setSource(e.target.value as ShowingSource)}
                options={SOURCE_OPTIONS}
              />
            </div>

            {/* Notes */}
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the showing..."
              rows={3}
            />
          </div>

          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Update Showing' : 'Schedule Showing'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
