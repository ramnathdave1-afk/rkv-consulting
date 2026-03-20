'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

type Entity = 'properties' | 'units' | 'tenants' | 'leases';

interface ImportResult {
  entity: string;
  total_rows: number;
  created: number;
  skipped: number;
  errors: { row: number; messages: string[] }[];
}

const entities: { value: Entity; label: string; description: string; order: number }[] = [
  { value: 'properties', label: 'Properties', description: 'Import buildings and complexes', order: 1 },
  { value: 'units', label: 'Units', description: 'Import individual units (requires properties first)', order: 2 },
  { value: 'tenants', label: 'Tenants', description: 'Import residents and prospects', order: 3 },
  { value: 'leases', label: 'Leases', description: 'Import lease agreements (requires units + tenants first)', order: 4 },
];

const sampleHeaders: Record<Entity, string> = {
  properties: 'name,address,city,state,zip,type,units,year_built',
  units: 'property_name,unit_number,bedrooms,bathrooms,sqft,rent,status',
  tenants: 'first_name,last_name,email,phone,status,move_in_date',
  leases: 'tenant_name,unit_number,property_name,lease_start,lease_end,monthly_rent,status',
};

export default function ImportPage() {
  const [selectedEntity, setSelectedEntity] = useState<Entity>('properties');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity', selectedEntity);

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ entity: selectedEntity, total_rows: 0, created: 0, skipped: 0, errors: [{ row: 0, messages: ['Upload failed'] }] });
    }
    setUploading(false);
  }

  function downloadTemplate() {
    const csv = sampleHeaders[selectedEntity] + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEntity}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Import Data</h1>
        <p className="text-sm text-text-secondary">Bulk import from CSV files exported from your PM platform.</p>
      </div>

      {/* Import order guide */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Import Order</h3>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          {entities.map((e, i) => (
            <React.Fragment key={e.value}>
              <span className={`px-2 py-1 rounded-lg ${selectedEntity === e.value ? 'bg-accent/10 text-accent font-medium' : ''}`}>
                {e.order}. {e.label}
              </span>
              {i < entities.length - 1 && <ArrowRight size={12} className="text-text-muted" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Entity selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {entities.map((e) => (
          <button
            key={e.value}
            onClick={() => { setSelectedEntity(e.value); setFile(null); setResult(null); }}
            className={`p-3 rounded-lg border text-left transition-colors ${
              selectedEntity === e.value ? 'border-accent bg-accent/5' : 'border-border hover:border-border-hover'
            }`}
          >
            <p className="text-sm font-medium text-text-primary">{e.label}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{e.description}</p>
          </button>
        ))}
      </div>

      {/* File upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="glass-card p-8 border-2 border-dashed border-border hover:border-accent/50 cursor-pointer transition-colors text-center"
      >
        <Upload size={32} className="mx-auto text-text-muted mb-3" />
        {file ? (
          <div>
            <p className="text-sm font-medium text-text-primary">{file.name}</p>
            <p className="text-xs text-text-muted mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-text-secondary">Click to upload a CSV file</p>
            <p className="text-xs text-text-muted mt-1">or drag and drop</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {uploading ? 'Importing...' : `Import ${selectedEntity}`}
        </button>
        <button onClick={downloadTemplate} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors">
          <FileText size={14} className="inline mr-1.5" />
          Download Template
        </button>
      </div>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            {result.created > 0 ? (
              <CheckCircle2 size={18} className="text-green-500" />
            ) : (
              <AlertTriangle size={18} className="text-yellow-500" />
            )}
            <h3 className="text-sm font-semibold text-text-primary">Import Results</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{result.created}</p>
              <p className="text-[10px] text-text-muted uppercase">Created</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{result.skipped}</p>
              <p className="text-[10px] text-text-muted uppercase">Skipped</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-text-secondary">{result.total_rows}</p>
              <p className="text-[10px] text-text-muted uppercase">Total Rows</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-text-muted">Errors:</p>
              {result.errors.map((err, i) => (
                <div key={i} className="text-xs text-red-400 bg-red-500/5 rounded px-2 py-1">
                  Row {err.row}: {err.messages.join(', ')}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Column reference */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Expected Columns for {selectedEntity}</h3>
        <code className="text-xs text-accent bg-accent/5 rounded px-2 py-1 block">
          {sampleHeaders[selectedEntity]}
        </code>
        <p className="text-[10px] text-text-muted mt-2">
          Column names are flexible — we recognize common variations from AppFolio, Buildium, and other platforms.
        </p>
      </div>
    </div>
  );
}
