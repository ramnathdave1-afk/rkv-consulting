function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#1e1e1e]/30 border border-[#1e1e1e]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#c9a84c]/5 to-transparent" />
    </div>
  );
}

export default function DealFeedLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-40" />
          <SkeletonBlock className="h-4 w-64 mt-2" />
        </div>
        <SkeletonBlock className="h-10 w-24" />
      </div>

      {/* Filter bar */}
      <SkeletonBlock className="h-20 w-full rounded-xl" />

      {/* Card list grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1e1e1e]/50 bg-[#1e1e1e]/20 overflow-hidden">
            <SkeletonBlock className="h-48 w-full rounded-none" />
            <div className="p-4 space-y-3">
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-4 w-1/2" />
              <SkeletonBlock className="h-6 w-24" />
              <div className="flex gap-4">
                <SkeletonBlock className="h-3 w-12" />
                <SkeletonBlock className="h-3 w-12" />
                <SkeletonBlock className="h-3 w-14" />
              </div>
              <div className="flex gap-2 pt-2">
                <SkeletonBlock className="h-9 flex-1" />
                <SkeletonBlock className="h-9 flex-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
