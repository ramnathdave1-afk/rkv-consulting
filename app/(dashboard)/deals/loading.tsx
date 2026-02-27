function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#161E2A]/30 border border-[#161E2A]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#059669]/5 to-transparent" />
    </div>
  );
}

export default function DealsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-44" />
          <SkeletonBlock className="h-4 w-64 mt-2" />
        </div>
        <SkeletonBlock className="h-10 w-32" />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="rounded-xl border border-[#161E2A]/50 bg-[#161E2A]/20 p-6 space-y-4">
          <SkeletonBlock className="h-6 w-32" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-10 w-full" />
            </div>
          ))}
          <SkeletonBlock className="h-12 w-full mt-4" />
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <SkeletonBlock className="h-96 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonBlock className="h-48 rounded-xl" />
            <SkeletonBlock className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
