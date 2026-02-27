function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-[#161E2A]/30 border border-[#161E2A]/50 ${className || ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#059669]/5 to-transparent" />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="h-4 w-52 mt-2" />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-lg border border-[#161E2A]/50 bg-[#161E2A]/20 p-1 w-fit">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-9 w-28 rounded-md" />
        ))}
      </div>

      {/* Form Fields */}
      <div className="rounded-xl border border-[#161E2A]/50 bg-[#161E2A]/20 p-6 space-y-5 max-w-2xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        ))}
        <SkeletonBlock className="h-12 w-32 mt-4" />
      </div>
    </div>
  );
}
