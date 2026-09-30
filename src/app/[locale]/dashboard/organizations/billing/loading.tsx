function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl border border-slate-800 bg-[#0d1624] ${className}`} />;
}

export default function BillingLoading() {
  return (
    <main className="min-h-0 space-y-6 bg-transparent" aria-label="Loading billing" aria-busy="true">
      <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="mt-4 h-8 max-w-xl" />
        <SkeletonBlock className="mt-3 h-4 max-w-2xl" />
      </section>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-28" />
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-64" />
        ))}
      </section>
    </main>
  );
}
