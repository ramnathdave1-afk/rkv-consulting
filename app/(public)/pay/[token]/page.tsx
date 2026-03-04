'use client';

import React, { useState, useEffect, use } from 'react';
import { Building2, Calendar, CreditCard, Loader2, DollarSign, Clock, CheckCircle2 } from 'lucide-react';

interface PaymentInfo {
  tenantName: string;
  tenantEmail: string | null;
  amountDue: number;
  dueDate: string | null;
  propertyAddress: string;
  isRecurring: boolean;
  paymentHistory: { amount: number; payment_date: string; status: string; late_fee: number | null }[];
  landlordUserId: string;
  tenantId: string;
  propertyId: string;
}

export default function RentPaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tenant/payment-info/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error || 'Payment link not found');
        }
        return r.json();
      })
      .then(setInfo)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePay = async () => {
    if (!info) return;
    setPaying(true);
    try {
      const res = await fetch('/api/stripe/rent-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: info.amountDue,
          tenantName: info.tenantName,
          tenantEmail: info.tenantEmail,
          propertyAddress: info.propertyAddress,
          tenantId: info.tenantId,
          propertyId: info.propertyId,
          landlordUserId: info.landlordUserId,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to start checkout');
      }
    } catch {
      setError('Failed to start payment. Please try again.');
      setPaying(false);
    }
  };

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-2xl border border-slate-800 bg-[#111111] p-8">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Payment Link Invalid</h1>
            <p className="text-sm text-slate-400">{error || 'This payment link is no longer valid.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#c9a84c]">RKV CONSULTING</h1>
          <p className="text-sm text-slate-400 mt-1">Secure Rent Payment</p>
        </div>

        {/* Payment Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#111111] overflow-hidden">
          {/* Tenant & Property */}
          <div className="p-6 border-b border-slate-800">
            <p className="text-sm text-slate-400">Hello,</p>
            <p className="text-lg font-semibold text-white">{info.tenantName}</p>
            <div className="flex items-center gap-2 mt-3 text-sm text-slate-400">
              <Building2 className="w-4 h-4" />
              {info.propertyAddress}
            </div>
            {info.dueDate && (
              <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-400">
                <Calendar className="w-4 h-4" />
                Due: {new Date(info.dueDate).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="p-6 text-center border-b border-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Amount Due</p>
            <p className="text-4xl font-bold text-white">{fmt(info.amountDue)}</p>
          </div>

          {/* Pay Button */}
          <div className="p-6">
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full py-3.5 rounded-xl bg-[#c9a84c] text-black font-semibold text-base hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {paying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
              {paying ? 'Redirecting to checkout...' : 'Pay Now'}
            </button>
            <p className="text-xs text-slate-600 text-center mt-3">
              Secure payment powered by Stripe
            </p>
          </div>
        </div>

        {/* Payment History */}
        {info.paymentHistory.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-[#111111] overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">Payment History</h3>
            </div>
            <div className="divide-y divide-slate-800/50">
              {info.paymentHistory.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      p.status === 'paid' ? 'bg-green-500/10' : 'bg-amber-500/10'
                    }`}>
                      {p.status === 'paid' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">{fmt(p.amount)}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(p.payment_date).toLocaleDateString()}
                        {p.late_fee ? ` (+${fmt(p.late_fee)} late fee)` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === 'paid'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-600">
          Powered by RKV Consulting
        </p>
      </div>
    </div>
  );
}
