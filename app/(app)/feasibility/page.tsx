'use client';

import React, { useState } from 'react';
import {
  Search,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Vertical } from '@/lib/types';

interface FeasibilityDimension {
  name: string;
  status: 'pass' | 'conditional' | 'fail';
  score: number;
  details: string;
}

interface FeasibilityResult {
  overall_verdict: 'feasible' | 'conditional' | 'infeasible';
  overall_score: number;
  dimensions: FeasibilityDimension[];
  summary: string;
  recommendations: string[];
  analyzed_at: string;
}

const VERTICALS: { id: Vertical; label: string }[] = [
  { id: 'data_center', label: 'Data Center' },
  { id: 'solar', label: 'Solar Farm' },
  { id: 'wind', label: 'Wind Farm' },
  { id: 'ev_charging', label: 'EV Charging' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'residential', label: 'Residential' },
  { id: 'mixed_use', label: 'Mixed Use' },
];

const STATUS_ICONS = {
  pass: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  conditional: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  fail: { icon: XCircle, color: 'text-danger', bg: 'bg-danger/10' },
};

const VERDICT_CONFIG = {
  feasible: { label: 'Feasible', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  conditional: { label: 'Conditionally Feasible', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  infeasible: { label: 'Not Feasible', color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/20' },
};

export default function FeasibilityPage() {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [vertical, setVertical] = useState<Vertical>('data_center');
  const [acreage, setAcreage] = useState('');
  const [capacity, setCapacity] = useState('');
  const [state, setState] = useState('AZ');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeasibilityResult | null>(null);
  const [error, setError] = useState('');

  async function runAnalysis(e: React.FormEvent) {
    e.preventDefault();
    if (!lat || !lng) {
      setError('Coordinates are required');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/feasibility/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          state,
          vertical,
          acreage: acreage ? parseFloat(acreage) : undefined,
          capacity: capacity ? parseFloat(capacity) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Analysis failed');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setError('Failed to connect to analysis service');
    }
    setLoading(false);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-lg font-bold text-text-primary">Feasibility Analyzer</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Can I build here? Enter coordinates and intended use for instant AI analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Input Form */}
        <div className="glass-card p-4 space-y-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Analysis Parameters</p>

          <form onSubmit={runAnalysis} className="space-y-3">
            {error && (
              <div className="rounded-lg bg-danger-muted px-3 py-2 text-xs text-danger">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-text-muted">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="33.4484"
                  required
                  className="w-full mt-0.5 rounded border border-border bg-bg-primary px-2 py-1.5 text-xs font-mono text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-112.0740"
                  required
                  className="w-full mt-0.5 rounded border border-border bg-bg-primary px-2 py-1.5 text-xs font-mono text-text-primary outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-text-muted">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="AZ"
                className="w-full mt-0.5 rounded border border-border bg-bg-primary px-2 py-1.5 text-xs font-mono text-text-primary outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-[10px] text-text-muted">Intended Use</label>
              <select
                value={vertical}
                onChange={(e) => setVertical(e.target.value as Vertical)}
                className="w-full mt-0.5 rounded border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
              >
                {VERTICALS.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-text-muted">Acreage (optional)</label>
                <input
                  type="number"
                  value={acreage}
                  onChange={(e) => setAcreage(e.target.value)}
                  placeholder="100"
                  className="w-full mt-0.5 rounded border border-border bg-bg-primary px-2 py-1.5 text-xs font-mono text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted">Target MW (optional)</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="50"
                  className="w-full mt-0.5 rounded border border-border bg-bg-primary px-2 py-1.5 text-xs font-mono text-text-primary outline-none focus:border-accent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <><Loader2 size={12} className="animate-spin" /> Analyzing...</>
              ) : (
                <><Search size={12} /> Run Feasibility Analysis</>
              )}
            </button>
          </form>

          {/* Quick presets */}
          <div>
            <p className="text-[10px] text-text-muted mb-1">Quick Presets</p>
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'Phoenix DC', lat: '33.4484', lng: '-112.0740', state: 'AZ', vertical: 'data_center' as Vertical, acreage: '80' },
                { label: 'Mesa Solar', lat: '33.4152', lng: '-111.8315', state: 'AZ', vertical: 'solar' as Vertical, acreage: '200' },
                { label: 'Goodyear EV', lat: '33.4353', lng: '-112.3577', state: 'AZ', vertical: 'ev_charging' as Vertical, acreage: '2' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setLat(preset.lat);
                    setLng(preset.lng);
                    setState(preset.state);
                    setVertical(preset.vertical);
                    setAcreage(preset.acreage);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated/80 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-3">
          {!result && !loading && (
            <div className="glass-card p-12 text-center">
              <MapPin size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-secondary">Enter coordinates and select an intended use</p>
              <p className="text-xs text-text-muted mt-1">
                The AI will cross-reference zoning, environmental, grid access, and infrastructure data
              </p>
            </div>
          )}

          {loading && (
            <div className="glass-card p-12 text-center">
              <Loader2 size={32} className="text-accent mx-auto mb-3 animate-spin" />
              <p className="text-sm text-text-secondary">Analyzing feasibility...</p>
              <p className="text-xs text-text-muted mt-1">
                Cross-referencing zoning, environmental, grid, and infrastructure data
              </p>
            </div>
          )}

          {result && (
            <>
              {/* Verdict Card */}
              <div className={cn('glass-card p-4 border', VERDICT_CONFIG[result.overall_verdict].border)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex items-center justify-center h-12 w-12 rounded-xl', VERDICT_CONFIG[result.overall_verdict].bg)}>
                      <span className={cn('text-xl font-display font-bold', VERDICT_CONFIG[result.overall_verdict].color)}>
                        {result.overall_score}
                      </span>
                    </div>
                    <div>
                      <p className={cn('text-sm font-bold', VERDICT_CONFIG[result.overall_verdict].color)}>
                        {VERDICT_CONFIG[result.overall_verdict].label}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {result.dimensions.filter((d) => d.status === 'pass').length}/{result.dimensions.length} dimensions pass
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-secondary mt-3">{result.summary}</p>
              </div>

              {/* Dimension Breakdown */}
              <div className="glass-card p-4 space-y-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Dimension Analysis</p>

                {result.dimensions.map((dim) => {
                  const conf = STATUS_ICONS[dim.status];
                  const Icon = conf.icon;
                  return (
                    <div key={dim.name} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className={cn('flex items-center justify-center h-6 w-6 rounded-lg shrink-0 mt-0.5', conf.bg)}>
                        <Icon size={12} className={conf.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-text-primary">{dim.name}</p>
                          <span className={cn('text-xs font-mono font-bold', conf.color)}>{dim.score}/100</span>
                        </div>
                        <p className="text-[10px] text-text-secondary mt-0.5">{dim.details}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="glass-card p-4 space-y-2">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">Recommendations</p>
                  <ul className="space-y-1.5">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                        <span className="text-accent mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
