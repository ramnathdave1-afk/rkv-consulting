export default function AccountingLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-40 bg-card rounded-lg" />
        <div className="h-4 w-56 bg-card rounded-lg mt-2" />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-border rounded-md" />
        ))}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-2">
            <div className="h-3 w-20 bg-border rounded" />
            <div className="h-8 w-28 bg-border rounded" />
            <div className="h-3 w-16 bg-border rounded" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 h-80" />
        <div className="bg-card border border-border rounded-xl p-6 h-80" />
      </div>
    </div>
  );
}
