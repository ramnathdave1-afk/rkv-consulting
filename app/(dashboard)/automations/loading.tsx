function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#1e1e1e]/30 border border-[#1e1e1e]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#c9a84c]/5 to-transparent" />
    </div>
  );
}

export default function AutomationsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-44" />
          <SkeletonBlock className="h-4 w-72 mt-2" />
        </div>
        <SkeletonBlock className="h-10 w-36" />
      </div>

      {/* Automation cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1e1e1e]/50 bg-[#1e1e1e]/20 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <SkeletonBlock className="h-10 w-10 rounded-lg" />
              <SkeletonBlock className="h-6 w-12 rounded-full" />
            </div>
            <SkeletonBlock className="h-5 w-3/4" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-9 w-full mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
