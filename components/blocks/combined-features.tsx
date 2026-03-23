'use client'

import { Activity, ArrowRight, Building2, MapPin, MessageSquare, Wrench } from 'lucide-react'
import DottedMap from 'dotted-map'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/lib/utils'

// ── Chart infrastructure (inline to avoid import issues) ──
const THEMES = { light: "", dark: ".dark" } as const
type ChartConfig = { [k in string]: { label?: React.ReactNode; icon?: React.ComponentType } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> }) }
const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)
function useChart() { const c = React.useContext(ChartContext); if (!c) throw new Error("useChart must be used within ChartContainer"); return c; }
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const cc = Object.entries(config).filter(([_, c]) => c.theme || c.color);
  if (!cc.length) return null;
  return <style dangerouslySetInnerHTML={{ __html: Object.entries(THEMES).map(([theme, prefix]) => `${prefix} [data-chart=${id}] {\n${cc.map(([key, ic]) => { const color = ic.theme?.[theme as keyof typeof ic.theme] || ic.color; return color ? `  --color-${key}: ${color};` : null; }).filter(Boolean).join("\n")}\n}`).join("\n") }} />;
}
const ChartContainer = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & { config: ChartConfig; children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"] }>(({ id, className, children, config, ...props }, ref) => {
  const uid = React.useId(); const chartId = `chart-${id || uid.replace(/:/g, "")}`;
  return <ChartContext.Provider value={{ config }}><div data-chart={chartId} ref={ref} className={cn("flex aspect-video justify-center text-xs", className)} {...props}><ChartStyle id={chartId} config={config} /><RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer></div></ChartContext.Provider>;
})
ChartContainer.displayName = "Chart"
const ChartTooltip = RechartsPrimitive.Tooltip as React.FC<any>
const ChartTooltipContent = React.forwardRef<HTMLDivElement, any>(({ active, payload, className }, ref) => {
  if (!active || !payload?.length) return null;
  return <div ref={ref} className={cn("rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-xs shadow-xl", className)}><div className="grid gap-1">{payload.map((item: any) => <div key={item.dataKey} className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm" style={{ background: item.color }} /><span className="text-neutral-400">{item.dataKey}</span><span className="text-white font-mono">{item.value?.toLocaleString()}</span></div>)}</div></div>;
})
ChartTooltipContent.displayName = "ChartTooltip"

// ── Main Component ──
export default function CombinedFeatures() {
  return (
    <section className="py-24 bg-black">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 md:grid-rows-2">
        {/* 1. MAP — Top Left */}
        <div className="relative overflow-hidden border border-white/5 bg-neutral-950 p-6">
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
            <MapPin className="w-4 h-4" />
            Portfolio Analytics
          </div>
          <h3 className="text-xl font-normal text-white">
            Visualize properties across markets.{" "}
            <span className="text-neutral-500">Track occupancy and performance by region.</span>
          </h3>
          <div className="relative mt-6">
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-neutral-900 border border-white/10 text-white rounded-md text-xs font-medium shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"></span>
              248 units across 12 properties
            </div>
            <Map />
          </div>
        </div>

        {/* 2. NOTIFICATIONS — Top Right */}
        <div className="flex flex-col justify-between gap-4 p-6 border border-white/5 bg-neutral-900/50">
          <div>
            <span className="text-xs flex items-center gap-2 text-neutral-500 mb-2">
              <MessageSquare className="w-4 h-4" /> AI Activity Feed
            </span>
            <h3 className="text-xl font-normal text-white">
              Real-time AI actions{" "}
              <span className="text-neutral-500">across your entire portfolio, 24/7.</span>
            </h3>
          </div>
          <NotificationFeed />
        </div>

        {/* 3. CHART — Bottom Left */}
        <div className="border border-white/5 bg-neutral-950 p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
            <Activity className="w-4 h-4" />
            Revenue Analytics
          </div>
          <h3 className="text-xl font-normal text-white">
            Track rent collection in real-time.{" "}
            <span className="text-neutral-500">Identify delinquencies before they become problems.</span>
          </h3>
          <MonitoringChart />
        </div>

        {/* 4. FEATURE CARDS — Bottom Right */}
        <div className="grid sm:grid-cols-2">
          <FeatureCard
            icon={<Wrench className="w-4 h-4" />}
            title="Maintenance AI"
            subtitle="Auto-Dispatch"
            description="AI triages urgency and dispatches vendors within 2-hour SLA."
          />
          <FeatureCard
            icon={<Building2 className="w-4 h-4" />}
            title="Portfolio View"
            subtitle="One Dashboard"
            description="Every property, unit, tenant, and lease in a single view."
          />
        </div>
      </div>
    </section>
  )
}

// ── Feature Card ──
function FeatureCard({ icon, title, subtitle, description }: { icon: React.ReactNode; title: string; subtitle: string; description: string }) {
  return (
    <div className="relative flex flex-col gap-3 p-6 border border-white/5 bg-black hover:bg-white/[0.02] transition group cursor-default">
      <div>
        <span className="text-xs flex items-center gap-2 text-neutral-500 mb-3">
          {icon} {title}
        </span>
        <h3 className="text-lg font-normal text-white">
          {subtitle}{" "}
          <span className="text-neutral-500">{description}</span>
        </h3>
      </div>
      <div className="absolute bottom-3 right-3 p-2.5 flex items-center border border-white/10 rounded-full group-hover:-rotate-45 transition-transform bg-black">
        <ArrowRight className="w-3.5 h-3.5 text-white/60" />
      </div>
    </div>
  )
}

// ── Animated Map ──
const map = new DottedMap({ height: 55, grid: 'diagonal' })
const points = map.getPoints()

// Property locations (approximate US city positions on the dotted map)
const propertyPins = [
  { cx: 25, cy: 28, label: 'Phoenix', units: 48 },
  { cx: 27, cy: 25, label: 'Scottsdale', units: 64 },
  { cx: 23, cy: 30, label: 'Tempe', units: 32 },
  { cx: 30, cy: 32, label: 'Mesa', units: 24 },
  { cx: 80, cy: 26, label: 'Austin', units: 36 },
  { cx: 85, cy: 22, label: 'Dallas', units: 44 },
]

// Connection lines between nearby properties
const connections = [
  { x1: 25, y1: 28, x2: 27, y2: 25 },
  { x1: 27, y1: 25, x2: 23, y2: 30 },
  { x1: 23, y1: 30, x2: 30, y2: 32 },
  { x1: 80, y1: 26, x2: 85, y2: 22 },
  { x1: 30, y1: 32, x2: 80, y2: 26 },
]

const Map = () => (
  <svg viewBox="0 0 120 60" className="w-full h-auto">
    <style>{`
      @keyframes mapDot { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.22; } }
      @keyframes pinPulse { 0%, 100% { r: 0.6; opacity: 0.9; } 50% { r: 0.8; opacity: 1; } }
      @keyframes pinRing { 0% { r: 0.8; opacity: 0.5; } 100% { r: 2.5; opacity: 0; } }
      @keyframes dashFlow { 0% { stroke-dashoffset: 8; } 100% { stroke-dashoffset: 0; } }
      @keyframes travelDot { 0% { offset-distance: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { offset-distance: 100%; opacity: 0; } }
    `}</style>
    {/* Base dots with subtle animation */}
    {points.map((point, i) => (
      <circle key={i} cx={point.x} cy={point.y} r={0.15} fill="rgba(255,255,255,0.12)"
        style={{ animation: `mapDot ${3 + (i % 5) * 0.8}s ease-in-out ${(i % 20) * 0.15}s infinite` }} />
    ))}
    {/* Connection lines with flowing dashes */}
    {connections.map((c, i) => (
      <line key={`conn-${i}`} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
        stroke="rgba(16,185,129,0.15)" strokeWidth="0.2"
        strokeDasharray="1 1"
        style={{ animation: `dashFlow ${2 + i * 0.5}s linear infinite` }} />
    ))}
    {/* Traveling dots along connections */}
    {connections.map((c, i) => (
      <circle key={`travel-${i}`} r="0.3" fill="#10B981"
        style={{
          offsetPath: `path('M${c.x1},${c.y1} L${c.x2},${c.y2}')`,
          animation: `travelDot ${3 + i * 1.2}s ease-in-out ${i * 0.8}s infinite`,
          filter: 'drop-shadow(0 0 1px rgba(16,185,129,0.6))',
        }} />
    ))}
    {/* Property pins with pulse */}
    {propertyPins.map((pin, i) => (
      <g key={`pin-${i}`}>
        {/* Expanding ring */}
        <circle cx={pin.cx} cy={pin.cy} r="0.8" fill="none" stroke="#10B981" strokeWidth="0.15"
          style={{ animation: `pinRing 2.5s ease-out ${i * 0.4}s infinite` }} />
        {/* Core dot */}
        <circle cx={pin.cx} cy={pin.cy} fill="#10B981"
          style={{
            animation: `pinPulse 2s ease-in-out ${i * 0.3}s infinite`,
            filter: 'drop-shadow(0 0 1.5px rgba(16,185,129,0.8))',
          }} r="0.6" />
        {/* Glow */}
        <circle cx={pin.cx} cy={pin.cy} r="1.5" fill="rgba(16,185,129,0.08)" />
      </g>
    ))}
  </svg>
)

// ── Chart ──
const chartData = [
  { month: 'Jul', collected: 380, expected: 412 },
  { month: 'Aug', collected: 395, expected: 412 },
  { month: 'Sep', collected: 402, expected: 418 },
  { month: 'Oct', collected: 410, expected: 420 },
  { month: 'Nov', collected: 405, expected: 420 },
  { month: 'Dec', collected: 418, expected: 425 },
]
const chartConfig = {
  collected: { label: 'Collected', color: '#10B981' },
  expected: { label: 'Expected', color: '#3B82F6' },
} satisfies ChartConfig

function MonitoringChart() {
  return (
    <ChartContainer className="h-48 aspect-auto" config={chartConfig}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-collected)" stopOpacity={0.5} /><stop offset="80%" stopColor="var(--color-collected)" stopOpacity={0.02} /></linearGradient>
          <linearGradient id="fe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-expected)" stopOpacity={0.3} /><stop offset="80%" stopColor="var(--color-expected)" stopOpacity={0.02} /></linearGradient>
        </defs>
        <XAxis hide /><YAxis hide />
        <CartesianGrid vertical={false} horizontal={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area strokeWidth={2} dataKey="expected" type="monotone" fill="url(#fe)" stroke="var(--color-expected)" />
        <Area strokeWidth={2} dataKey="collected" type="monotone" fill="url(#fc)" stroke="var(--color-collected)" />
      </AreaChart>
    </ChartContainer>
  )
}

// ── Notification Feed ──
const notifications = [
  { title: 'Rent Collected', time: '2m ago', content: 'Unit 112 — $1,850 payment processed via ACH.', color: 'from-emerald-500 to-emerald-700' },
  { title: 'AI Response', time: '8m ago', content: 'Prospect inquiry answered in 43s — showing scheduled.', color: 'from-blue-500 to-blue-700' },
  { title: 'Maintenance', time: '22m ago', content: 'P2 HVAC dispatch — Johnson HVAC en route to Unit 204.', color: 'from-orange-500 to-orange-700' },
  { title: 'Lease Renewal', time: '1h ago', content: '60-day notice sent to Unit 308 — $1,425/mo proposed.', color: 'from-purple-500 to-purple-700' },
  { title: 'Compliance', time: '2h ago', content: 'Fair housing filter caught 1 flagged phrase — auto-corrected.', color: 'from-red-500 to-red-700' },
  { title: 'Owner Report', time: '3h ago', content: 'Q4 PDF report generated for Scottsdale portfolio — emailed.', color: 'from-cyan-500 to-cyan-700' },
]

function NotificationFeed() {
  return (
    <div className="w-full h-[260px] overflow-hidden relative">
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-neutral-900/90 to-transparent z-10"></div>
      <div className="space-y-2">
        {notifications.map((msg, i) => (
          <div key={i} className="flex gap-3 items-start p-3 border border-white/5 rounded-lg cursor-default hover:border-white/10 transition-colors" style={{ animation: `scaleUp 0.4s ease-out ${i * 150}ms both` }}>
            <div className={`w-7 h-7 min-w-[1.75rem] rounded-md bg-gradient-to-br ${msg.color} shrink-0`} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white">
                {msg.title}
                <span className="text-[10px] text-neutral-600">{msg.time}</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes scaleUp {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
