function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#1e1e1e]/30 border border-[#1e1e1e]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#c9a84c]/5 to-transparent" />
    </div>
  );
}

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-36" />
          <SkeletonBlock className="h-4 w-56 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-10 w-10" />
          <SkeletonBlock className="h-10 w-32" />
          <SkeletonBlock className="h-10 w-10" />
        </div>
      </div>

      {/* Calendar view */}
      <div className="rounded-xl border border-[#1e1e1e]/50 bg-[#1e1e1e]/20 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px border-b border-[#1e1e1e] p-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-4 w-10" />
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px p-3">
          {Array.from({ length: 35 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20 min-h-[80px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
