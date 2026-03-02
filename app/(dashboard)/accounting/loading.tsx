function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#1e1e1e]/30 border border-[#1e1e1e]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#c9a84c]/5 to-transparent" />
    </div>
  );
}

export default function AccountingLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-4 w-56 mt-2" />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-lg border border-[#1e1e1e]/50 bg-[#1e1e1e]/20 p-1 w-fit">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-9 w-28 rounded-md" />
        ))}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1e1e1e]/50 bg-[#1e1e1e]/20 p-5 space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-8 w-28" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonBlock className="h-80 rounded-xl" />
        <SkeletonBlock className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
