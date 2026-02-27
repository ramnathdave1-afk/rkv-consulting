export default function PropertiesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-card rounded-lg" />
          <div className="h-4 w-56 bg-card rounded-lg mt-2" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-card rounded-lg" />
          <div className="h-10 w-36 bg-card rounded-lg" />
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="h-3 w-16 bg-border rounded" />
            <div className="h-7 w-20 bg-border rounded" />
          </div>
        ))}
      </div>

      {/* View Toggles + Search */}
      <div className="flex items-center justify-between">
        <div className="h-10 w-48 bg-card rounded-lg" />
        <div className="h-10 w-64 bg-card rounded-lg" />
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="h-40 bg-border" />
            <div className="p-5 space-y-3">
              <div className="h-5 w-3/4 bg-border rounded" />
              <div className="h-4 w-1/2 bg-border rounded" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="h-12 bg-border rounded" />
                <div className="h-12 bg-border rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
