export default function AIAssistantLoading() {
  return (
    <div className="flex h-[calc(100vh-80px)] animate-pulse">
      {/* Sidebar */}
      <div className="w-[280px] border-r border-border p-4 space-y-3">
        <div className="h-10 w-full bg-card rounded-lg" />
        <div className="h-px bg-border my-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-card rounded-lg" />
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`bg-card border border-border rounded-xl p-4 max-w-[60%] space-y-2`}>
                <div className="h-4 w-full bg-border rounded" />
                <div className="h-4 w-3/4 bg-border rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="h-12 w-full bg-card rounded-xl" />
        </div>
      </div>
    </div>
  );
}
