export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-card rounded-lg" />
          <div className="h-4 w-64 bg-card rounded-lg mt-2" />
        </div>
        <div className="h-10 w-32 bg-card rounded-lg" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="h-4 w-24 bg-border rounded" />
            <div className="h-8 w-32 bg-border rounded" />
            <div className="h-3 w-20 bg-border rounded" />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 h-80" />
        <div className="bg-card border border-border rounded-xl p-6 h-80" />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 h-64" />
        <div className="bg-card border border-border rounded-xl p-6 h-64" />
        <div className="bg-card border border-border rounded-xl p-6 h-64" />
      </div>
    </div>
  );
}
