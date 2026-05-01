'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Input';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Play,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  Search,
} from 'lucide-react';

interface Audit {
  id: string;
  status: string;
  leases_scanned: number;
  issues_found: number;
  potential_monthly_recovery: number;
  created_at: string;
  completed_at: string | null;
}

interface Finding {
  id: string;
  lease_audit_id: string;
  lease_id: string;
  finding_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  current_value: string | null;
  recommended_value: string | null;
  monthly_impact: number;
  status: 'open' | 'resolved' | 'dismissed';
  resolved_at: string | null;
  leases: {
    id: string;
    monthly_rent: number;
    lease_start: string;
    lease_end: string;
    units: { unit_number: string; properties: { name: string } | null } | null;
    tenants: { first_name: string; last_name: string } | null;
  } | null;
}

const TYPE_LABELS: Record<string, string> = {
  below_market_rent: 'Below Market Rent',
  missing_late_fees: 'Missing Late Fees',
  expired_lease: 'Expired Lease',
  missing_security_deposit: 'Missing Deposit',
};

const SEVERITY_BADGE_CLASS: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border border-red-200 animate-pulse',
  high: 'bg-red-50 text-red-700 border border-red-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  running: 'bg-sky-50 text-sky-700 border border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  failed: 'bg-red-50 text-red-700 border border-red-200',
  open: 'bg-red-50 text-red-700 border border-red-200',
  resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  dismissed: 'bg-slate-100 text-slate-700 border border-slate-200',
};

