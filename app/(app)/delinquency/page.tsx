'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  Search,
  Send,
  Phone,
  MessageSquare,
  CreditCard,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SelectField } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import {
  getRentCollectionTier,
  RENT_REMINDER_FRIENDLY,
  RENT_REMINDER_FIRM,
  RENT_REMINDER_FINAL,
} from '@/lib/ai/prompts/rent-collection';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DelinquentRow {
  id: string;
  tenant_name: string;
  tenant_id: string;
  tenant_phone: string;
  property_name: string;
  property_id: string;
  unit_number: string;
  amount_due: number;
  amount_paid: number;
  balance: number;
  days_late: number;
  late_fee: number;
  status: string;
  due_date: string;
  last_action_date: string | null;
}

interface AgingBucket {
  name: string;
  amount: number;
}

interface Stats {
  totalOutstanding: number;
  delinquentCount: number;
  avgDaysLate: number;
  collectionRate: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const BUCKET_COLORS = ['#00D4AA', '#F59E0B', '#EF4444', '#8A00FF'];

function tierBadge(daysLate: number) {
  const tier = getRentCollectionTier(daysLate);
  const map: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
    friendly: { variant: 'success', label: 'Friendly' },
    firm: { variant: 'warning', label: 'Firm' },
    final: { variant: 'danger', label: 'Final' },
  };
  const { variant, label } = map[tier];
  return <Badge variant={variant} dot size="sm">{label}</Badge>;
}

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateMessagePreview(row: DelinquentRow): string {
  const tier = getRentCollectionTier(row.days_late);
  const amountStr = formatCurrency(row.balance);
  const lateFeeStr = formatCurrency(row.late_fee);
  const totalDue = formatCurrency(row.balance + row.late_fee);

  switch (tier) {
    case 'friendly':
      return RENT_REMINDER_FRIENDLY(row.tenant_name, amountStr, row.due_date, row.unit_number);
    case 'firm':
      return RENT_REMINDER_FIRM(row.tenant_name, amountStr, row.days_late, row.unit_number, lateFeeStr);
    case 'final':
      return RENT_REMINDER_FINAL(row.tenant_name, amountStr, totalDue, row.unit_number, row.days_late);
  }
}

/* ------------------------------------------------------------------ */
/* Custom Tooltip for Recharts                                         */
/* ------------------------------------------------------------------ */

function AgingTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-secondary border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function DelinquencyPage() {
  const [rows, setRows] = useState<DelinquentRow[]>([]);
  const [buckets, setBuckets] = useState<AgingBucket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // Collect modal
  const [collectRow, setCollectRow] = useState<DelinquentRow | null>(null);
  const [collectChannels, setCollectChannels] = useState<('sms' | 'voice')[]>(['sms']);
  const [collectLoading, setCollectLoading] = useState(false);

  // Record payment modal
  const [payRow, setPayRow] = useState<DelinquentRow | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  /* ---- Data Fetching ---- */

  const fetchAll = useCallback(async () => {
    try {
      const [delinqRes, statsRes] = await Promise.all([
        fetch('/api/delinquency'),
        fetch('/api/delinquency/stats'),
      ]);

      if (delinqRes.ok) {
        const d = await delinqRes.json();
        setRows(d.rows || []);
        setBuckets(d.agingBuckets || []);
      }

      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
    } catch (err) {
      console.error('Delinquency fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ---- Derived Data ---- */

  const propertyOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.property_name))).sort();
    return [
      { value: '', label: 'All Properties' },
      ...unique.map((p) => ({ value: p, label: p })),
    ];
  }, [rows]);

  const tierOptions = [
    { value: '', label: 'All Tiers' },
    { value: 'friendly', label: 'Friendly (0-5d)' },
    { value: 'firm', label: 'Firm (6-15d)' },
    { value: 'final', label: 'Final (16+d)' },
  ];

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          r.tenant_name.toLowerCase().includes(q) ||
          r.property_name.toLowerCase().includes(q) ||
          r.unit_number.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (propertyFilter && r.property_name !== propertyFilter) return false;
      if (tierFilter) {
        const tier = getRentCollectionTier(r.days_late);
        if (tier !== tierFilter) return false;
      }
      return true;
    });
  }, [rows, search, propertyFilter, tierFilter]);

  /* ---- Actions ---- */

  async function handleCollect() {
    if (!collectRow) return;
    setCollectLoading(true);
    try {
      const res = await fetch('/api/delinquency/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentPaymentId: collectRow.id,
          channels: collectChannels,
        }),
      });
      if (res.ok) {
        setCollectRow(null);
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Collection failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCollectLoading(false);
    }
  }

  async function handleRecordPayment() {
    if (!payRow || !payAmount) return;
    setPayLoading(true);
    try {
      const res = await fetch(`/api/delinquency/${payRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paid: parseFloat(payAmount) }),
      });
      if (res.ok) {
        setPayRow(null);
        setPayAmount('');
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record payment');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPayLoading(false);
    }
  }

  function toggleChannel(ch: 'sms' | 'voice') {
    setCollectChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Delinquency</h1>
          <p className="text-sm text-text-secondary">Rent collection and delinquent account management</p>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-[#F59E0B]" />
          <span className="text-[10px] text-text-muted uppercase tracking-wider">
            {filteredRows.length} Account{filteredRows.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Outstanding"
            value={formatCurrency(stats.totalOutstanding)}
            numericValue={stats.totalOutstanding}
            format="currency"
            prefix="$"
            icon={DollarSign}
            color="#EF4444"
            index={0}
          />
          <KPICard
            title="Delinquent Accounts"
            value={stats.delinquentCount}
            numericValue={stats.delinquentCount}
            icon={Users}
            color="#F59E0B"
            index={1}
          />
          <KPICard
            title="Avg Days Late"
            value={stats.avgDaysLate}
            numericValue={stats.avgDaysLate}
            icon={Clock}
            color="#8A00FF"
            index={2}
          />
          <KPICard
            title="Collection Rate"
            value={`${stats.collectionRate}%`}
            numericValue={stats.collectionRate}
            format="percentage"
            suffix="%"
            icon={TrendingUp}
            color="#00D4AA"
            index={3}
          />
        </div>
      )}

      {/* Aging Buckets Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
        className="glass-card p-4"
      >
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">
          Aging Buckets
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#8B95A5', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8B95A5', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<AgingTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {buckets.map((_, i) => (
                  <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Search tenant, property, unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-48">
          <SelectField
            options={propertyOptions}
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
          />
        </div>
        <div className="w-44">
          <SelectField
            options={tierOptions}
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          />
        </div>
        {(search || propertyFilter || tierFilter) && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Filter size={12} />}
            onClick={() => { setSearch(''); setPropertyFilter(''); setTierFilter(''); }}
          >
            Clear
          </Button>
        )}
      </motion.div>

      {/* Delinquent Accounts Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.36 }}
        className="glass-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Tenant</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Property / Unit</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Due</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Paid</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Balance</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Days Late</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Tier</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Last Action</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-text-muted text-sm">
                    {rows.length === 0 ? 'No delinquent accounts found.' : 'No accounts match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">{row.tenant_name}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {row.property_name} <span className="text-text-muted">/ {row.unit_number}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">{formatCurrency(row.amount_due)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{formatCurrency(row.amount_paid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-danger">{formatCurrency(row.balance)}</td>
                    <td className="px-4 py-3 text-center text-text-primary font-mono">{row.days_late}</td>
                    <td className="px-4 py-3 text-center">{tierBadge(row.days_late)}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {row.last_action_date
                        ? new Date(row.last_action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Send size={12} />}
                          onClick={() => { setCollectRow(row); setCollectChannels(['sms']); }}
                        >
                          Collect
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<CreditCard size={12} />}
                          onClick={() => { setPayRow(row); setPayAmount(''); }}
                        >
                          Pay
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Collection Modal */}
      <Modal open={!!collectRow} onOpenChange={(open) => { if (!open) setCollectRow(null); }}>
        <ModalContent maxWidth="lg">
          <ModalHeader
            title="Trigger Collection"
            description={collectRow ? `${collectRow.tenant_name} — ${collectRow.property_name} / ${collectRow.unit_number}` : ''}
          />
          <div className="px-6 py-4 space-y-4">
            {/* Tier info */}
            {collectRow && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">Escalation tier:</span>
                {tierBadge(collectRow.days_late)}
                <span className="text-xs text-text-secondary">{collectRow.days_late} days late</span>
              </div>
            )}

            {/* Channel selector */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">Channels</p>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleChannel('sms')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    collectChannels.includes('sms')
                      ? 'border-[#00D4AA] bg-[#00D4AA]/10 text-[#00D4AA]'
                      : 'border-border text-text-muted hover:border-border-hover'
                  }`}
                >
                  <MessageSquare size={14} />
                  SMS
                </button>
                <button
                  onClick={() => toggleChannel('voice')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    collectChannels.includes('voice')
                      ? 'border-[#00D4AA] bg-[#00D4AA]/10 text-[#00D4AA]'
                      : 'border-border text-text-muted hover:border-border-hover'
                  }`}
                >
                  <Phone size={14} />
                  Voice
                </button>
              </div>
            </div>

            {/* Message preview */}
            {collectRow && (
              <div>
                <p className="text-xs font-medium text-text-secondary mb-2">Message Preview</p>
                <div className="bg-bg-primary border border-border rounded-lg p-3 text-xs text-text-secondary leading-relaxed max-h-40 overflow-y-auto">
                  {generateMessagePreview(collectRow)}
                </div>
              </div>
            )}

            {/* Balance summary */}
            {collectRow && (
              <div className="flex items-center justify-between bg-bg-primary border border-border rounded-lg px-3 py-2">
                <span className="text-xs text-text-muted">Outstanding Balance</span>
                <span className="text-sm font-semibold text-danger">{formatCurrency(collectRow.balance)}</span>
              </div>
            )}
          </div>
          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setCollectRow(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={collectLoading}
              disabled={collectChannels.length === 0}
              icon={<Send size={12} />}
              onClick={handleCollect}
            >
              Send Collection
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={!!payRow} onOpenChange={(open) => { if (!open) setPayRow(null); }}>
        <ModalContent maxWidth="sm">
          <ModalHeader
            title="Record Payment"
            description={payRow ? `${payRow.tenant_name} — ${payRow.property_name} / ${payRow.unit_number}` : ''}
          />
          <div className="px-6 py-4 space-y-4">
            {payRow && (
              <div className="flex items-center justify-between bg-bg-primary border border-border rounded-lg px-3 py-2">
                <span className="text-xs text-text-muted">Balance Remaining</span>
                <span className="text-sm font-semibold text-danger">{formatCurrency(payRow.balance)}</span>
              </div>
            )}
            <Input
              label="Payment Amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              icon={<DollarSign size={14} />}
            />
            {payRow && payAmount && parseFloat(payAmount) >= payRow.balance && (
              <p className="text-xs text-success">This will fully resolve the balance.</p>
            )}
          </div>
          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setPayRow(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={payLoading}
              disabled={!payAmount || parseFloat(payAmount) <= 0}
              icon={<CreditCard size={12} />}
              onClick={handleRecordPayment}
            >
              Record Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
