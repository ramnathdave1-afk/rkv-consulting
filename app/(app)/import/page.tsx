'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';

type Entity = 'properties' | 'units' | 'tenants' | 'leases';

interface SchemaField {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
}

const ENTITY_LABELS: Record<Entity, string> = {
  properties: 'Properties',
  units: 'Units',
  tenants: 'Tenants',
  leases: 'Leases',
};

const ENTITY_ORDER: { value: Entity; label: string; description: string; order: number }[] = [
  { value: 'properties', label: 'Properties', description: 'Buildings & complexes', order: 1 },
  { value: 'units', label: 'Units', description: 'Requires properties first', order: 2 },
  { value: 'tenants', label: 'Tenants', description: 'Residents & prospects', order: 3 },
  { value: 'leases', label: 'Leases', description: 'Requires units + tenants', order: 4 },
];

const SCHEMAS: Record<Entity, SchemaField[]> = {
  properties: [
    { name: 'name', label: 'Property Name', required: true },
    { name: 'address_line1', label: 'Address', required: true },
    { name: 'address_line2', label: 'Address 2 (Apt/Suite)' },
    { name: 'city', label: 'City', required: true },
    { name: 'state', label: 'State', required: true },
    { name: 'zip', label: 'ZIP', required: true },
    { name: 'property_type', label: 'Property Type', hint: 'multifamily, single_family, commercial, mixed_use, hoa' },
    { name: 'unit_count', label: 'Unit Count' },
    { name: 'year_built', label: 'Year Built' },
  ],
  units: [
    { name: 'property_name', label: 'Property Name', required: true, hint: 'Must match an existing property' },
    { name: 'unit_number', label: 'Unit Number', required: true },
    { name: 'bedrooms', label: 'Bedrooms' },
    { name: 'bathrooms', label: 'Bathrooms' },
    { name: 'square_footage', label: 'Square Footage' },
    { name: 'market_rent', label: 'Market Rent' },
    { name: 'status', label: 'Status', hint: 'occupied, vacant, notice, make_ready, down, model' },
    { name: 'floor_plan', label: 'Floor Plan' },
  ],
  tenants: [
    { name: 'first_name', label: 'First Name', required: true, hint: 'Required unless full_name is provided' },
    { name: 'last_name', label: 'Last Name' },
    { name: 'full_name', label: 'Full Name', hint: 'Use instead of first/last' },
    { name: 'email', label: 'Email' },
    { name: 'phone', label: 'Phone' },
    { name: 'status', label: 'Status', hint: 'prospect, applicant, approved, active, notice, past, denied' },
    { name: 'move_in_date', label: 'Move-in Date' },
    { name: 'move_out_date', label: 'Move-out Date' },
  ],
  leases: [
    { name: 'tenant_name', label: 'Tenant Name', required: true, hint: '"First Last" — must match existing tenant' },
    { name: 'unit_number', label: 'Unit Number', required: true },
    { name: 'property_name', label: 'Property Name' },
    { name: 'lease_start', label: 'Lease Start', required: true, hint: 'YYYY-MM-DD' },
    { name: 'lease_end', label: 'Lease End', required: true, hint: 'YYYY-MM-DD' },
    { name: 'monthly_rent', label: 'Monthly Rent', required: true },
    { name: 'security_deposit', label: 'Security Deposit' },
    { name: 'status', label: 'Status', hint: 'pending, active, expired, terminated, renewed' },
  ],
};

const STEP_LABELS = ['Choose', 'Upload', 'Map', 'Validate', 'Import'];

