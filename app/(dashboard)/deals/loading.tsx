export default function DealsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-44 bg-card rounded-lg" />
          <div className="h-4 w-64 bg-card rounded-lg mt-2" />
        </div>
        <div className="h-10 w-32 bg-card rounded-lg" />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="h-6 w-32 bg-border rounded" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 bg-border rounded" />
              <div className="h-10 w-full bg-border rounded" />
            </div>
          ))}
          <div className="h-12 w-full bg-border rounded-lg mt-4" />
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 h-96" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-6 h-48" />
            <div className="bg-card border border-border rounded-xl p-6 h-48" />
          </div>
        </div>
      </div>
    </div>
  );
}
