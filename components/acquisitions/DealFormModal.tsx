'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Deal, DealPipelineStage, DealPropertyType, SellerType, DealSource } from '@/lib/types';

const PROPERTY_TYPES: { value: DealPropertyType; label: string }[] = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multifamily', label: 'Multifamily' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'land', label: 'Land' },
];

const PIPELINE_STAGES: { value: DealPipelineStage; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'offer_sent', label: 'Offer Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'due_diligence', label: 'Due Diligence' },
  { value: 'closed', label: 'Closed' },
  { value: 'dead', label: 'Dead' },
];

const SELLER_TYPES: { value: SellerType; label: string }[] = [
  { value: 'motivated', label: 'Motivated' },
  { value: 'pre_foreclosure', label: 'Pre-Foreclosure' },
  { value: 'absentee', label: 'Absentee' },
  { value: 'tax_delinquent', label: 'Tax Delinquent' },
  { value: 'estate', label: 'Estate' },
  { value: 'other', label: 'Other' },
];

const DEAL_SOURCES: { value: DealSource; label: string }[] = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'propstream', label: 'PropStream' },
  { value: 'zillow', label: 'Zillow' },
  { value: 'mls', label: 'MLS' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'driving_for_dollars', label: 'Driving for Dollars' },
  { value: 'referral', label: 'Referral' },
  { value: 'direct_mail', label: 'Direct Mail' },
  { value: 'other', label: 'Other' },
];

interface DealFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  onSaved: () => void;
}

interface FormData {
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: DealPropertyType;
  bedrooms: string;
  bathrooms: string;
  square_footage: string;
  lot_size_sqft: string;
  year_built: string;
  asking_price: string;
  arv: string;
  repair_estimate: string;
  pipeline_stage: DealPipelineStage;
  seller_name: string;
  seller_phone: string;
  seller_email: string;
  seller_type: string;
  source: DealSource;
  notes: string;
}

function emptyForm(): FormData {
  return {
    address: '',
    city: '',
    state: '',
    zip: '',
    property_type: 'single_family',
    bedrooms: '',
    bathrooms: '',
    square_footage: '',
    lot_size_sqft: '',
    year_built: '',
    asking_price: '',
    arv: '',
    repair_estimate: '',
    pipeline_stage: 'lead',
    seller_name: '',
    seller_phone: '',
    seller_email: '',
    seller_type: '',
    source: 'manual',
    notes: '',
  };
}

function dealToForm(deal: Deal): FormData {
  return {
    address: deal.address || '',
    city: deal.city || '',
    state: deal.state || '',
    zip: deal.zip || '',
    property_type: deal.property_type || 'single_family',
    bedrooms: deal.bedrooms?.toString() || '',
    bathrooms: deal.bathrooms?.toString() || '',
    square_footage: deal.square_footage?.toString() || '',
    lot_size_sqft: deal.lot_size_sqft?.toString() || '',
    year_built: deal.year_built?.toString() || '',
    asking_price: deal.asking_price?.toString() || '',
    arv: deal.arv?.toString() || '',
    repair_estimate: deal.repair_estimate?.toString() || '',
    pipeline_stage: deal.pipeline_stage || 'lead',
    seller_name: deal.seller_name || '',
    seller_phone: deal.seller_phone || '',
    seller_email: deal.seller_email || '',
    seller_type: deal.seller_type || '',
    source: deal.source || 'manual',
    notes: deal.notes || '',
  };
}

