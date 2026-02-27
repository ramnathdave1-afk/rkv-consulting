function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#161E2A]/30 border border-[#161E2A]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#059669]/5 to-transparent" />
    </div>
  );
}

export default function MarketIntelligenceLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-52" />
          <SkeletonBlock className="h-4 w-72 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#059669]/20" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      </div>

      {/* Tracked Markets Chips */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>

      {/* Map Area */}
      <SkeletonBlock className="h-[500px] rounded-xl" />

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonBlock className="h-72 rounded-xl" />
        <SkeletonBlock className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
