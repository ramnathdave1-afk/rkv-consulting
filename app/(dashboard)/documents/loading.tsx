export default function DocumentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-36 bg-card rounded-lg" />
          <div className="h-4 w-52 bg-card rounded-lg mt-2" />
        </div>
        <div className="h-10 w-36 bg-card rounded-lg" />
      </div>

      {/* Expiration Alerts */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 bg-border rounded-lg" />
        <div className="space-y-1.5">
          <div className="h-4 w-48 bg-border rounded" />
          <div className="h-3 w-36 bg-border rounded" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="h-10 w-48 bg-card rounded-lg" />
        <div className="h-10 w-36 bg-card rounded-lg" />
        <div className="h-10 w-36 bg-card rounded-lg" />
      </div>

      {/* Document Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-24 bg-border rounded" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 border-b border-border/50 flex items-center gap-4">
            <div className="h-8 w-8 bg-border rounded" />
            <div className="h-4 w-48 bg-border rounded" />
            <div className="h-4 w-24 bg-border rounded" />
            <div className="h-4 w-20 bg-border rounded" />
            <div className="h-4 w-16 bg-border rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
