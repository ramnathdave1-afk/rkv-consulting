function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#161E2A]/30 border border-[#161E2A]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#059669]/5 to-transparent" />
    </div>
  );
}

export default function TenantScreeningLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-4 w-64 mt-2" />
        </div>
        <SkeletonBlock className="h-10 w-40" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#161E2A]/50 bg-[#161E2A]/20 overflow-hidden">
        <div className="p-4 border-b border-[#161E2A]/50 flex gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-4 w-24" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border-b border-[#161E2A]/30 flex items-center gap-6">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-8 w-8 rounded-full" />
              <SkeletonBlock className="h-4 w-32" />
            </div>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
            <SkeletonBlock className="h-6 w-12" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
