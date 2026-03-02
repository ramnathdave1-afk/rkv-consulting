function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#1e1e1e]/30 border border-[#1e1e1e]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#c9a84c]/5 to-transparent" />
    </div>
  );
}

export default function FinancingHubLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-4 w-60 mt-2" />
      </div>

      {/* Loan Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1e1e1e]/50 bg-[#1e1e1e]/20 p-5 space-y-3">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-8 w-28" />
            <SkeletonBlock className="h-2 w-full rounded-full" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Equity / Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonBlock className="h-72 rounded-xl" />
        <SkeletonBlock className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
