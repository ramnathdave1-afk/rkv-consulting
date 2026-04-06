'use client';

import React, { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SelectField, Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
}

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unit_number: string;
  property_id: string;
}

interface CreateMoveInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateMoveInModal({ open, onOpenChange, onCreated }: CreateMoveInModalProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);

  const [tenantId, setTenantId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [moveInDate, setMoveInDate] = useState('');

  // Fetch tenants and properties on mount
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [tRes, pRes, uRes] = await Promise.all([
        fetch('/api/tenants'),
        fetch('/api/properties'),
        fetch('/api/units'),
      ]);
      if (tRes.ok) {
        const tj = await tRes.json();
        setTenants(tj.tenants || []);
      }
      if (pRes.ok) {
        const pj = await pRes.json();
        setProperties(pj.properties || []);
      }
      if (uRes.ok) {
        const uj = await uRes.json();
        setUnits(uj.units || []);
      }
    })();
  }, [open]);

  const filteredUnits = propertyId
    ? units.filter((u) => u.property_id === propertyId)
    : [];

  const resetForm = () => {
    setTenantId('');
    setPropertyId('');
    setUnitId('');
    setMoveInDate('');
  };

  const handleSubmit = async () => {
    if (!tenantId || !propertyId || !moveInDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/move-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          property_id: propertyId,
          unit_id: unitId || null,
          move_in_date: moveInDate,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      toast.success('Move-in checklist created');
      resetForm();
      onCreated();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create move-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="md">
        <ModalHeader title="New Move-In" description="Create a move-in checklist for a tenant. Default items will be auto-generated." />
        <div className="px-6 py-4 space-y-4">
          <SelectField
            label="Tenant *"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="Select a tenant"
            options={tenants.map((t) => ({
              value: t.id,
              label: `${t.first_name} ${t.last_name}`,
            }))}
          />
          <SelectField
            label="Property *"
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              setUnitId('');
            }}
            placeholder="Select a property"
            options={properties.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
          />
          {filteredUnits.length > 0 && (
            <SelectField
              label="Unit"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              placeholder="Select a unit"
              options={filteredUnits.map((u) => ({
                value: u.id,
                label: u.unit_number,
              }))}
            />
          )}
          <Input
            label="Move-In Date *"
            type="date"
            value={moveInDate}
            onChange={(e) => setMoveInDate(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSubmit}>
            Create Move-In
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
