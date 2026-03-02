function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#1e1e1e]/30 border border-[#1e1e1e]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#c9a84c]/5 to-transparent" />
    </div>
  );
}

export default function DocumentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-36" />
          <SkeletonBlock className="h-4 w-52 mt-2" />
        </div>
        <SkeletonBlock className="h-10 w-36" />
      </div>

      {/* Expiration Alerts */}
      <div className="rounded-xl border border-[#1e1e1e]/50 bg-[#1e1e1e]/20 p-4 flex items-center gap-3">
        <SkeletonBlock className="h-10 w-10" />
        <div className="space-y-1.5">
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-3 w-36" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <SkeletonBlock className="h-10 w-48" />
        <SkeletonBlock className="h-10 w-36" />
        <SkeletonBlock className="h-10 w-36" />
      </div>

      {/* Document Table */}
      <div className="rounded-xl border border-[#1e1e1e]/50 bg-[#1e1e1e]/20 overflow-hidden">
        <div className="p-4 border-b border-[#1e1e1e]/50 flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-4 w-24" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 border-b border-[#1e1e1e]/30 flex items-center gap-4">
            <SkeletonBlock className="h-8 w-8" />
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
