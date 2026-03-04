'use client';

import React from 'react';
import CompsPanel from '@/components/comps/CompsPanel';

export default function CompsPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Comps & ARV</h1>
        <p className="text-sm text-slate-400 mt-1">
          Pull comparable sales, rental comps, and active listings for any property address
        </p>
      </div>
      <CompsPanel />
    </div>
  );
}
