'use client'
import { Activity, MapPin, MessageCircle } from 'lucide-react'
import DottedMap from 'dotted-map'
import { Area, AreaChart, CartesianGrid } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export function Features9() {
    return (
        <section className="px-4 py-16 md:py-32">
            <div className="mx-auto grid max-w-5xl border border-white/10 md:grid-cols-2">
                <div>
                    <div className="p-6 sm:p-12">
                        <span className="text-neutral-400 flex items-center gap-2 text-sm">
                            <MapPin className="size-4" />
                            Portfolio Coverage
                        </span>
                        <p className="mt-8 text-2xl font-semibold text-white">Track every property across your portfolio. Real-time occupancy and performance data.</p>
                    </div>
                    <div aria-hidden className="relative">
                        <div className="absolute inset-0 z-10 m-auto size-fit">
                            <div className="relative flex size-fit w-fit items-center gap-2 rounded-lg bg-neutral-900 border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80 shadow-md">
                                <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"></span> 248 units across 12 properties
                            </div>
                        </div>
                        <div className="relative overflow-hidden">
                            <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent to-black to-75%"></div>
                            <Map />
                        </div>
                    </div>
                </div>
                <div className="overflow-hidden border-t border-white/10 p-6 sm:p-12 md:border-0 md:border-l">
                    <div className="relative z-10">
                        <span className="text-neutral-400 flex items-center gap-2 text-sm">
                            <MessageCircle className="size-4" />
                            AI Tenant Communication
                        </span>
                        <p className="my-8 text-2xl font-semibold text-white">24/7 automated responses via SMS and email. Human takeover when needed.</p>
                    </div>
                    <div aria-hidden className="flex flex-col gap-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="flex justify-center items-center size-5 rounded-full border border-white/10">
                                    <span className="size-3 rounded-full bg-white"/>
                                </span>
                                <span className="text-neutral-500 text-xs">Tenant — Unit 204</span>
                            </div>
                            <div className="mt-1.5 w-3/5 rounded-lg bg-neutral-900 border border-white/10 p-3 text-xs text-white/70">My garbage disposal is making a grinding noise. Can someone come look at it?</div>
                        </div>
                        <div>
                            <div className="mb-1 ml-auto w-3/5 rounded-lg bg-emerald-600 p-3 text-xs text-white">I&apos;ve created a P3 work order and dispatched Johnson Plumbing. They&apos;ll arrive tomorrow between 9-11am. You&apos;ll receive a confirmation text shortly.</div>
                            <span className="text-neutral-500 block text-right text-xs">AI · 47s response</span>
                        </div>
                    </div>
                </div>
                <div className="col-span-full border-y border-white/10 p-12">
                    <p className="text-center text-4xl font-semibold text-white lg:text-7xl">98% <span className="text-neutral-500">Tenant Satisfaction</span></p>
                </div>
                <div className="relative col-span-full">
                    <div className="absolute z-10 max-w-lg px-6 pr-12 pt-6 md:px-12 md:pt-12">
                        <span className="text-neutral-400 flex items-center gap-2 text-sm">
                            <Activity className="size-4" />
                            Revenue Analytics
                        </span>
                        <p className="my-8 text-2xl font-semibold text-white">
                            Track rent collection in real-time. <span className="text-neutral-500">Identify delinquencies before they become problems.</span>
                        </p>
                    </div>
                    <MonitoringChart />
                </div>
            </div>
        </section>
    )
}

const map = new DottedMap({ height: 55, grid: 'diagonal' })
const points = map.getPoints()

const Map = () => (
    <svg viewBox="0 0 120 60" style={{ background: 'black' }} className="text-white/20">
        {points.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r={0.15} fill="currentColor" />
        ))}
    </svg>
)

const chartConfig = {
    collected: { label: 'Rent Collected', color: '#10B981' },
    expected: { label: 'Expected Revenue', color: '#3B82F6' },
} satisfies ChartConfig

const chartData = [
    { month: 'Jul', collected: 380, expected: 412 },
    { month: 'Aug', collected: 395, expected: 412 },
    { month: 'Sep', collected: 402, expected: 418 },
    { month: 'Oct', collected: 410, expected: 420 },
    { month: 'Nov', collected: 405, expected: 420 },
    { month: 'Dec', collected: 418, expected: 425 },
]

const MonitoringChart = () => (
    <ChartContainer className="h-[480px] aspect-auto md:h-96" config={chartConfig}>
        <AreaChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0 }}>
            <defs>
                <linearGradient id="fillCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-collected)" stopOpacity={0.6} />
                    <stop offset="55%" stopColor="var(--color-collected)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillExpected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-expected)" stopOpacity={0.4} />
                    <stop offset="55%" stopColor="var(--color-expected)" stopOpacity={0.05} />
                </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent className="bg-neutral-900 border-white/10" />} />
            <Area strokeWidth={2} dataKey="expected" type="monotone" fill="url(#fillExpected)" fillOpacity={0.1} stroke="var(--color-expected)" stackId="a" />
            <Area strokeWidth={2} dataKey="collected" type="monotone" fill="url(#fillCollected)" fillOpacity={0.1} stroke="var(--color-collected)" stackId="a" />
        </AreaChart>
    </ChartContainer>
)
