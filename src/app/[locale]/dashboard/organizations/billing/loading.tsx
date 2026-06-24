function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export default function BillingLoading() {
  return (
    <main className="space-y-8" aria-label="Loading billing">
      <section className="rounded-3xl border bg-card p-8 shadow-xl">
        <SkeletonBlock className="h-4 w-28 rounded-full" />
        <SkeletonBlock className="mt-5 h-12 max-w-xl" />
        <SkeletonBlock className="mt-4 h-5 max-w-2xl rounded-full" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-36 rounded-3xl" />
        ))}
      </section>
      <section className="grid gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-80 rounded-3xl" />
        ))}
      </section>
    </main>
  );
}
