'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Reports</h1>
        <p className="text-sm text-text-secondary">AI-powered portfolio analysis and site reports</p>
      </div>

      {/* AI Insights */}
      <AIInsightsPanel />

      {/* Site reports info */}
      <div className="glass-card p-8 text-center">
        <FileText size={24} className="text-text-muted mx-auto mb-3" />
        <p className="text-xs font-medium text-text-primary mb-1">Individual Site Reports</p>
        <p className="text-[11px] text-text-secondary">
          Visit a site detail page and click &quot;Report&quot; to generate a PDF feasibility report.
        </p>
      </div>
    </div>
  );
}
