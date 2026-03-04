'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="rounded-2xl border border-slate-800 bg-[#111111] p-8">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Successful</h1>
          <p className="text-sm text-slate-400 mb-6">
            Your rent payment has been received. A confirmation will be sent to your email.
          </p>
          <p className="text-xs text-slate-600">
            Powered by RKV Consulting
          </p>
        </div>
      </div>
    </div>
  );
}
