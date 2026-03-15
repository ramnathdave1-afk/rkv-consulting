'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react';
import type { Site } from '@/lib/types';

interface RegulatoryTabProps {
  site: Site;
}

type StepStatus = 'complete' | 'in_progress' | 'pending' | 'blocked';

interface PermitStep {
  title: string;
  description: string;
  status: StepStatus;
  timeline: string;
}

const statusConfig: Record<StepStatus, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bg: string; label: string }> = {
  complete: { icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)', label: 'Complete' },
  in_progress: { icon: Clock, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', label: 'In Progress' },
  pending: { icon: Circle, color: '#4A5568', bg: 'rgba(74, 85, 104, 0.1)', label: 'Pending' },
  blocked: { icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Blocked' },
};

function getSteps(site: Site): PermitStep[] {
  const hasZoning = site.zoning && site.zoning !== 'Unknown';
  const stage = site.pipeline_stage;
  const isPastDD = ['loi', 'under_contract', 'closed'].includes(stage);
  const isPastLOI = ['under_contract', 'closed'].includes(stage);
  const isClosed = stage === 'closed';

  return [
    {
      title: 'Zoning Approval',
      description: `Current zoning: ${site.zoning || 'Unknown'}. Verify data center use is permitted or apply for rezoning/variance.`,
      status: hasZoning ? (isPastDD ? 'complete' : 'in_progress') : 'pending',
      timeline: '4-8 weeks',
    },
    {
      title: 'Environmental Review',
      description: 'NEPA/state environmental impact assessment. Wetlands delineation, endangered species review, stormwater management plan.',
      status: isPastDD ? 'complete' : (stage === 'due_diligence' ? 'in_progress' : 'pending'),
      timeline: '8-16 weeks',
    },
    {
      title: 'Utility Interconnection Agreement',
      description: 'File interconnection request with grid operator. System impact study, facilities study, and interconnection agreement execution.',
      status: isPastLOI ? 'complete' : (isPastDD ? 'in_progress' : 'pending'),
      timeline: '12-24 months',
    },
    {
      title: 'Building Permits',
      description: 'Site plan approval, grading permits, building permits, electrical permits. Coordinate with county/municipality.',
      status: isClosed ? 'complete' : (isPastLOI ? 'in_progress' : 'pending'),
      timeline: '6-12 weeks',
    },
    {
      title: 'Certificate of Occupancy',
      description: 'Final inspections, fire marshal approval, utility service activation, TCO/CO issuance.',
      status: isClosed ? 'in_progress' : 'pending',
      timeline: '2-4 weeks',
    },
  ];
}

export function RegulatoryTab({ site }: RegulatoryTabProps) {
  const steps = getSteps(site);

  return (
    <div className="space-y-4">
      <div className="glass-card p-3">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-3">Permit Roadmap</p>

        <div className="relative">
          {steps.map((step, i) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            const isLast = i === steps.length - 1;

            return (
              <div key={step.title} className="flex gap-3 pb-4 last:pb-0">
                {/* Vertical line + icon */}
                <div className="flex flex-col items-center">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: config.bg }}
                  >
                    <span style={{ color: config.color }}><Icon size={12} /></span>
                  </div>
                  {!isLast && (
                    <div
                      className="w-px flex-1 mt-1"
                      style={{ backgroundColor: config.color, opacity: 0.3 }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-text-primary">{step.title}</p>
                    <span
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{step.description}</p>
                  <p className="text-[9px] text-text-muted mt-1">Est. timeline: {step.timeline}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Regulatory Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Zoning', value: site.zoning || 'Unknown' },
          { label: 'Jurisdiction', value: `${site.county || '—'} County, ${site.state}` },
          { label: 'Grid Queue', value: 'Not Filed' },
          { label: 'Est. Total Timeline', value: '18-36 months' },
        ].map((item) => (
          <div key={item.label} className="glass-card p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">{item.label}</p>
            <p className="text-xs font-mono text-text-primary mt-1">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
