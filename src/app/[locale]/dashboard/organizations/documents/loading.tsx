function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.045] ${className}`} />;
}

export default function DocumentsLoading() {
  return (
    <main className="min-h-0 bg-transparent text-white" role="status" aria-label="Loading documents">
      <div className="w-full space-y-6">
        <header className="border-b border-white/[0.065] pb-5">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="mt-3 h-9 max-w-md" />
          <SkeletonBlock className="mt-3 h-4 max-w-2xl" />
        </header>
        <SkeletonBlock className="h-24 w-full" />
        <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#101715]">
          <div className="border-b border-white/[0.06] px-5 py-4"><SkeletonBlock className="h-4 w-36" /></div>
          <div className="divide-y divide-white/[0.055]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-4 max-w-xs" />
                  <SkeletonBlock className="mt-2 h-3 w-32" />
                </div>
                <SkeletonBlock className="h-9 w-24" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
