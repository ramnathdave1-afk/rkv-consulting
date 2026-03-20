'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Property {
  id: string;
  name: string;
}

interface GenerateReportModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

export function GenerateReportModal({ open, onClose, onGenerated }: GenerateReportModalProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [reportType, setReportType] = useState('monthly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ pdf_url: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!open) return;
    async function fetchProperties() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;
      const { data } = await supabase.from('properties').select('id, name').eq('org_id', profile.org_id).order('name');
      setProperties((data as Property[]) || []);
      if (data?.[0]) setPropertyId(data[0].id);

      // Default to current month
      const now = new Date();
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
      setPeriodStart(start);
      setPeriodEnd(end);
    }
    fetchProperties();
  }, [open, supabase]);

  async function handleGenerate() {
    if (!propertyId || !periodStart || !periodEnd) return;
    setGenerating(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, report_type: reportType, period_start: periodStart, period_end: periodEnd }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to generate report');
      } else {
        const data = await res.json();
        setResult({ pdf_url: data.pdf_url });
        onGenerated();
      }
    } catch {
      setError('Network error');
    }
    setGenerating(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="rounded-xl border border-border bg-bg-secondary p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">Generate Owner Report</h2>
                <button onClick={onClose} className="p-1 rounded hover:bg-bg-elevated"><X size={16} className="text-text-muted" /></button>
              </div>

              {result ? (
                <div className="text-center py-4">
                  <FileText size={32} className="mx-auto text-accent mb-3" />
                  <p className="text-sm font-medium text-text-primary mb-2">Report Generated!</p>
                  {result.pdf_url && (
                    <a href={result.pdf_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">Download PDF</a>
                  )}
                  <button onClick={onClose} className="block mx-auto mt-4 text-xs text-text-muted hover:text-text-primary">Close</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Property</label>
                    <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none">
                      {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Report Type</label>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none">
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Period Start</label>
                      <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Period End</label>
                      <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none" />
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-500">{error}</p>}

                  <button
                    onClick={handleGenerate}
                    disabled={generating || !propertyId}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
                  >
                    {generating ? <><Loader2 size={14} className="animate-spin" />Generating...</> : <>Generate Report</>}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
