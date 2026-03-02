function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#1e1e1e]/30 border border-[#1e1e1e]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#c9a84c]/5 to-transparent" />
    </div>
  );
}

export default function VacanciesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-40" />
          <SkeletonBlock className="h-4 w-64 mt-2" />
        </div>
        <SkeletonBlock className="h-10 w-32" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Vacancies list */}
      <div className="rounded-xl border border-[#1e1e1e]/50 bg-[#1e1e1e]/20 divide-y divide-[#1e1e1e]/50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <SkeletonBlock className="h-12 w-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-48" />
              <SkeletonBlock className="h-3 w-32" />
            </div>
            <SkeletonBlock className="h-8 w-24" />
            <SkeletonBlock className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
