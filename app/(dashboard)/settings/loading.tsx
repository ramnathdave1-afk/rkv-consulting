export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-32 bg-card rounded-lg" />
        <div className="h-4 w-52 bg-card rounded-lg mt-2" />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-border rounded-md" />
        ))}
      </div>

      {/* Form Fields */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5 max-w-2xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-28 bg-border rounded" />
            <div className="h-10 w-full bg-border rounded-lg" />
          </div>
        ))}
        <div className="h-12 w-32 bg-border rounded-lg mt-4" />
      </div>
    </div>
  );
}
