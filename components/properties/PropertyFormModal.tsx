'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Property, PropertyType } from '@/lib/types';

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'multifamily', label: 'Multifamily' },
  { value: 'single_family', label: 'Single Family' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'hoa', label: 'HOA' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
].map((s) => ({ value: s, label: s }));

interface PropertyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  property_type: PropertyType;
  unit_count: string;
  year_built: string;
  square_footage: string;
}

const emptyForm: FormData = {
  name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip: '',
  property_type: 'multifamily',
  unit_count: '',
  year_built: '',
  square_footage: '',
};

export function PropertyFormModal({ open, onOpenChange, property, onSuccess }: PropertyFormModalProps) {
  const isEdit = !!property;
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (property) {
      setForm({
        name: property.name || '',
        address_line1: property.address_line1 || '',
        address_line2: property.address_line2 || '',
        city: property.city || '',
        state: property.state || '',
        zip: property.zip || '',
        property_type: property.property_type || 'multifamily',
        unit_count: property.unit_count?.toString() || '',
        year_built: property.year_built?.toString() || '',
        square_footage: property.square_footage?.toString() || '',
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [property, open]);

  function onChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.address_line1.trim()) newErrors.address_line1 = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.state) newErrors.state = 'State is required';
    if (!form.zip.trim()) newErrors.zip = 'ZIP code is required';
    if (!form.unit_count || Number(form.unit_count) < 1) newErrors.unit_count = 'At least 1 unit required';
    if (form.year_built && (Number(form.year_built) < 1800 || Number(form.year_built) > new Date().getFullYear() + 5)) {
      newErrors.year_built = 'Enter a valid year';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || null,
        city: form.city.trim(),
        state: form.state,
        zip: form.zip.trim(),
        property_type: form.property_type,
        unit_count: Number(form.unit_count),
        year_built: form.year_built ? Number(form.year_built) : null,
        square_footage: form.square_footage ? Number(form.square_footage) : null,
      };

      const url = isEdit ? `/api/properties/${property!.id}` : '/api/properties';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Something went wrong');
      }

      toast.success(isEdit ? 'Property updated' : 'Property created');
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
          title={isEdit ? 'Edit Property' : 'Add Property'}
          description={isEdit ? 'Update the property details below.' : 'Fill in the details to add a new property.'}
        />
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <Input
              label="Property Name"
              placeholder="e.g. Sunset Apartments"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              error={errors.name}
            />

            <Input
              label="Address Line 1"
              placeholder="123 Main St"
              value={form.address_line1}
              onChange={(e) => onChange('address_line1', e.target.value)}
              error={errors.address_line1}
            />

            <Input
              label="Address Line 2"
              placeholder="Suite / Apt / Unit (optional)"
              value={form.address_line2}
              onChange={(e) => onChange('address_line2', e.target.value)}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                placeholder="Phoenix"
                value={form.city}
                onChange={(e) => onChange('city', e.target.value)}
                error={errors.city}
              />
              <SelectField
                label="State"
                options={US_STATES}
                placeholder="Select..."
                value={form.state}
                onChange={(e) => onChange('state', e.target.value)}
                error={errors.state}
              />
              <Input
                label="ZIP Code"
                placeholder="85001"
                value={form.zip}
                onChange={(e) => onChange('zip', e.target.value)}
                error={errors.zip}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Property Type"
                options={PROPERTY_TYPE_OPTIONS}
                value={form.property_type}
                onChange={(e) => onChange('property_type', e.target.value)}
              />
              <Input
                label="Unit Count"
                type="number"
                min="1"
                placeholder="1"
                value={form.unit_count}
                onChange={(e) => onChange('unit_count', e.target.value)}
                error={errors.unit_count}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Year Built"
                type="number"
                placeholder="2005"
                value={form.year_built}
                onChange={(e) => onChange('year_built', e.target.value)}
                error={errors.year_built}
              />
              <Input
                label="Square Footage"
                type="number"
                placeholder="12000"
                value={form.square_footage}
                onChange={(e) => onChange('square_footage', e.target.value)}
              />
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save Changes' : 'Add Property'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
