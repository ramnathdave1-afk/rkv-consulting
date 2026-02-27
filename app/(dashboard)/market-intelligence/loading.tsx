export default function MarketIntelligenceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-52 bg-card rounded-lg" />
          <div className="h-4 w-72 bg-card rounded-lg mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-green-500/30 rounded-full" />
          <div className="h-4 w-20 bg-card rounded" />
        </div>
      </div>

      {/* Tracked Markets Chips */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-28 bg-card rounded-full" />
        ))}
      </div>

      {/* Map Area */}
      <div className="bg-card border border-border rounded-xl h-[500px]" />

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 h-72" />
        <div className="bg-card border border-border rounded-xl p-6 h-72" />
      </div>
    </div>
  );
}
