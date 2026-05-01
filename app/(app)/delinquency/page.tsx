'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Send,
  Phone,
  MessageSquare,
  CreditCard,
  ChevronDown,
  DollarSign,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input, SelectField } from '@/components/ui/Input';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import {
  getRentCollectionTier,
  RENT_REMINDER_FRIENDLY,
  RENT_REMINDER_FIRM,
  RENT_REMINDER_FINAL,
} from '@/lib/ai/prompts/rent-collection';

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

interface Stats {
  totalOutstanding: number;
  delinquentCount: number;
  avgDaysLate: number;
  collectionRate: number;
}

const RISK_BADGE_CLASS: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  high: 'bg-red-50 text-red-700 border border-red-200',
};

function riskFromDays(daysLate: number): 'low' | 'medium' | 'high' {
  if (daysLate <= 5) return 'low';
  if (daysLate <= 15) return 'medium';
  return 'high';
}

function RiskBadge({ daysLate }: { daysLate: number }) {
  const risk = riskFromDays(daysLate);
  const cls = RISK_BADGE_CLASS[risk];
  const label = risk.charAt(0).toUpperCase() + risk.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
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

export default function DelinquencyPage() {
  const [rows, setRows] = useState<DelinquentRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  const [actionRow, setActionRow] = useState<DelinquentRow | null>(null);
  const [actionOpen, setActionOpen] = useState(false);

  const [collectRow, setCollectRow] = useState<DelinquentRow | null>(null);
  const [collectChannels, setCollectChannels] = useState<('sms' | 'voice')[]>(['sms']);
  const [collectLoading, setCollectLoading] = useState(false);

  const [payRow, setPayRow] = useState<DelinquentRow | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [delinqRes, statsRes] = await Promise.all([
        fetch('/api/delinquency'),
        fetch('/api/delinquency/stats'),
      ]);

      if (delinqRes.ok) {
        const d = await delinqRes.json();
        setRows(d.rows || []);
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

  const propertyOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.property_name))).sort();
    return [
      { value: '', label: 'All Properties' },
      ...unique.map((p) => ({ value: p, label: p })),
    ];
  }, [rows]);

  const riskOptions = [
    { value: '', label: 'All Risk Levels' },
    { value: 'low', label: 'Low Risk (0-5d)' },
    { value: 'medium', label: 'Medium Risk (6-15d)' },
    { value: 'high', label: 'High Risk (16+d)' },
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
      if (riskFilter && riskFromDays(r.days_late) !== riskFilter) return false;
      return true;
    });
  }, [rows, search, propertyFilter, riskFilter]);

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
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  const totalOutstanding = stats?.totalOutstanding || 0;
  const delinquentCount = stats?.delinquentCount || 0;
  const avgDaysLate = stats?.avgDaysLate || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617]">Delinquency</h1>
          <p className="text-sm text-slate-500 mt-1">
            {delinquentCount} delinquent · ${totalOutstanding.toLocaleString()} outstanding · {avgDaysLate}d avg late
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1 md:max-w-sm">
          <Input
            placeholder="Search tenant, property, unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-full md:w-48">
          <SelectField
            options={propertyOptions}
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
          />
        </div>
        <div className="w-full md:w-44">
          <SelectField
            options={riskOptions}
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Property / Unit</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                <th className="px-3 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Days Late</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Risk</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Last Contact</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 text-sm">
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
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#020617] truncate max-w-[180px]">{row.tenant_name}</div>
                      {row.tenant_phone && (
                        <div className="text-xs text-slate-500 tabular-nums">{row.tenant_phone}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <div className="truncate max-w-[200px]">
                        {row.property_name}
                        <span className="text-slate-400"> / {row.unit_number}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-red-700">
                      {formatCurrency(row.balance)}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-[#020617] font-medium">{row.days_late}</td>
                    <td className="px-3 py-3"><RiskBadge daysLate={row.days_late} /></td>
                    <td className="px-3 py-3 text-xs text-slate-500 tabular-nums">
                      {row.last_action_date
                        ? new Date(row.last_action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => { setActionRow(row); setActionOpen(true); }}
                          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                        >
                          Actions <ChevronDown size={12} />
                        </button>
                        {actionOpen && actionRow?.id === row.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionOpen(false)} />
                            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                              <button
                                onClick={() => { setActionOpen(false); setCollectRow(row); setCollectChannels(['sms']); }}
                                className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                Send Collection
                              </button>
                              <button
                                onClick={() => { setActionOpen(false); setPayRow(row); setPayAmount(''); }}
                                className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                Record Payment
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collection Modal */}
      <Modal open={!!collectRow} onOpenChange={(open) => { if (!open) setCollectRow(null); }}>
        <ModalContent maxWidth="lg">
          <ModalHeader
            title="Trigger Collection"
            description={collectRow ? `${collectRow.tenant_name} — ${collectRow.property_name} / ${collectRow.unit_number}` : ''}
          />
          <div className="px-6 py-4 space-y-4">
            {collectRow && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Risk level:</span>
                <RiskBadge daysLate={collectRow.days_late} />
                <span className="text-xs text-slate-600">{collectRow.days_late} days late</span>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Channels</p>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleChannel('sms')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    collectChannels.includes('sms')
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare size={14} />
                  SMS
                </button>
                <button
                  onClick={() => toggleChannel('voice')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    collectChannels.includes('voice')
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Phone size={14} />
                  Voice
                </button>
              </div>
            </div>

            {collectRow && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Message Preview</p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 leading-relaxed max-h-40 overflow-y-auto">
                  {generateMessagePreview(collectRow)}
                </div>
              </div>
            )}

            {collectRow && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-500">Outstanding Balance</span>
                <span className="text-sm font-semibold text-red-700 tabular-nums">{formatCurrency(collectRow.balance)}</span>
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
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-500">Balance Remaining</span>
                <span className="text-sm font-semibold text-red-700 tabular-nums">{formatCurrency(payRow.balance)}</span>
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
              <p className="text-xs text-emerald-700">This will fully resolve the balance.</p>
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
