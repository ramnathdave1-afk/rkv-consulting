'use client';

import React from 'react';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Reports</h1>
        <p className="text-sm text-text-secondary">Generated site reports and analysis documents</p>
      </div>

      <div className="glass-card p-12 text-center">
        <FileText size={32} className="text-text-muted mx-auto mb-3" />
        <p className="text-sm text-text-secondary">
          Reports are generated from individual site pages. Visit a site and click &quot;Report&quot; to generate a PDF.
        </p>
      </div>
    </div>
  );
}
