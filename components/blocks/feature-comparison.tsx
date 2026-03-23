'use client'

import { useState } from 'react'
import { GripVertical, MessageSquare, CreditCard, Wrench, FileText, TrendingUp, Home, Building2, Shield } from 'lucide-react'

const features = [
  { icon: MessageSquare, title: 'AI Tenant Communication', desc: '24/7 responses via SMS, email, and web chat. Leads qualified, showings scheduled — all under 90 seconds.' },
  { icon: CreditCard, title: 'Automated Rent Collection', desc: 'Smart reminders, delinquency aging (0-30, 30-60, 60-90), and automated follow-up sequences.' },
  { icon: Wrench, title: 'Maintenance AI Triage', desc: 'AI classifies urgency P1-P4, matches vendors by skill and proximity, auto-dispatches within 2hr SLA.' },
  { icon: FileText, title: 'Lease Management', desc: 'Automated 90/60/30-day renewal sequences. Track expirations and reduce vacancy gaps.' },
  { icon: TrendingUp, title: 'Portfolio Analytics', desc: 'Real-time dashboards, AI-generated owner PDF reports, variance alerts, and NOI tracking.' },
  { icon: Home, title: 'Vacancy Management', desc: 'Automated listing syndication, lead tracking, and showing scheduling. Fill units faster.' },
  { icon: Building2, title: 'Acquisitions CRM', desc: 'Deal pipeline kanban, multi-agent AI scoring (ARV + Market + Risk), MAO calculator.' },
  { icon: Shield, title: 'Fair Housing Compliance', desc: 'Every AI message passes through compliance filters before sending. Full audit log.' },
]

export function FeatureComparison() {
  const [inset, setInset] = useState(50)
  const [dragging, setDragging] = useState(false)

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    let x = 0
    if ('touches' in e && e.touches.length > 0) x = e.touches[0].clientX - rect.left
    else if ('clientX' in e) x = (e as React.MouseEvent).clientX - rect.left
    setInset(Math.min(95, Math.max(5, (x / rect.width) * 100)))
  }

  return (
    <section className="py-24 bg-black">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-400 mb-6">
            Platform
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Before &amp; After MeridianNode
          </h2>
          <p className="text-neutral-500 max-w-xl mx-auto text-lg">
            Drag the slider to see the difference. Manual chaos on the left, AI-powered clarity on the right.
          </p>
        </div>

        {/* Comparison slider */}
        <div
          className="relative w-full aspect-video rounded-2xl overflow-hidden select-none border border-white/10 cursor-ew-resize"
          onMouseMove={onMove}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
          onTouchMove={onMove}
          onTouchEnd={() => setDragging(false)}
        >
          {/* AFTER (MeridianNode dashboard) — sits behind */}
          <div className="absolute inset-0 bg-neutral-950 p-4 md:p-8">
            <div className="text-[10px] font-mono text-emerald-500 mb-3 uppercase tracking-widest">With MeridianNode</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[{ l: 'Units', v: '248', c: 'text-white' }, { l: 'Occupancy', v: '96.2%', c: 'text-emerald-400' }, { l: 'Collected', v: '$412K', c: 'text-white' }, { l: 'Response', v: '<90s', c: 'text-emerald-400' }].map(k => (
                <div key={k.l} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                  <div className="text-[8px] text-neutral-500 uppercase">{k.l}</div>
                  <div className={`text-lg font-bold ${k.c}`}>{k.v}</div>
                </div>
              ))}
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 mb-3">
              <div className="text-[9px] text-neutral-500 mb-2">Revenue — Automated Tracking</div>
              <div className="flex items-end gap-1 h-16">
                {[35,42,45,50,48,55,52,58,62,65,70,74].map((h,i) => (
                  <div key={i} className="flex-1 bg-emerald-500/40 rounded-t border-t border-emerald-500/60" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { dot: 'bg-emerald-500', t: 'AI responded to prospect — 43s' },
                { dot: 'bg-blue-500', t: 'Maintenance dispatched — P2 HVAC' },
                { dot: 'bg-white/40', t: 'Lease renewal sent — 60-day notice' },
              ].map((a,i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <div className={`w-1.5 h-1.5 rounded-full ${a.dot}`}></div>
                  <span className="text-neutral-400">{a.t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* BEFORE (manual chaos) — clips from left */}
          <div
            className="absolute inset-0 bg-neutral-900 p-4 md:p-8 z-10"
            style={{ clipPath: `inset(0 ${100 - inset}% 0 0)` }}
          >
            <div className="text-[10px] font-mono text-red-400 mb-3 uppercase tracking-widest">Without MeridianNode</div>
            <div className="space-y-2">
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                <div className="text-[9px] text-red-400 font-medium mb-1">12+ hrs/week chasing rent</div>
                <div className="text-[10px] text-neutral-500">Manual reminders, spreadsheet tracking, phone calls</div>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-3">
                <div className="text-[9px] text-orange-400 font-medium mb-1">48hr avg maintenance response</div>
                <div className="text-[10px] text-neutral-500">Tenant emails sit for hours, vendors dispatched late</div>
              </div>
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
                <div className="text-[9px] text-yellow-400 font-medium mb-1">No real-time visibility</div>
                <div className="text-[10px] text-neutral-500">Scattered spreadsheets, Sunday report building</div>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                <div className="text-[9px] text-red-400 font-medium mb-1">Leads slip through cracks</div>
                <div className="text-[10px] text-neutral-500">Prospect emails unanswered, units stay vacant</div>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-3">
                <div className="text-[9px] text-orange-400 font-medium mb-1">Compliance risk</div>
                <div className="text-[10px] text-neutral-500">No audit trail, manual fair housing checks</div>
              </div>
            </div>
          </div>

          {/* Slider handle */}
          <div className="absolute z-20 top-0 h-full w-0.5 bg-white/30" style={{ left: `${inset}%` }}>
            <button
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center cursor-ew-resize hover:bg-white/20 transition-colors z-30"
              onMouseDown={() => setDragging(true)}
              onTouchStart={() => setDragging(true)}
            >
              <GripVertical className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Feature grid below */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12">
          {features.map((f) => (
            <div key={f.title} className="group p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-default">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-3 group-hover:bg-white group-hover:-translate-y-1 transition-all duration-200">
                <f.icon className="w-3.5 h-3.5 text-neutral-500 group-hover:text-black transition-colors" />
              </div>
              <h3 className="text-xs font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-[10px] text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