export default function ImportPage() {
  const [step, setStep] = useState(1);
  const [entity, setEntity] = useState<Entity>('properties');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    valid_count: number;
    invalid_count: number;
    total: number;
    errors: { row: number; field: string; message: string }[];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    total: number;
    errors: { row: number; messages: string[] }[];
  } | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schema = SCHEMAS[entity];

  const parseFile = useCallback(async (f: File) => {
    const text = await f.text();
    const { headers, rows } = parseCSV(text);
    setCsvHeaders(headers);
    setCsvRows(rows);
    const auto: Record<string, string> = {};
    for (const h of headers) {
      const target = autoDetect(h, schema);
      if (target) auto[h] = target;
    }
    setMapping(auto);
    setPreviewResult(null);
    setImportResult(null);
  }, [schema]);

  function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
    parseFile(f);
  }

  const canAdvance = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) return file !== null && csvRows.length > 0;
    if (step === 3) {
      const mappedTargets = new Set(Object.values(mapping).filter(Boolean));
      return schema.filter((f) => f.required).every((f) => mappedTargets.has(f.name));
    }
    if (step === 4) return previewResult !== null;
    return false;
  }, [step, file, csvRows.length, mapping, schema, previewResult]);

  async function runPreview() {
    setPreviewing(true);
    setPreviewResult(null);
    try {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: entity, rows: csvRows, mapping }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewResult({
          valid_count: 0,
          invalid_count: csvRows.length,
          total: csvRows.length,
          errors: [{ row: 0, field: '', message: data.error || 'Preview failed' }],
        });
      } else {
        setPreviewResult(data);
      }
    } catch (e) {
      setPreviewResult({
        valid_count: 0,
        invalid_count: csvRows.length,
        total: csvRows.length,
        errors: [{ row: 0, field: '', message: String(e) }],
      });
    }
    setPreviewing(false);
  }

  async function runImport() {
    setImporting(true);
    setImportResult(null);
    try {
      let rowsToSend = csvRows;
      if (skipInvalid && previewResult) {
        const badRows = new Set(previewResult.errors.map((e) => e.row));
        rowsToSend = csvRows.filter((_, idx) => !badRows.has(idx + 2));
      }
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: entity, rows: rowsToSend, mapping, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportResult({
          imported: 0,
          skipped: rowsToSend.length,
          total: rowsToSend.length,
          errors: [{ row: 0, messages: [data.error || 'Import failed'] }],
        });
      } else {
        setImportResult(data);
      }
    } catch (e) {
      setImportResult({
        imported: 0,
        skipped: csvRows.length,
        total: csvRows.length,
        errors: [{ row: 0, messages: [String(e)] }],
      });
    }
    setImporting(false);
  }

  function reset() {
    setStep(1);
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setPreviewResult(null);
    setImportResult(null);
  }

  function downloadTemplate() {
    window.open(`/api/import/templates/${entity}`, '_blank');
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-xl font-bold text-[#020617]">Import Data</h1>
        <p className="text-sm text-slate-500">
          Bulk-load properties, units, tenants, and leases from any CSV.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-2">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    done
                      ? 'bg-emerald-100 text-emerald-700'
                      : active
                      ? 'bg-[#0369A1] text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <Check size={16} /> : n}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    active
                      ? 'text-[#020617]'
                      : done
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 transition-colors ${
                    done ? 'bg-emerald-300' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="p-8 bg-white border border-slate-200 rounded-lg shadow-sm space-y-5">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Recommended Import Order
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                {ENTITY_ORDER.map((e, i) => (
                  <React.Fragment key={e.value}>
                    <span
                      className={`px-2 py-1 rounded-md ${
                        entity === e.value
                          ? 'bg-sky-50 text-[#0369A1] font-semibold'
                          : 'text-slate-500'
                      }`}
                    >
                      {e.order}. {e.label}
                    </span>
                    {i < ENTITY_ORDER.length - 1 && (
                      <ArrowRight size={12} className="text-slate-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Choose entity to import
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ENTITY_ORDER.map((e) => (
                  <button
                    key={e.value}
                    onClick={() => setEntity(e.value)}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      entity === e.value
                        ? 'border-[#0369A1] bg-sky-50/50 ring-1 ring-[#0369A1]'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#020617]">{e.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{e.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Schema for {ENTITY_LABELS[entity]}
                </h3>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0369A1] hover:text-[#0284C7] hover:underline cursor-pointer"
                >
                  <FileText size={12} /> Download template CSV
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {schema.map((f) => (
                  <div key={f.name} className="text-xs flex items-start gap-2">
                    <code className="text-[#0369A1] bg-sky-50 rounded px-1.5 py-0.5 shrink-0 font-mono">
                      {f.name}
                    </code>
                    <span className="text-slate-600">
                      {f.label}
                      {f.required && <span className="text-rose-500 ml-1">*</span>}
                      {f.hint && (
                        <span className="text-slate-400 block text-[10px]">{f.hint}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <NavButtons onNext={() => setStep(2)} canAdvance nextLabel="Choose CSV" />
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`p-8 bg-white border-2 border-dashed rounded-lg shadow-sm cursor-pointer transition-colors text-center ${
              dragOver
                ? 'border-[#0369A1] bg-sky-50/50'
                : 'border-slate-200 hover:border-[#0369A1] hover:bg-sky-50/30'
            }`}
          >
            <Upload size={32} className="mx-auto text-slate-400 mb-3" />
            {file ? (
              <div>
                <p className="text-sm font-semibold text-[#020617]">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB · {csvRows.length} rows · {csvHeaders.length} columns
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-[#020617]">Click to upload a CSV file</p>
                <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </div>

          {csvRows.length > 0 && (
            <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Preview (first 10 rows)
              </h3>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      {csvHeaders.map((h) => (
                        <th
                          key={h}
                          className="text-left px-2 py-2 font-semibold whitespace-nowrap uppercase tracking-wide text-[10px]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-sky-50/50 transition-colors">
                        {csvHeaders.map((h) => (
                          <td
                            key={h}
                            className="px-2 py-1 text-slate-600 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                          >
                            {r[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <NavButtons
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            canAdvance={canAdvance}
            nextLabel="Map columns"
          />
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="p-8 bg-white border border-slate-200 rounded-lg shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Match CSV columns → {ENTITY_LABELS[entity]} fields
            </h3>
            <div className="space-y-2">
              {csvHeaders.map((h) => (
                <div key={h} className="flex items-center gap-3 text-sm">
                  <code className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-[#020617] text-xs font-mono">
                    {h}
                  </code>
                  <ArrowRight size={14} className="text-slate-400" />
                  <select
                    value={mapping[h] || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                    className="flex-1 h-10 bg-white border border-slate-200 rounded-md px-3 text-xs text-[#020617] focus:outline-none focus:ring-2 focus:ring-[#0369A1] focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="">— ignore —</option>
                    {schema.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.label}
                        {f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <RequiredFieldStatus schema={schema} mapping={mapping} />
          </div>

          <NavButtons
            onBack={() => setStep(2)}
            onNext={async () => {
              setStep(4);
              await runPreview();
            }}
            canAdvance={canAdvance}
            nextLabel="Validate"
          />
        </motion.div>
      )}

      {step === 4 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {previewing && (
            <div className="p-8 bg-white border border-slate-200 rounded-lg shadow-sm text-center text-sm text-slate-500">
              Validating rows...
            </div>
          )}

          {previewResult && (
            <>
              <div className="p-8 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="Valid" value={previewResult.valid_count} color="green" />
                  <Stat label="Invalid" value={previewResult.invalid_count} color="yellow" />
                  <Stat label="Total" value={previewResult.total} color="muted" />
                </div>
              </div>

              {previewResult.errors.length > 0 && (
                <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Validation Errors ({previewResult.errors.length})
                  </h3>
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {previewResult.errors.map((err, i) => (
                      <div
                        key={i}
                        className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded px-2 py-1"
                      >
                        Row {err.row}
                        {err.field ? ` · ${err.field}` : ''}: {err.message}
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 mt-3 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipInvalid}
                      onChange={(e) => setSkipInvalid(e.target.checked)}
                      className="rounded accent-[#0369A1] cursor-pointer"
                    />
                    Skip invalid rows on import
                  </label>
                </div>
              )}
            </>
          )}

          <NavButtons
            onBack={() => setStep(3)}
            onNext={async () => {
              setStep(5);
              await runImport();
            }}
            canAdvance={canAdvance && (previewResult?.valid_count ?? 0) > 0}
            nextLabel={`Import ${previewResult?.valid_count ?? 0} rows`}
          />
        </motion.div>
      )}

      {step === 5 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {importing && (
            <div className="p-8 bg-white border border-slate-200 rounded-lg shadow-sm text-center">
              <div className="mb-3 text-sm text-slate-500">Importing rows...</div>
              <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                <motion.div
                  className="h-full bg-[#0369A1]"
                  initial={{ width: '0%' }}
                  animate={{ width: '90%' }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {importResult && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-white border border-slate-200 rounded-lg shadow-sm space-y-4"
              >
                <div className="flex items-center gap-2">
                  {importResult.imported > 0 ? (
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  ) : (
                    <AlertTriangle size={20} className="text-amber-600" />
                  )}
                  <h3 className="font-display text-sm font-semibold text-[#020617]">
                    {importResult.imported > 0 && importResult.skipped === 0
                      ? 'Import complete'
                      : importResult.imported > 0
                      ? 'Import complete with skipped rows'
                      : 'Nothing imported'}
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Stat label="Imported" value={importResult.imported} color="green" />
                  <Stat label="Skipped" value={importResult.skipped} color="yellow" />
                  <Stat label="Total" value={importResult.total} color="muted" />
                </div>

                {importResult.imported > 0 && (
                  <a
                    href={`/${entity}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0369A1] hover:text-[#0284C7] hover:underline"
                  >
                    View imported {ENTITY_LABELS[entity].toLowerCase()} <ArrowRight size={12} />
                  </a>
                )}
              </motion.div>

              {importResult.errors.length > 0 && (
                <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Errors ({importResult.errors.length})
                  </h3>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {importResult.errors.map((err, i) => (
                      <div
                        key={i}
                        className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded px-2 py-1"
                      >
                        Row {err.row}: {err.messages.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-[#020617] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Import another file
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  canAdvance,
  nextLabel,
}: {
  onBack?: () => void;
  onNext?: () => void;
  canAdvance: boolean;
  nextLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-[#020617] hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back
        </button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-[#0369A1] text-white text-sm font-semibold hover:bg-[#0284C7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {nextLabel} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: 'green' | 'yellow' | 'muted' }) {
  const colorClass =
    color === 'green'
      ? 'text-emerald-600'
      : color === 'yellow'
      ? 'text-amber-600'
      : 'text-slate-600';
  return (
    <div className="text-center">
      <p className={`text-2xl font-display font-bold ${colorClass}`}>{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function RequiredFieldStatus({
  schema,
  mapping,
}: {
  schema: SchemaField[];
  mapping: Record<string, string>;
}) {
  const mapped = new Set(Object.values(mapping).filter(Boolean));
  const required = schema.filter((f) => f.required);
  const missing = required.filter((f) => !mapped.has(f.name));

  if (missing.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
        <Check size={14} /> All required fields are mapped
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div>
        Missing required fields:{' '}
        <span className="font-semibold">{missing.map((f) => f.label).join(', ')}</span>
      </div>
    </div>
  );
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const out: string[][] = [];
  let cur = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(cur);
        cur = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur);
        out.push(row);
        row = [];
        cur = '';
      } else {
        cur += c;
      }
    }
  }
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    out.push(row);
  }
  const filtered = out.filter((r) => r.some((v) => v.trim() !== ''));
  if (filtered.length === 0) return { headers: [], rows: [] };

  const headers = filtered[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < filtered.length; i++) {
    const r: Record<string, string> = {};
    headers.forEach((h, j) => {
      r[h] = (filtered[i][j] ?? '').trim();
    });
    rows.push(r);
  }
  return { headers, rows };
}

function autoDetect(csvHeader: string, schema: SchemaField[]): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const h = norm(csvHeader);

  const aliases: Record<string, string> = {
    propertyname: 'name',
    buildingname: 'name',
    property: 'name',
    name: 'name',
    address: 'address_line1',
    addressline1: 'address_line1',
    streetaddress: 'address_line1',
    street: 'address_line1',
    address2: 'address_line2',
    addressline2: 'address_line2',
    apt: 'address_line2',
    suite: 'address_line2',
    city: 'city',
    state: 'state',
    st: 'state',
    zip: 'zip',
    zipcode: 'zip',
    postalcode: 'zip',
    type: 'property_type',
    propertytype: 'property_type',
    units: 'unit_count',
    unitcount: 'unit_count',
    totalunits: 'unit_count',
    yearbuilt: 'year_built',
    built: 'year_built',
    unit: 'unit_number',
    unitnumber: 'unit_number',
    unitnum: 'unit_number',
    bedrooms: 'bedrooms',
    beds: 'bedrooms',
    br: 'bedrooms',
    bathrooms: 'bathrooms',
    baths: 'bathrooms',
    ba: 'bathrooms',
    sqft: 'square_footage',
    squarefootage: 'square_footage',
    sqfeet: 'square_footage',
    rent: 'market_rent',
    marketrent: 'market_rent',
    monthlyrent: 'market_rent',
    askingrent: 'market_rent',
    status: 'status',
    floorplan: 'floor_plan',
    plan: 'floor_plan',
    layout: 'floor_plan',
    firstname: 'first_name',
    first: 'first_name',
    lastname: 'last_name',
    last: 'last_name',
    fullname: 'full_name',
    tenantname: 'tenant_name',
    residentname: 'tenant_name',
    email: 'email',
    emailaddress: 'email',
    phone: 'phone',
    phonenumber: 'phone',
    cell: 'phone',
    mobile: 'phone',
    movein: 'move_in_date',
    moveindate: 'move_in_date',
    moveout: 'move_out_date',
    moveoutdate: 'move_out_date',
    leasestart: 'lease_start',
    startdate: 'lease_start',
    start: 'lease_start',
    leaseend: 'lease_end',
    enddate: 'lease_end',
    end: 'lease_end',
    expiration: 'lease_end',
    deposit: 'security_deposit',
    securitydeposit: 'security_deposit',
  };

  const target = aliases[h];
  if (target && schema.some((f) => f.name === target)) return target;

  for (const f of schema) {
    if (norm(f.name) === h) return f.name;
  }
  return null;
}
