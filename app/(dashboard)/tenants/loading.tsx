export default function TenantsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-36 bg-card rounded-lg" />
          <div className="h-4 w-52 bg-card rounded-lg mt-2" />
        </div>
        <div className="h-10 w-32 bg-card rounded-lg" />
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

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-card rounded-lg" />
        ))}
      </div>

      {/* Tenant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-border rounded-full" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-border rounded" />
                <div className="h-3 w-24 bg-border rounded" />
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 bg-border rounded" />
              <div className="h-10 bg-border rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
