export default function FinancingHubLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-40 bg-card rounded-lg" />
        <div className="h-4 w-60 bg-card rounded-lg mt-2" />
      </div>

      {/* Loan Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="h-4 w-32 bg-border rounded" />
            <div className="h-8 w-28 bg-border rounded" />
            <div className="h-2 w-full bg-border rounded-full" />
            <div className="h-3 w-24 bg-border rounded" />
          </div>
        ))}
      </div>

      {/* Equity / Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 h-72" />
        <div className="bg-card border border-border rounded-xl p-6 h-72" />
      </div>
    </div>
  );
}
