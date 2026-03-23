'use client';

import React, { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Unit } from '@/lib/types';

interface UnitFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  unit?: Unit | null;
  onSuccess: () => void;
}

const statusOptions = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'notice', label: 'Notice' },
  { value: 'make_ready', label: 'Make Ready' },
  { value: 'down', label: 'Down' },
  { value: 'model', label: 'Model' },
];

export function UnitFormModal({ open, onOpenChange, propertyId, unit, onSuccess }: UnitFormModalProps) {
  const isEdit = !!unit;

  const [unitNumber, setUnitNumber] = useState('');
  const [floorPlan, setFloorPlan] = useState('');
  const [bedrooms, setBedrooms] = useState('0');
  const [bathrooms, setBathrooms] = useState('1');
  const [sqft, setSqft] = useState('');
  const [marketRent, setMarketRent] = useState('');
  const [status, setStatus] = useState('vacant');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && unit) {
      setUnitNumber(unit.unit_number);
      setFloorPlan(unit.floor_plan || '');
      setBedrooms(unit.bedrooms.toString());
      setBathrooms(unit.bathrooms.toString());
      setSqft(unit.square_footage?.toString() || '');
      setMarketRent(unit.market_rent?.toString() || '');
      setStatus(unit.status);
    } else if (open) {
      setUnitNumber('');
      setFloorPlan('');
      setBedrooms('0');
      setBathrooms('1');
      setSqft('');
      setMarketRent('');
      setStatus('vacant');
    }
  }, [open, unit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitNumber.trim()) {
      toast.error('Unit number is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        unit_number: unitNumber.trim(),
        floor_plan: floorPlan.trim() || null,
        bedrooms: parseInt(bedrooms) || 0,
        bathrooms: parseFloat(bathrooms) || 1,
        square_footage: sqft ? parseInt(sqft) : null,
        market_rent: marketRent ? parseFloat(marketRent) : null,
        status,
      };

      if (isEdit) {
        const res = await fetch(`/api/units/${unit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
        toast.success('Unit updated');
      } else {
        const res = await fetch(`/api/properties/${propertyId}/units`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
        toast.success('Unit added');
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
      <ModalContent maxWidth="md">
        <ModalHeader
          title={isEdit ? 'Edit Unit' : 'Add Unit'}
          description={isEdit ? 'Update unit details' : 'Add a new unit to this property'}
        />
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Unit Number" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="e.g. 101, A1" required />
              <Input label="Floor Plan" value={floorPlan} onChange={(e) => setFloorPlan(e.target.value)} placeholder="e.g. Studio, 2BR" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Bedrooms" type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
              <Input label="Bathrooms" type="number" min="0" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
              <Input label="Sq Ft" type="number" min="0" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="—" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Market Rent ($)" type="number" min="0" step="0.01" value={marketRent} onChange={(e) => setMarketRent(e.target.value)} placeholder="0.00" />
              <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
            </div>
          </div>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEdit ? 'Update' : 'Add Unit'}</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
