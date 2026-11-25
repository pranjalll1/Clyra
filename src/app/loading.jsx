// Unit I: Error and Loading UI - Next.js App Router instant loading state
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-surface-muted border border-onyx" />
        <div className="h-4 w-96 bg-surface-muted" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 border-2 border-onyx bg-surface-muted p-4 space-y-4">
              <div className="h-32 bg-surface" />
              <div className="h-4 w-3/4 bg-surface" />
              <div className="h-4 w-1/2 bg-surface" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
