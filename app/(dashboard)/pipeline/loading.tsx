function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#1e1e1e]/30 border border-[#1e1e1e]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#c9a84c]/5 to-transparent" />
    </div>
  );
}

export default function PipelineLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-44" />
          <SkeletonBlock className="h-4 w-72 mt-2" />
        </div>
        <SkeletonBlock className="h-10 w-32" />
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-72 rounded-xl border border-[#1e1e1e]/50 bg-[#1e1e1e]/20 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-6 w-6 rounded-full" />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="rounded-lg border border-[#1e1e1e]/50 p-3 space-y-2">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-3 w-2/3" />
                <SkeletonBlock className="h-5 w-20" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