export function DealFormModal({ open, onOpenChange, deal, onSaved }: DealFormModalProps) {
  const isEdit = Boolean(deal);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(deal ? dealToForm(deal) : emptyForm());
    }
  }, [open, deal]);

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const mao = useMemo(() => {
    const arvNum = parseFloat(form.arv);
    const repairNum = parseFloat(form.repair_estimate);
    if (!isNaN(arvNum) && arvNum > 0) {
      const repair = isNaN(repairNum) ? 0 : repairNum;
      return Math.round(arvNum * 0.7 - repair);
    }
    return null;
  }, [form.arv, form.repair_estimate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address.trim() || !form.city.trim() || !form.state.trim()) {
      toast.error('Address, city, and state are required');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        property_type: form.property_type,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
        square_footage: form.square_footage ? parseInt(form.square_footage) : null,
        lot_size_sqft: form.lot_size_sqft ? parseInt(form.lot_size_sqft) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        asking_price: form.asking_price ? parseFloat(form.asking_price) : null,
        arv: form.arv ? parseFloat(form.arv) : null,
        repair_estimate: form.repair_estimate ? parseFloat(form.repair_estimate) : null,
        mao: mao,
        pipeline_stage: form.pipeline_stage,
        seller_name: form.seller_name.trim() || null,
        seller_phone: form.seller_phone.trim() || null,
        seller_email: form.seller_email.trim() || null,
        seller_type: form.seller_type || null,
        source: form.source,
        notes: form.notes.trim() || null,
      };

      const url = isEdit ? `/api/deals/${deal!.id}` : '/api/deals';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save deal');
      }

      toast.success(isEdit ? 'Deal updated' : 'Deal created');
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save deal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="xl" className="max-h-[90vh] flex flex-col">
        <ModalHeader
          title={isEdit ? 'Edit Deal' : 'New Deal'}
          description={isEdit ? 'Update deal information' : 'Add a new acquisition lead to the pipeline'}
        />
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-5 overflow-y-auto flex-1">
            {/* Property Address */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Property Details</h3>
              <div className="grid grid-cols-1 gap-3">
                <Input
                  label="Street Address"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="123 Main St"
                  required
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="City"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    placeholder="Phoenix"
                    required
                  />
                  <Input
                    label="State"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                    placeholder="AZ"
                    maxLength={2}
                    required
                  />
                  <Input
                    label="ZIP"
                    value={form.zip}
                    onChange={(e) => update('zip', e.target.value)}
                    placeholder="85001"
                  />
                </div>
              </div>
            </div>

            {/* Property Specs */}
            <div>
              <div className="grid grid-cols-3 gap-3">
                <SelectField
                  label="Property Type"
                  value={form.property_type}
                  onChange={(e) => update('property_type', e.target.value)}
                  options={PROPERTY_TYPES}
                />
                <Input
                  label="Bedrooms"
                  type="number"
                  value={form.bedrooms}
                  onChange={(e) => update('bedrooms', e.target.value)}
                  placeholder="3"
                />
                <Input
                  label="Bathrooms"
                  type="number"
                  step="0.5"
                  value={form.bathrooms}
                  onChange={(e) => update('bathrooms', e.target.value)}
                  placeholder="2"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <Input
                  label="Sq Footage"
                  type="number"
                  value={form.square_footage}
                  onChange={(e) => update('square_footage', e.target.value)}
                  placeholder="1500"
                />
                <Input
                  label="Lot Size (sqft)"
                  type="number"
                  value={form.lot_size_sqft}
                  onChange={(e) => update('lot_size_sqft', e.target.value)}
                  placeholder="6000"
                />
                <Input
                  label="Year Built"
                  type="number"
                  value={form.year_built}
                  onChange={(e) => update('year_built', e.target.value)}
                  placeholder="1990"
                />
              </div>
            </div>

            {/* Financials + MAO */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Financials</h3>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Asking Price ($)"
                  type="number"
                  value={form.asking_price}
                  onChange={(e) => update('asking_price', e.target.value)}
                  placeholder="200000"
                />
                <Input
                  label="ARV ($)"
                  type="number"
                  value={form.arv}
                  onChange={(e) => update('arv', e.target.value)}
                  placeholder="280000"
                />
                <Input
                  label="Repair Estimate ($)"
                  type="number"
                  value={form.repair_estimate}
                  onChange={(e) => update('repair_estimate', e.target.value)}
                  placeholder="35000"
                />
              </div>
              {/* Live MAO display */}
              <div className="mt-3 p-3 rounded-lg bg-bg-primary border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Maximum Allowable Offer (70% Rule)</p>
                    <p className="text-xs text-text-secondary mt-0.5">MAO = (ARV x 0.70) - Repair Estimate</p>
                  </div>
                  <span className={`text-lg font-bold ${mao !== null && mao > 0 ? 'text-green-400' : mao !== null ? 'text-red-400' : 'text-text-muted'}`}>
                    {mao !== null ? `$${mao.toLocaleString()}` : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pipeline & Source */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Pipeline</h3>
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Stage"
                  value={form.pipeline_stage}
                  onChange={(e) => update('pipeline_stage', e.target.value)}
                  options={PIPELINE_STAGES}
                />
                <SelectField
                  label="Source"
                  value={form.source}
                  onChange={(e) => update('source', e.target.value)}
                  options={DEAL_SOURCES}
                />
              </div>
            </div>

            {/* Seller Info */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Seller Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Seller Name"
                  value={form.seller_name}
                  onChange={(e) => update('seller_name', e.target.value)}
                  placeholder="John Doe"
                />
                <SelectField
                  label="Seller Type"
                  value={form.seller_type}
                  onChange={(e) => update('seller_type', e.target.value)}
                  options={SELLER_TYPES}
                  placeholder="Select type..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  label="Seller Phone"
                  value={form.seller_phone}
                  onChange={(e) => update('seller_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
                <Input
                  label="Seller Email"
                  type="email"
                  value={form.seller_email}
                  onChange={(e) => update('seller_email', e.target.value)}
                  placeholder="seller@email.com"
                />
              </div>
            </div>

            {/* Notes */}
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Additional notes about this deal..."
              rows={3}
            />
          </div>

          <ModalFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Deal'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
