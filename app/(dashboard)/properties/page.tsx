'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Building2,
  Home,
  Plus,
  Upload,
  Grid3X3,
  List,
  MapPin,
  DollarSign,
  TrendingUp,
  Percent,
  Users,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Eye,
  UserPlus,
  Receipt,
  FileSpreadsheet,
  Sparkles,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Property {
  id: string;
  user_id: string;
  address: string;
  unit: string | null;
  property_type: string;
  purchase_price: number | null;
  purchase_date: string | null;
  current_value: number | null;
  monthly_rent: number | null;
  mortgage_balance: number | null;
  mortgage_rate: number | null;
  mortgage_payment: number | null;
  mortgage_lender: string | null;
  insurance_annual: number | null;
  tax_annual: number | null;
  hoa_monthly: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  year_built: number | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Tenant {
  id: string;
  property_id: string;
  name: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
}

type ViewMode = 'grid' | 'list' | 'map';
type SortKey = 'address' | 'property_type' | 'current_value' | 'monthly_rent' | 'cash_flow' | 'cap_rate' | 'equity' | 'status';
type SortDir = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/*  Helper functions                                                   */
/* ------------------------------------------------------------------ */

function fmt(n: number | null | undefined, prefix = '$'): string {
  if (n === null || n === undefined) return '--';
  return `${prefix}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '--';
  return `${n.toFixed(1)}%`;
}

function calcMonthlyExpenses(p: Property): number {
  const mortgage = p.mortgage_payment || 0;
  const insurance = (p.insurance_annual || 0) / 12;
  const tax = (p.tax_annual || 0) / 12;
  const hoa = p.hoa_monthly || 0;
  return mortgage + insurance + tax + hoa;
}

function calcCashFlow(p: Property): number {
  return (p.monthly_rent || 0) - calcMonthlyExpenses(p);
}

function calcCapRate(p: Property): number | null {
  if (!p.current_value || p.current_value === 0) return null;
  const annualNoi = ((p.monthly_rent || 0) * 12) - ((calcMonthlyExpenses(p) - (p.mortgage_payment || 0)) * 12);
  return (annualNoi / p.current_value) * 100;
}

function calcEquity(p: Property): number {
  return (p.current_value || 0) - (p.mortgage_balance || 0);
}

function getPropertyIcon(type: string) {
  if (type === 'single_family' || type === 'condo' || type === 'townhouse') {
    return Home;
  }
  return Building2;
}

function formatPropertyType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/* ------------------------------------------------------------------ */
/*  Property type options                                              */
/* ------------------------------------------------------------------ */

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'land', label: 'Land' },
  { value: 'other', label: 'Other' },
];

/* ------------------------------------------------------------------ */
/*  Default form state                                                 */
/* ------------------------------------------------------------------ */

const DEFAULT_FORM = {
  address: '',
  unit: '',
  property_type: 'single_family',
  purchase_price: '',
  purchase_date: '',
  current_value: '',
  monthly_rent: '',
  mortgage_balance: '',
  mortgage_rate: '',
  mortgage_payment: '',
  mortgage_lender: '',
  insurance_annual: '',
  tax_annual: '',
  hoa_monthly: '',
  bedrooms: '',
  bathrooms: '',
  sqft: '',
  year_built: '',
  notes: '',
};

/* ------------------------------------------------------------------ */
/*  Add Property Modal                                                 */
/* ------------------------------------------------------------------ */

function AddPropertyModal({
  open,
  onOpenChange,
  onSaved,
  atLimit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  atLimit: boolean;
}) {
  const supabase = createClient();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address.trim()) {
      setError('Address is required');
      return;
    }

    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in');
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      address: form.address.trim(),
      unit: form.unit.trim() || null,
      property_type: form.property_type,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      purchase_date: form.purchase_date || null,
      current_value: form.current_value ? parseFloat(form.current_value) : null,
      monthly_rent: form.monthly_rent ? parseFloat(form.monthly_rent) : null,
      mortgage_balance: form.mortgage_balance ? parseFloat(form.mortgage_balance) : null,
      mortgage_rate: form.mortgage_rate ? parseFloat(form.mortgage_rate) : null,
      mortgage_payment: form.mortgage_payment ? parseFloat(form.mortgage_payment) : null,
      mortgage_lender: form.mortgage_lender.trim() || null,
      insurance_annual: form.insurance_annual ? parseFloat(form.insurance_annual) : null,
      tax_annual: form.tax_annual ? parseFloat(form.tax_annual) : null,
      hoa_monthly: form.hoa_monthly ? parseFloat(form.hoa_monthly) : null,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
      sqft: form.sqft ? parseInt(form.sqft) : null,
      year_built: form.year_built ? parseInt(form.year_built) : null,
      notes: form.notes.trim() || null,
      status: 'active',
    };

    const { error: insertError } = await supabase.from('properties').insert(payload);

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setForm(DEFAULT_FORM);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  }

  if (atLimit) {
    return (
      <Modal open={open} onOpenChange={onOpenChange}>
        <ModalContent maxWidth="md">
          <div className="p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 border border-gold/20">
              <AlertCircle className="h-6 w-6 text-gold" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">
              Property Limit Reached
            </h3>
            <p className="font-body text-sm text-muted mb-6">
              You have reached the maximum number of properties on your current plan. Upgrade to add more properties.
            </p>
            <Link
              href="/settings?tab=billing"
              className={cn(
                'inline-flex items-center justify-center',
                'h-11 px-8 rounded-lg',
                'bg-gold text-black font-display font-semibold text-sm',
                'hover:shadow-glow hover:brightness-110',
                'transition-all duration-200 ease-out',
              )}
            >
              Upgrade Plan
            </Link>
          </div>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="2xl">
        <ModalHeader title="Add Property" description="Add a new property to your portfolio." />
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-5">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red/10 border border-red/20">
                <AlertCircle className="h-4 w-4 text-red flex-shrink-0" />
                <span className="text-sm text-red">{error}</span>
              </div>
            )}

            {/* Address row */}
            <div className="grid grid-cols-3 gap-4">
              <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="123 Main St, City, State" wrapperClassName="col-span-2" required />
              <Input label="Unit" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="e.g. Unit A" />
            </div>

            {/* Type + dates */}
            <div className="grid grid-cols-3 gap-4">
              <Select label="Property Type" value={form.property_type} onChange={(e) => set('property_type', e.target.value)} options={PROPERTY_TYPES} />
              <Input label="Purchase Price" type="number" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} placeholder="0" />
              <Input label="Purchase Date" type="date" value={form.purchase_date} onChange={(e) => set('purchase_date', e.target.value)} />
            </div>

            {/* Value + rent */}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Current Value" type="number" value={form.current_value} onChange={(e) => set('current_value', e.target.value)} placeholder="0" />
              <Input label="Monthly Rent" type="number" value={form.monthly_rent} onChange={(e) => set('monthly_rent', e.target.value)} placeholder="0" />
            </div>

            {/* Mortgage */}
            <div className="pt-2 border-t border-border">
              <p className="label mb-3">Mortgage</p>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Mortgage Balance" type="number" value={form.mortgage_balance} onChange={(e) => set('mortgage_balance', e.target.value)} placeholder="0" />
                <Input label="Mortgage Rate (%)" type="number" step="0.01" value={form.mortgage_rate} onChange={(e) => set('mortgage_rate', e.target.value)} placeholder="0.00" />
                <Input label="Monthly Payment" type="number" value={form.mortgage_payment} onChange={(e) => set('mortgage_payment', e.target.value)} placeholder="0" />
              </div>
              <div className="mt-3">
                <Input label="Lender" value={form.mortgage_lender} onChange={(e) => set('mortgage_lender', e.target.value)} placeholder="e.g. Chase Bank" />
              </div>
            </div>

            {/* Operating expenses */}
            <div className="pt-2 border-t border-border">
              <p className="label mb-3">Operating Expenses</p>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Insurance (Annual)" type="number" value={form.insurance_annual} onChange={(e) => set('insurance_annual', e.target.value)} placeholder="0" />
                <Input label="Property Tax (Annual)" type="number" value={form.tax_annual} onChange={(e) => set('tax_annual', e.target.value)} placeholder="0" />
                <Input label="HOA (Monthly)" type="number" value={form.hoa_monthly} onChange={(e) => set('hoa_monthly', e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* Physical */}
            <div className="pt-2 border-t border-border">
              <p className="label mb-3">Property Details</p>
              <div className="grid grid-cols-4 gap-4">
                <Input label="Bedrooms" type="number" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} placeholder="0" />
                <Input label="Bathrooms" type="number" value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} placeholder="0" />
                <Input label="Sqft" type="number" value={form.sqft} onChange={(e) => set('sqft', e.target.value)} placeholder="0" />
                <Input label="Year Built" type="number" value={form.year_built} onChange={(e) => set('year_built', e.target.value)} placeholder="e.g. 2005" />
              </div>
            </div>

            {/* Notes */}
            <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional notes about this property..." />
          </div>

          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={saving} icon={<Plus className="h-4 w-4" />}>
              Save Property
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Bulk Import Modal                                                  */
/* ------------------------------------------------------------------ */

interface ParsedProperty {
  address: string;
  unit: string;
  property_type: string;
  purchase_price: string;
  current_value: string;
  monthly_rent: string;
  mortgage_balance: string;
  [key: string]: string;
}

function BulkImportModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'paste' | 'csv'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedProperties, setParsedProperties] = useState<ParsedProperty[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const FIELD_OPTIONS = [
    { value: '', label: 'Skip' },
    { value: 'address', label: 'Address' },
    { value: 'unit', label: 'Unit' },
    { value: 'property_type', label: 'Property Type' },
    { value: 'purchase_price', label: 'Purchase Price' },
    { value: 'current_value', label: 'Current Value' },
    { value: 'monthly_rent', label: 'Monthly Rent' },
    { value: 'mortgage_balance', label: 'Mortgage Balance' },
    { value: 'mortgage_rate', label: 'Mortgage Rate' },
    { value: 'mortgage_payment', label: 'Monthly Payment' },
    { value: 'insurance_annual', label: 'Insurance (Annual)' },
    { value: 'tax_annual', label: 'Property Tax (Annual)' },
    { value: 'hoa_monthly', label: 'HOA (Monthly)' },
    { value: 'bedrooms', label: 'Bedrooms' },
    { value: 'bathrooms', label: 'Bathrooms' },
    { value: 'sqft', label: 'Sqft' },
    { value: 'year_built', label: 'Year Built' },
  ];

  /* ---- Paste -> AI parse ---- */
  async function handleParse() {
    if (!pasteText.trim()) return;
    setParsing(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/portfolio-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to parse portfolio data');
      }

      const data = await res.json();
      setParsedProperties(data.properties || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse data';
      setError(message);
    } finally {
      setParsing(false);
    }
  }

  /* ---- CSV drop ---- */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setCsvData(result.data as Record<string, string>[]);
        // Auto-map columns by trying to match field names
        const mapping: Record<string, string> = {};
        const headers = result.meta.fields || [];
        headers.forEach((header) => {
          const lower = header.toLowerCase().replace(/[^a-z]/g, '');
          if (lower.includes('address') || lower.includes('street')) mapping[header] = 'address';
          else if (lower.includes('unit') || lower.includes('apt')) mapping[header] = 'unit';
          else if (lower.includes('type') || lower.includes('propertytype')) mapping[header] = 'property_type';
          else if (lower.includes('purchaseprice') || lower.includes('buyprice')) mapping[header] = 'purchase_price';
          else if (lower.includes('currentvalue') || lower.includes('value') || lower.includes('marketvalue')) mapping[header] = 'current_value';
          else if (lower.includes('rent') || lower.includes('monthlyrent')) mapping[header] = 'monthly_rent';
          else if (lower.includes('mortgagebalance') || lower.includes('loanbalance')) mapping[header] = 'mortgage_balance';
          else if (lower.includes('bed')) mapping[header] = 'bedrooms';
          else if (lower.includes('bath')) mapping[header] = 'bathrooms';
          else if (lower.includes('sqft') || lower.includes('squarefeet') || lower.includes('area')) mapping[header] = 'sqft';
          else if (lower.includes('yearbuilt') || lower.includes('built')) mapping[header] = 'year_built';
        });
        setColumnMapping(mapping);
      },
      error: () => {
        setError('Failed to parse CSV file');
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    maxFiles: 1,
  });

  /* ---- Import all parsed properties ---- */
  async function handleImportAll(items: ParsedProperty[]) {
    setImporting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in');
      setImporting(false);
      return;
    }

    const rows = items.map((item) => ({
      user_id: user.id,
      address: item.address || 'Unknown Address',
      unit: item.unit || null,
      property_type: item.property_type || 'other',
      purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : null,
      current_value: item.current_value ? parseFloat(item.current_value) : null,
      monthly_rent: item.monthly_rent ? parseFloat(item.monthly_rent) : null,
      mortgage_balance: item.mortgage_balance ? parseFloat(item.mortgage_balance) : null,
      status: 'active',
    }));

    const { error: insertError } = await supabase.from('properties').insert(rows);

    if (insertError) {
      setError(insertError.message);
      setImporting(false);
      return;
    }

    setParsedProperties([]);
    setCsvData([]);
    setPasteText('');
    setImporting(false);
    onOpenChange(false);
    onSaved();
  }

  /* ---- Import CSV with column mapping ---- */
  async function handleImportCsv() {
    const mapped: ParsedProperty[] = csvData.map((row) => {
      const item: Record<string, string> = {};
      Object.entries(columnMapping).forEach(([csvCol, field]) => {
        if (field) item[field] = row[csvCol] || '';
      });
      return item as unknown as ParsedProperty;
    });
    await handleImportAll(mapped);
  }

  const csvHeaders = csvData.length > 0 ? Object.keys(csvData[0]) : [];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="2xl">
        <ModalHeader
          title="Import Portfolio"
          description="Paste anything or upload a CSV to bulk-import your portfolio."
        />
        <div className="px-6 py-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-red/10 border border-red/20">
              <AlertCircle className="h-4 w-4 text-red flex-shrink-0" />
              <span className="text-sm text-red">{error}</span>
            </div>
          )}

          {/* Tab toggle */}
          <div className="flex items-center gap-1 mb-5 bg-deep rounded-lg p-1 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === 'paste' ? 'bg-card text-gold' : 'text-muted hover:text-white',
              )}
            >
              Paste Anything
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('csv')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === 'csv' ? 'bg-card text-gold' : 'text-muted hover:text-white',
              )}
            >
              Upload CSV
            </button>
          </div>

          {/* ---- Paste Tab ---- */}
          {activeTab === 'paste' && (
            <div>
              {parsedProperties.length === 0 ? (
                <>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste anything -- a CSV, a list, a spreadsheet copy-paste, even a rough description of your portfolio..."
                    className={cn(
                      'w-full min-h-[300px] bg-deep text-white font-body text-sm',
                      'border border-border rounded-lg p-4',
                      'placeholder:text-muted/60 resize-y',
                      'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40',
                    )}
                  />
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="primary"
                      onClick={handleParse}
                      loading={parsing}
                      disabled={!pasteText.trim()}
                      icon={<Sparkles className="h-4 w-4" />}
                    >
                      {parsing ? 'AI is reading your portfolio...' : 'Parse with AI'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted mb-3">
                    Found <span className="text-gold font-semibold">{parsedProperties.length}</span> properties. Review and edit below, then import.
                  </p>
                  <div className="max-h-[350px] overflow-auto border border-border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-deep sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-muted font-medium">Address</th>
                          <th className="text-left px-3 py-2 text-muted font-medium">Type</th>
                          <th className="text-right px-3 py-2 text-muted font-medium">Value</th>
                          <th className="text-right px-3 py-2 text-muted font-medium">Rent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedProperties.map((prop, idx) => (
                          <tr key={idx} className="border-t border-border hover:bg-white/5">
                            <td className="px-3 py-2 text-white">
                              <input
                                value={prop.address}
                                onChange={(e) => {
                                  const updated = [...parsedProperties];
                                  updated[idx] = { ...updated[idx], address: e.target.value };
                                  setParsedProperties(updated);
                                }}
                                className="bg-transparent border-none outline-none text-white w-full"
                              />
                            </td>
                            <td className="px-3 py-2 text-text">
                              <input
                                value={prop.property_type}
                                onChange={(e) => {
                                  const updated = [...parsedProperties];
                                  updated[idx] = { ...updated[idx], property_type: e.target.value };
                                  setParsedProperties(updated);
                                }}
                                className="bg-transparent border-none outline-none text-text w-full"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-text">
                              <input
                                value={prop.current_value}
                                onChange={(e) => {
                                  const updated = [...parsedProperties];
                                  updated[idx] = { ...updated[idx], current_value: e.target.value };
                                  setParsedProperties(updated);
                                }}
                                className="bg-transparent border-none outline-none text-text text-right w-20 ml-auto"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-text">
                              <input
                                value={prop.monthly_rent}
                                onChange={(e) => {
                                  const updated = [...parsedProperties];
                                  updated[idx] = { ...updated[idx], monthly_rent: e.target.value };
                                  setParsedProperties(updated);
                                }}
                                className="bg-transparent border-none outline-none text-text text-right w-20 ml-auto"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setParsedProperties([])}>
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleImportAll(parsedProperties)}
                      loading={importing}
                      icon={<Check className="h-4 w-4" />}
                    >
                      Import All ({parsedProperties.length})
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ---- CSV Tab ---- */}
          {activeTab === 'csv' && (
            <div>
              {csvData.length === 0 ? (
                <div
                  {...getRootProps()}
                  className={cn(
                    'flex flex-col items-center justify-center',
                    'min-h-[250px] border-2 border-dashed rounded-xl p-8',
                    'transition-colors cursor-pointer',
                    isDragActive
                      ? 'border-gold bg-gold/5'
                      : 'border-border hover:border-gold/30 hover:bg-white/[0.02]',
                  )}
                >
                  <input {...getInputProps()} />
                  <FileSpreadsheet className="h-10 w-10 text-muted mb-4" />
                  <p className="text-sm text-white font-medium mb-1">
                    {isDragActive ? 'Drop CSV file here' : 'Drop CSV file here or click to browse'}
                  </p>
                  <p className="text-xs text-muted">Supports .csv files</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted mb-3">
                    Map your CSV columns to property fields:
                  </p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto mb-4">
                    {csvHeaders.map((header) => (
                      <div key={header} className="flex items-center gap-3">
                        <span className="text-sm text-white w-40 truncate flex-shrink-0">{header}</span>
                        <span className="text-muted text-xs">-&gt;</span>
                        <select
                          value={columnMapping[header] || ''}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({ ...prev, [header]: e.target.value }))
                          }
                          className="bg-deep border border-border rounded-lg text-sm text-white px-3 py-1.5 flex-1"
                        >
                          {FIELD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted mb-2">Preview (first 5 rows):</p>
                  <div className="max-h-[150px] overflow-auto border border-border rounded-lg mb-4">
                    <table className="w-full text-xs">
                      <thead className="bg-deep sticky top-0">
                        <tr>
                          {csvHeaders.slice(0, 6).map((h) => (
                            <th key={h} className="text-left px-2 py-1.5 text-muted font-medium truncate max-w-[120px]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            {csvHeaders.slice(0, 6).map((h) => (
                              <td key={h} className="px-2 py-1.5 text-text truncate max-w-[120px]">
                                {row[h]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => { setCsvData([]); setColumnMapping({}); }}>
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleImportCsv}
                      loading={importing}
                      icon={<Upload className="h-4 w-4" />}
                    >
                      Import ({csvData.length} rows)
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Portfolio Summary Row                                              */
/* ------------------------------------------------------------------ */

function PortfolioSummary({
  properties,
  tenants,
  loading,
}: {
  properties: Property[];
  tenants: Tenant[];
  loading: boolean;
}) {
  const metrics = useMemo(() => {
    if (properties.length === 0) {
      return {
        totalValue: 0,
        totalCashFlow: 0,
        totalEquity: 0,
        totalUnits: 0,
        avgCapRate: 0,
        occupancyRate: 0,
      };
    }

    const totalValue = properties.reduce((sum, p) => sum + (p.current_value || 0), 0);
    const totalCashFlow = properties.reduce((sum, p) => sum + calcCashFlow(p), 0);
    const totalEquity = properties.reduce((sum, p) => sum + calcEquity(p), 0);
    const totalUnits = properties.length;

    const capRates = properties.map((p) => calcCapRate(p)).filter((c) => c !== null) as number[];
    const avgCapRate = capRates.length > 0 ? capRates.reduce((s, c) => s + c, 0) / capRates.length : 0;

    const activeTenants = tenants.filter((t) => t.status === 'active').length;
    const occupancyRate = totalUnits > 0 ? (activeTenants / totalUnits) * 100 : 0;

    return { totalValue, totalCashFlow, totalEquity, totalUnits, avgCapRate, occupancyRate };
  }, [properties, tenants]);

  const cards = [
    { label: 'Total Portfolio Value', value: fmt(metrics.totalValue), icon: DollarSign },
    {
      label: 'Monthly Cash Flow',
      value: fmt(metrics.totalCashFlow),
      icon: TrendingUp,
      color: metrics.totalCashFlow >= 0 ? 'text-green' : 'text-red',
    },
    { label: 'Total Equity', value: fmt(metrics.totalEquity), icon: BarChart3 },
    { label: 'Total Units', value: metrics.totalUnits.toString(), icon: Building2 },
    { label: 'Avg Cap Rate', value: fmtPct(metrics.avgCapRate), icon: Percent },
    { label: 'Occupancy Rate', value: fmtPct(metrics.occupancyRate), icon: Users },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <Skeleton variant="text" height="12px" width="70%" className="mb-3" />
            <Skeleton variant="text" height="24px" width="50%" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              'rounded-xl p-4',
              'hover:border-gold/30 hover:shadow-glow-sm transition-all duration-200',
            )}
            style={{ background: '#111111', border: '1px solid #1e1e1e' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-muted" />
              <span className="label">{card.label}</span>
            </div>
            <p className={cn('text-xl font-bold font-mono', card.color || 'text-white')}>
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Property Card (Grid View)                                          */
/* ------------------------------------------------------------------ */

function PropertyCard({
  property,
  tenant,
  onAddTenant,
  onLogExpense,
}: {
  property: Property;
  tenant: Tenant | null;
  onAddTenant: () => void;
  onLogExpense: () => void;
}) {
  const Icon = getPropertyIcon(property.property_type);
  const cashFlow = calcCashFlow(property);
  const capRate = calcCapRate(property);
  const equity = calcEquity(property);

  return (
    <Link href={`/properties/${property.id}`}>
      <div
        className={cn(
          'rounded-xl p-6',
          'hover:border-gold/30 hover:shadow-glow-sm',
          'transition-all duration-200 cursor-pointer group',
        )}
        style={{ background: '#111111', border: '1px solid #1e1e1e' }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">
                {property.address}
              </h3>
              {property.unit && (
                <p className="text-xs text-muted">{property.unit}</p>
              )}
            </div>
          </div>
          <Badge variant="info" size="sm" className="font-mono text-[10px]">
            {formatPropertyType(property.property_type)}
          </Badge>
        </div>

        {/* Rent */}
        <p className="text-2xl font-bold font-mono text-green mb-3">
          {fmt(property.monthly_rent)}<span className="text-sm text-muted font-mono font-normal">/mo</span>
        </p>

        {/* Metrics row */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          <div>
            <span className="label">Cap Rate</span>
            <p className="text-white font-semibold font-mono">{fmtPct(capRate)}</p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div>
            <span className="label">Cash Flow</span>
            <p className={cn('font-semibold font-mono', cashFlow >= 0 ? 'text-green' : 'text-red')}>
              {fmt(cashFlow)}
            </p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div>
            <span className="label">Equity</span>
            <p className="text-white font-semibold font-mono">{fmt(equity)}</p>
          </div>
        </div>

        {/* Tenant info */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {tenant ? (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-gold text-[10px] font-bold">
                {tenant.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-text">{tenant.name}</span>
              <Badge variant={tenant.status === 'active' ? 'success' : 'warning'} size="sm" className="font-mono text-[10px]">
                {tenant.status === 'active' && <span className="pulse-dot mr-1" />}
                {tenant.status}
              </Badge>
            </div>
          ) : (
            <span className="text-xs text-red font-medium">Vacant</span>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="p-1.5 rounded-md text-muted hover:text-gold hover:bg-gold/10 transition-colors"
              title="View Details"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            {!tenant && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddTenant(); }}
                className="p-1.5 rounded-md text-muted hover:text-gold hover:bg-gold/10 transition-colors"
                title="Add Tenant"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLogExpense(); }}
              className="p-1.5 rounded-md text-muted hover:text-gold hover:bg-gold/10 transition-colors"
              title="Log Expense"
            >
              <Receipt className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  List View                                                          */
/* ------------------------------------------------------------------ */

function PropertyListView({
  properties,
  tenants,
  sortKey,
  sortDir,
  onSort,
}: {
  properties: Property[];
  tenants: Tenant[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    const isActive = sortKey === field;
    return (
      <th
        className="text-left px-4 py-3 text-[10px] text-gold font-body font-medium uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
        onClick={() => onSort(field)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
        </div>
      </th>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-deep">
            <tr>
              <SortHeader label="Address" field="address" />
              <SortHeader label="Type" field="property_type" />
              <SortHeader label="Value" field="current_value" />
              <SortHeader label="Monthly Rent" field="monthly_rent" />
              <SortHeader label="Cash Flow" field="cash_flow" />
              <SortHeader label="Cap Rate" field="cap_rate" />
              <SortHeader label="Equity" field="equity" />
              <th className="text-left px-4 py-3 text-[10px] text-gold font-body font-medium uppercase tracking-wider">Tenant</th>
              <SortHeader label="Status" field="status" />
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => {
              const tenant = tenants.find((t) => t.property_id === p.id);
              const cashFlow = calcCashFlow(p);
              const capRate = calcCapRate(p);
              const equity = calcEquity(p);

              return (
                <Link key={p.id} href={`/properties/${p.id}`} className="contents">
                  <tr className="border-t border-border hover:bg-white/5 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-white font-medium">{p.address}</span>
                        {p.unit && <span className="text-muted ml-1">({p.unit})</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info" size="sm" className="font-mono text-[10px]">{formatPropertyType(p.property_type)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-white font-mono">{fmt(p.current_value)}</td>
                    <td className="px-4 py-3 text-green font-medium font-mono">{fmt(p.monthly_rent)}</td>
                    <td className={cn('px-4 py-3 font-medium font-mono', cashFlow >= 0 ? 'text-green' : 'text-red')}>
                      {fmt(cashFlow)}
                    </td>
                    <td className="px-4 py-3 text-white font-mono">{fmtPct(capRate)}</td>
                    <td className="px-4 py-3 text-white font-mono">{fmt(equity)}</td>
                    <td className="px-4 py-3">
                      {tenant ? (
                        <span className="text-text">{tenant.name}</span>
                      ) : (
                        <span className="text-red text-xs font-medium">Vacant</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === 'active' ? 'success' : 'warning'} size="sm" className="font-mono text-[10px]">
                        {p.status === 'active' && <span className="pulse-dot mr-1" />}
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                </Link>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Map View (Placeholder)                                             */
/* ------------------------------------------------------------------ */

function PropertyMapView({ properties }: { properties: Property[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey || !mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    async function initMap() {
      const { loadGoogleMapsApi } = await import('@/lib/apis/googlemaps');
      await loadGoogleMapsApi();

      if (cancelled || !mapRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 39.5, lng: -98.35 },
        zoom: 4,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#111111' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#111111' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#4A6080' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e1e1e' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080808' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        ],
        disableDefaultUI: true,
        zoomControl: true,
        backgroundColor: '#080808',
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);

      const geocoder = new google.maps.Geocoder();
      const bounds = new google.maps.LatLngBounds();
      let hasMarkers = false;

      for (const prop of properties) {
        if (!prop.address) continue;
        try {
          const result = await geocoder.geocode({ address: prop.address });
          if (result.results[0]) {
            const position = result.results[0].geometry.location;
            bounds.extend(position);
            hasMarkers = true;

            const cashFlow = calcCashFlow(prop);
            const pinColor = cashFlow >= 0 ? '#c9a84c' : '#DC2626';

            const marker = new google.maps.Marker({
              map,
              position,
              title: prop.address,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: pinColor,
                fillOpacity: 0.9,
                strokeColor: 'rgba(255,255,255,0.3)',
                strokeWeight: 2,
                scale: 10,
              },
            });

            marker.addListener('click', () => setSelectedProperty(prop));
          }
        } catch {
          // Skip properties that can't be geocoded
        }
      }

      if (hasMarkers) {
        map.fitBounds(bounds, 60);
      }
    }

    initMap();
    return () => { cancelled = true; };
  }, [properties]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!apiKey) {
    return (
      <div className="rounded-xl p-8" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
        <div className="relative h-[500px] rounded-lg overflow-hidden bg-deep">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <MapPin className="h-12 w-12 text-gold/40 mb-4" />
            <p className="label mb-2">Map View</p>
            <p className="text-sm text-muted font-body">
              Add <code className="text-gold font-mono text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment variables.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      <div className="relative h-[600px]">
        <div ref={mapRef} className="w-full h-full" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-deep">
            <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
          </div>
        )}

        {selectedProperty && (
          <div className="absolute top-4 right-4 w-72 rounded-xl p-4 z-10" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{selectedProperty.address}</p>
                <p className="text-xs text-muted font-body mt-0.5">{formatPropertyType(selectedProperty.property_type)}</p>
              </div>
              <button onClick={() => setSelectedProperty(null)} className="text-muted hover:text-white ml-2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider font-body">Value</p>
                <p className="text-sm font-bold text-white font-mono">{fmt(selectedProperty.current_value)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider font-body">Rent</p>
                <p className="text-sm font-bold text-white font-mono">{fmt(selectedProperty.monthly_rent)}/mo</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider font-body">Cash Flow</p>
                <p className={cn('text-sm font-bold font-mono', calcCashFlow(selectedProperty) >= 0 ? 'text-green' : 'text-red')}>
                  {fmt(calcCashFlow(selectedProperty))}/mo
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider font-body">Cap Rate</p>
                <p className="text-sm font-bold text-white font-mono">{fmtPct(calcCapRate(selectedProperty))}</p>
              </div>
            </div>
            <Link
              href={`/properties/${selectedProperty.id}`}
              className="mt-3 block text-center text-xs text-gold hover:text-gold-light transition-colors font-body"
            >
              View Details →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function PortfolioEmptyState({
  onAdd,
  onImport,
}: {
  onAdd: () => void;
  onImport: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div
        className={cn(
          'flex items-center justify-center',
          'w-24 h-24 rounded-2xl mb-6',
          'bg-gold/10 text-gold',
          'border border-gold/20',
        )}
      >
        <Building2 className="h-16 w-16 stroke-[1.2]" />
      </div>

      <h2 className="font-display font-bold text-2xl text-white mb-3">
        Your portfolio starts here
      </h2>
      <p className="text-sm text-muted font-mono leading-relaxed mb-8 max-w-md">
        Add your first property manually or paste your entire portfolio and let AI organize it instantly
      </p>

      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          size="lg"
          onClick={onAdd}
          icon={<Plus className="h-5 w-5" />}
        >
          Add Property Manually
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onImport}
          icon={<Upload className="h-5 w-5" />}
        >
          Import Portfolio with AI
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" height="28px" width="180px" />
        <div className="flex items-center gap-3">
          <Skeleton variant="text" height="40px" width="130px" className="rounded-lg" />
          <Skeleton variant="text" height="40px" width="150px" className="rounded-lg" />
        </div>
      </div>

      {/* Summary row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="card" height="90px" />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="card" height="260px" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE COMPONENT                                                */
/* ------------------------------------------------------------------ */

export default function PropertiesPage() {
  const supabase = createClient();
  const { isAtLimit, getLimit, hasFeature: _hasFeature } = useSubscription();

  /* ---- State ---- */
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('address');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  /* ---- Fetch data ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [propResult, tenantResult] = await Promise.all([
      supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('tenants')
        .select('id, property_id, name, status, lease_start, lease_end')
        .eq('user_id', user.id),
    ]);

    setProperties(propResult.data || []);
    setTenants(tenantResult.data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- Sorting ---- */
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedProperties = useMemo(() => {
    const arr = [...properties];
    arr.sort((a, b) => {
      let aVal: number | string = '';
      let bVal: number | string = '';

      switch (sortKey) {
        case 'address':
          aVal = a.address.toLowerCase();
          bVal = b.address.toLowerCase();
          break;
        case 'property_type':
          aVal = a.property_type;
          bVal = b.property_type;
          break;
        case 'current_value':
          aVal = a.current_value || 0;
          bVal = b.current_value || 0;
          break;
        case 'monthly_rent':
          aVal = a.monthly_rent || 0;
          bVal = b.monthly_rent || 0;
          break;
        case 'cash_flow':
          aVal = calcCashFlow(a);
          bVal = calcCashFlow(b);
          break;
        case 'cap_rate':
          aVal = calcCapRate(a) || 0;
          bVal = calcCapRate(b) || 0;
          break;
        case 'equity':
          aVal = calcEquity(a);
          bVal = calcEquity(b);
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return arr;
  }, [properties, sortKey, sortDir]);

  /* ---- Plan limit check ---- */
  const _propertyLimit = getLimit('propertyLimit');
  const atPropertyLimit = isAtLimit('propertyLimit', properties.length);

  /* ---- Loading ---- */
  if (loading) {
    return <LoadingSkeleton />;
  }

  /* ---- Empty state ---- */
  if (properties.length === 0) {
    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-2xl text-white">My Portfolio</h1>
            <Badge variant="info" size="sm">0 properties</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={() => setAddModalOpen(true)} icon={<Plus className="h-4 w-4" />}>
              Add Property
            </Button>
            <Button variant="outline" onClick={() => setImportModalOpen(true)} icon={<Upload className="h-4 w-4" />}>
              Import Portfolio
            </Button>
          </div>
        </div>

        <PortfolioEmptyState
          onAdd={() => setAddModalOpen(true)}
          onImport={() => setImportModalOpen(true)}
        />

        <AddPropertyModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          onSaved={fetchData}
          atLimit={atPropertyLimit}
        />
        <BulkImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onSaved={fetchData}
        />
      </>
    );
  }

  return (
    <>
      {/* ============================================================ */}
      {/*  HEADER ROW                                                   */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display font-bold text-2xl text-white">My Portfolio</h1>
          <Badge variant="default" size="md">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => setAddModalOpen(true)} icon={<Plus className="h-4 w-4" />}>
            Add Property
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)} icon={<Upload className="h-4 w-4" />}>
            Import Portfolio
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  PORTFOLIO SUMMARY                                            */}
      {/* ============================================================ */}
      <div className="mb-6">
        <PortfolioSummary properties={properties} tenants={tenants} loading={false} />
      </div>

      {/* ============================================================ */}
      {/*  VIEW TOGGLE                                                  */}
      {/* ============================================================ */}
      <div className="flex items-center gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit">
        {[
          { key: 'grid' as ViewMode, icon: Grid3X3, label: 'Grid' },
          { key: 'list' as ViewMode, icon: List, label: 'List' },
          { key: 'map' as ViewMode, icon: MapPin, label: 'Map' },
        ].map(({ key, icon: ViewIcon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setViewMode(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-body font-medium uppercase tracking-wider transition-colors',
              viewMode === key
                ? 'bg-gold/10 text-gold border border-gold/20'
                : 'text-muted hover:text-white',
            )}
          >
            <ViewIcon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  CONTENT VIEWS                                                */}
      {/* ============================================================ */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProperties.map((p) => {
            const tenant = tenants.find((t) => t.property_id === p.id && t.status === 'active') || null;
            return (
              <PropertyCard
                key={p.id}
                property={p}
                tenant={tenant}
                onAddTenant={() => {/* Navigate to tenant add */}}
                onLogExpense={() => {/* Navigate to expense log */}}
              />
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <PropertyListView
          properties={sortedProperties}
          tenants={tenants}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )}

      {viewMode === 'map' && <PropertyMapView properties={properties} />}

      {/* ============================================================ */}
      {/*  MODALS                                                       */}
      {/* ============================================================ */}
      <AddPropertyModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSaved={fetchData}
        atLimit={atPropertyLimit}
      />
      <BulkImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSaved={fetchData}
      />
    </>
  );
}
