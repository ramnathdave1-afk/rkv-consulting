function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#161E2A]/30 border border-[#161E2A]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#059669]/5 to-transparent" />
    </div>
  );
}

export default function PropertiesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-40" />
          <SkeletonBlock className="h-4 w-56 mt-2" />
        </div>
        <div className="flex gap-3">
          <SkeletonBlock className="h-10 w-28" />
          <SkeletonBlock className="h-10 w-36" />
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#161E2A]/50 bg-[#161E2A]/20 p-4 space-y-2">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-7 w-20" />
          </div>
        ))}
      </div>

      {/* View Toggles + Search */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-10 w-48" />
        <SkeletonBlock className="h-10 w-64" />
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#161E2A]/50 bg-[#161E2A]/20 overflow-hidden">
            <SkeletonBlock className="h-40 rounded-none" />
            <div className="p-5 space-y-3">
              <SkeletonBlock className="h-5 w-3/4" />
              <SkeletonBlock className="h-4 w-1/2" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <SkeletonBlock className="h-12" />
                <SkeletonBlock className="h-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