function StatusBadgeOps({ status }: { status: string; }) {
  const cls = STATUS_BADGE_CLASS[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize whitespace-nowrap ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string; }) {
  const cls = SEVERITY_BADGE_CLASS[severity] || 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap ${cls}`}>
      {severity}
    </span>
  );
}

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'below_market_rent', label: 'Below Market Rent' },
  { value: 'missing_late_fees', label: 'Missing Late Fees' },
  { value: 'expired_lease', label: 'Expired Lease' },
  { value: 'missing_security_deposit', label: 'Missing Deposit' },
];

const FINDING_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

export default function LeaseAuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);

  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [findingsLoading, setFindingsLoading] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);

  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAudits = useCallback(async () => {
    try {
      const res = await fetch('/api/lease-audits');
      if (!res.ok) throw new Error('Failed to fetch audits');
      const json = await res.json();
      setAudits(json.audits || []);
    } catch (err) {
      console.error('Audit fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const handleRunAudit = async () => {
    setRunningAudit(true);
    try {
      const res = await fetch('/api/lease-audits', { method: 'POST' });
      if (!res.ok) throw new Error('Audit failed');
      await fetchAudits();
    } catch (err) {
      console.error('Run audit error:', err);
    } finally {
      setRunningAudit(false);
    }
  };

  const openAudit = async (audit: Audit) => {
    setSelectedAuditId(audit.id);
    setSelectedAudit(audit);
    setFindingsLoading(true);
    setSeverityFilter('');
    setTypeFilter('');
    setStatusFilter('');
    try {
      const res = await fetch(`/api/lease-audits/${audit.id}`);
      if (!res.ok) throw new Error('Failed to fetch findings');
      const json = await res.json();
      setFindings(json.findings || []);
    } catch (err) {
      console.error('Findings fetch error:', err);
    } finally {
      setFindingsLoading(false);
    }
  };

  const updateFinding = async (findingId: string, newStatus: 'resolved' | 'dismissed' | 'open') => {
    if (!selectedAuditId) return;
    try {
      const res = await fetch(`/api/lease-audits/${selectedAuditId}/findings/${findingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update finding');
      setFindings((prev) =>
        prev.map((f) =>
          f.id === findingId
            ? { ...f, status: newStatus, resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null }
            : f,
        ),
      );
      fetchAudits();
    } catch (err) {
      console.error('Update finding error:', err);
    }
  };

  const totalAudits = audits.length;
  const openIssues = audits.reduce((sum, a) => sum + (a.status === 'completed' ? a.issues_found : 0), 0);
  const potentialRecovery = audits.reduce(
    (sum, a) => sum + (a.status === 'completed' ? a.potential_monthly_recovery : 0),
    0,
  );

  const filteredFindings = findings.filter((f) => {
    if (severityFilter && f.severity !== severityFilter) return false;
    if (typeFilter && f.finding_type !== typeFilter) return false;
    if (statusFilter && f.status !== statusFilter) return false;
    return true;
  });

  /* Detail view */
  if (selectedAuditId && selectedAudit) {
    return (
      <div className="min-h-screen p-6 space-y-6 max-w-7xl mx-auto">
        <button
          onClick={() => { setSelectedAuditId(null); setSelectedAudit(null); setFindings([]); }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#020617] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Audits
        </button>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#020617]">
              Audit — {new Date(selectedAudit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {selectedAudit.leases_scanned} leases scanned · {findings.length} finding{findings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <StatusBadgeOps status={selectedAudit.status} />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-full md:w-44">
            <SelectField value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} options={SEVERITY_OPTIONS} />
          </div>
          <div className="w-full md:w-52">
            <SelectField value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={TYPE_OPTIONS} />
          </div>
          <div className="w-full md:w-44">
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={FINDING_STATUS_OPTIONS} />
          </div>
        </div>

        {/* Findings table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {findingsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Search size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No findings match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Property / Unit</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Monthly Impact</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFindings.map((f) => {
                    const lease = f.leases;
                    const unit = lease?.units;
                    const tenant = lease?.tenants;
                    const property = unit?.properties;
                    return (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-[#020617] font-medium text-xs whitespace-nowrap">
                          {TYPE_LABELS[f.finding_type] || f.finding_type}
                        </td>
                        <td className="px-3 py-3"><SeverityBadge severity={f.severity} /></td>
                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                          {property?.name || '—'}
                          {unit?.unit_number ? <span className="text-slate-400"> / {unit.unit_number}</span> : ''}
                        </td>
                        <td className="px-3 py-3 text-[#020617] whitespace-nowrap">
                          {tenant ? `${tenant.first_name} ${tenant.last_name}` : '—'}
                        </td>
                        <td className="px-3 py-3 text-slate-600 max-w-xs truncate">{f.description}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap font-semibold tabular-nums">
                          {f.monthly_impact > 0 ? (
                            <span className="text-emerald-700">+${f.monthly_impact.toLocaleString()}/mo</span>
                          ) : (
                            <span className="text-slate-400">$0</span>
                          )}
                        </td>
                        <td className="px-3 py-3"><StatusBadgeOps status={f.status} /></td>
                        <td className="px-3 py-3 text-right">
                          {f.status === 'open' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => updateFinding(f.id, 'resolved')}
                                className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded-md hover:bg-emerald-50"
                              >
                                <CheckCircle2 size={14} /> Resolve
                              </button>
                              <button
                                onClick={() => updateFinding(f.id, 'dismissed')}
                                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100"
                              >
                                <XCircle size={14} /> Dismiss
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => updateFinding(f.id, 'open')}
                              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#020617] px-2 py-1 rounded-md hover:bg-slate-100 ml-auto"
                            >
                              <RotateCcw size={14} /> Reopen
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* List view */
  return (
    <div className="min-h-screen p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617]">Lease Audits</h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalAudits} audit{totalAudits !== 1 ? 's' : ''} run · {openIssues} open issue{openIssues !== 1 ? 's' : ''} · ${potentialRecovery.toLocaleString()}/mo potential recovery
          </p>
        </div>
        <Button onClick={handleRunAudit} loading={runningAudit} icon={<Play size={16} />}>
          {runningAudit ? 'Running Audit...' : 'Run New Audit'}
        </Button>
      </div>

      {/* Audit history table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-[#020617]">Audit History</h2>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : audits.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldCheck size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No audits yet. Run your first audit to scan for issues.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Leases Scanned</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Issues Found</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Recovery</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audits.map((audit, i) => (
                  <motion.tr
                    key={audit.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => openAudit(audit)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-[#020617]">
                        {new Date(audit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {new Date(audit.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600 tabular-nums">{audit.leases_scanned}</td>
                    <td className={`px-3 py-3 text-right tabular-nums font-medium ${audit.issues_found > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {audit.issues_found}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">
                      {audit.potential_monthly_recovery > 0 ? (
                        <span className="text-emerald-700">+${audit.potential_monthly_recovery.toLocaleString()}/mo</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3"><StatusBadgeOps status={audit.status} /></td>
                    <td className="px-3 py-3">
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
