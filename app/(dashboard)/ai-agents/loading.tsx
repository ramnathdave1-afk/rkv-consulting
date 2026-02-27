export default function AIAgentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-36 bg-card rounded-lg" />
        <div className="h-4 w-60 bg-card rounded-lg mt-2" />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-border rounded-md" />
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-2">
            <div className="h-3 w-20 bg-border rounded" />
            <div className="h-8 w-16 bg-border rounded" />
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="h-5 w-36 bg-border rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 bg-border rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 bg-border rounded" />
              <div className="h-3 w-24 bg-border rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
