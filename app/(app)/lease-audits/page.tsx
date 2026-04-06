'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { KPICard } from '@/components/dashboard/KPICard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Play,
  ArrowLeft,
  AlertTriangle,
  DollarSign,
  ClipboardList,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  Search,
  TrendingUp,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SEVERITY_STYLES: Record<string, { color: string; variant: 'danger' | 'warning' | 'info' | 'success' }> = {
  critical: { color: '#EF4444', variant: 'danger' },
  high: { color: '#F97316', variant: 'warning' },
  medium: { color: '#EAB308', variant: 'warning' },
  low: { color: '#22C55E', variant: 'success' },
};

const TYPE_LABELS: Record<string, string> = {
  below_market_rent: 'Below Market Rent',
  missing_late_fees: 'Missing Late Fees',
  expired_lease: 'Expired Lease',
  missing_security_deposit: 'Missing Deposit',
};

const STATUS_BADGE: Record<string, { variant: 'success' | 'danger' | 'warning' | 'info' | 'muted' | 'accent'; label: string }> = {
  running: { variant: 'info', label: 'Running' },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'danger', label: 'Failed' },
};

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

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function LeaseAuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);

  // Detail view
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [findingsLoading, setFindingsLoading] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  /* ---------- Fetch audits list ---------- */
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

  /* ---------- Run new audit ---------- */
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

  /* ---------- Fetch audit detail ---------- */
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

  /* ---------- Update finding status ---------- */
  const updateFinding = async (findingId: string, newStatus: 'resolved' | 'dismissed' | 'open') => {
    if (!selectedAuditId) return;
    try {
      const res = await fetch(`/api/lease-audits/${selectedAuditId}/findings/${findingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update finding');
      // Update local state
      setFindings((prev) =>
        prev.map((f) =>
          f.id === findingId
            ? { ...f, status: newStatus, resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null }
            : f
        )
      );
      // Refresh audits list for updated counts
      fetchAudits();
    } catch (err) {
      console.error('Update finding error:', err);
    }
  };

  /* ---------- Computed KPIs ---------- */
  const totalAudits = audits.length;
  const openIssues = audits.reduce((sum, a) => sum + (a.status === 'completed' ? a.issues_found : 0), 0);
  const potentialRecovery = audits.reduce(
    (sum, a) => sum + (a.status === 'completed' ? a.potential_monthly_recovery : 0),
    0
  );

  /* ---------- Filtered findings ---------- */
  const filteredFindings = findings.filter((f) => {
    if (severityFilter && f.severity !== severityFilter) return false;
    if (typeFilter && f.finding_type !== typeFilter) return false;
    if (statusFilter && f.status !== statusFilter) return false;
    return true;
  });

  /* ---------------------------------------------------------------- */
  /*  RENDER: Detail view                                              */
  /* ---------------------------------------------------------------- */

  if (selectedAuditId && selectedAudit) {
    return (
      <div className="min-h-screen p-6 space-y-6 max-w-7xl mx-auto">
        {/* Back button + Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setSelectedAuditId(null); setSelectedAudit(null); setFindings([]); }}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Audits
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-text-primary">
              Audit — {new Date(selectedAudit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {selectedAudit.leases_scanned} leases scanned &middot; {findings.length} finding(s)
            </p>
          </div>
          <Badge variant={STATUS_BADGE[selectedAudit.status]?.variant || 'muted'} dot>
            {STATUS_BADGE[selectedAudit.status]?.label || selectedAudit.status}
          </Badge>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SelectField
              label="Severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              options={SEVERITY_OPTIONS}
            />
            <SelectField
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={TYPE_OPTIONS}
            />
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={FINDING_STATUS_OPTIONS}
            />
          </div>
        </motion.div>

        {/* Findings table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card overflow-hidden"
        >
          {findingsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="p-12 text-center text-text-muted">
              <Search size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No findings match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Severity</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Property</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Tenant</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Current</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Recommended</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right">Monthly Impact</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFindings.map((f) => {
                    const lease = f.leases;
                    const unit = lease?.units;
                    const tenant = lease?.tenants;
                    const property = unit?.properties;
                    const sev = SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.low;

                    return (
                      <tr key={f.id} className="hover:bg-bg-elevated/50 transition-colors">
                        <td className="px-4 py-3">
                          <Badge variant="accent" size="sm">
                            {TYPE_LABELS[f.finding_type] || f.finding_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge color={sev.color} size="sm" dot>
                            {f.severity}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                          {property?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                          {unit?.unit_number || '—'}
                        </td>
                        <td className="px-4 py-3 text-text-primary whitespace-nowrap">
                          {tenant ? `${tenant.first_name} ${tenant.last_name}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                          {f.description}
                        </td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                          {f.current_value || '—'}
                        </td>
                        <td className="px-4 py-3 text-accent whitespace-nowrap font-medium">
                          {f.recommended_value || '—'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">
                          {f.monthly_impact > 0 ? (
                            <span className="text-success">+${f.monthly_impact.toLocaleString()}/mo</span>
                          ) : (
                            <span className="text-text-muted">$0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {f.status === 'open' && <Badge variant="warning" size="sm" dot>Open</Badge>}
                          {f.status === 'resolved' && <Badge variant="success" size="sm" dot>Resolved</Badge>}
                          {f.status === 'dismissed' && <Badge variant="muted" size="sm" dot>Dismissed</Badge>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {f.status === 'open' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => updateFinding(f.id, 'resolved')}
                                className="flex items-center gap-1 text-xs font-medium text-success hover:text-green-400 transition-colors px-2 py-1 rounded-md hover:bg-success-muted"
                                title="Resolve"
                              >
                                <CheckCircle2 size={14} />
                                Resolve
                              </button>
                              <button
                                onClick={() => updateFinding(f.id, 'dismissed')}
                                className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-md hover:bg-bg-elevated"
                                title="Dismiss"
                              >
                                <XCircle size={14} />
                                Dismiss
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => updateFinding(f.id, 'open')}
                              className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-accent transition-colors px-2 py-1 rounded-md hover:bg-bg-elevated ml-auto"
                              title="Reopen"
                            >
                              <RotateCcw size={14} />
                              Reopen
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
        </motion.div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  RENDER: Audits list view                                         */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck size={24} className="text-accent" />
            Lease Audits
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Automated lease compliance scanning and revenue recovery
          </p>
        </div>
        <Button
          onClick={handleRunAudit}
          loading={runningAudit}
          icon={<Play size={16} />}
        >
          {runningAudit ? 'Running Audit...' : 'Run New Audit'}
        </Button>
      </motion.div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            title="Total Audits Run"
            value={String(totalAudits)}
            numericValue={totalAudits}
            format="number"
            icon={ClipboardList}
            color="#3B82F6"
            index={0}
          />
          <KPICard
            title="Open Issues"
            value={String(openIssues)}
            numericValue={openIssues}
            format="number"
            icon={AlertTriangle}
            color="#F59E0B"
            index={1}
          />
          <KPICard
            title="Potential Monthly Recovery"
            value={`$${potentialRecovery.toLocaleString()}`}
            numericValue={potentialRecovery}
            format="currency"
            icon={TrendingUp}
            color="#00D4AA"
            index={2}
          />
        </div>
      )}

      {/* Audits list */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Audit History</h2>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : audits.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No audits yet. Run your first audit to scan for issues.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {audits.map((audit, i) => {
              const sb = STATUS_BADGE[audit.status] || { variant: 'muted' as const, label: audit.status };
              return (
                <motion.button
                  key={audit.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => openAudit(audit)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-elevated/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className="min-w-[120px]">
                      <p className="text-sm font-medium text-text-primary">
                        {new Date(audit.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-text-muted">
                        {new Date(audit.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-text-secondary">
                      <span>{audit.leases_scanned} leases</span>
                      <span className={audit.issues_found > 0 ? 'text-warning font-medium' : ''}>
                        {audit.issues_found} issue{audit.issues_found !== 1 ? 's' : ''}
                      </span>
                      {audit.potential_monthly_recovery > 0 && (
                        <span className="text-success font-medium">
                          +${audit.potential_monthly_recovery.toLocaleString()}/mo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={sb.variant} size="sm" dot>
                      {sb.label}
                    </Badge>
                    <ChevronRight
                      size={16}
                      className="text-text-muted group-hover:text-accent transition-colors"
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
