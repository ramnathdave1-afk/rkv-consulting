export default function MaintenanceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-card rounded-lg" />
          <div className="h-4 w-56 bg-card rounded-lg mt-2" />
        </div>
        <div className="h-10 w-36 bg-card rounded-lg" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="h-3 w-20 bg-border rounded" />
            <div className="h-7 w-16 bg-border rounded" />
          </div>
        ))}
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 w-28 bg-card rounded" />
            {Array.from({ length: 3 - i }).map((_, j) => (
              <div key={j} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="h-4 w-3/4 bg-border rounded" />
                <div className="h-3 w-1/2 bg-border rounded" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-border rounded-full" />
                  <div className="h-5 w-14 bg-border rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
