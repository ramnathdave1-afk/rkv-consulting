export default function TenantScreeningLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-card rounded-lg" />
          <div className="h-4 w-64 bg-card rounded-lg mt-2" />
        </div>
        <div className="h-10 w-40 bg-card rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-24 bg-border rounded" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border-b border-border/50 flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-border rounded-full" />
              <div className="h-4 w-32 bg-border rounded" />
            </div>
            <div className="h-4 w-28 bg-border rounded" />
            <div className="h-6 w-20 bg-border rounded-full" />
            <div className="h-6 w-12 bg-border rounded" />
            <div className="h-4 w-20 bg-border rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
