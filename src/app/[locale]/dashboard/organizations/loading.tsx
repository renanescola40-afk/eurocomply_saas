function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.045] ${className}`} />;
}

export default function OrganizationDashboardLoading() {
  return (
    <main className="min-h-0 bg-transparent text-white" role="status" aria-label="Loading dashboard">
      <div className="w-full space-y-6">
        <header className="border-b border-white/[0.065] pb-5">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="mt-3 h-9 max-w-md" />
          <SkeletonBlock className="mt-3 h-4 max-w-2xl" />
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-white/[0.07] bg-[#101715] p-4">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="mt-4 h-8 w-16" />
              <SkeletonBlock className="mt-3 h-3 w-full" />
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-xl border border-white/[0.07] bg-[#101715] p-5">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="mt-4 h-6 max-w-sm" />
            <SkeletonBlock className="mt-3 h-4 max-w-xl" />
            <SkeletonBlock className="mt-6 h-10 w-36" />
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#101715] p-5">
            <SkeletonBlock className="h-4 w-28" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-10 w-full" />)}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.07] bg-[#101715] p-5">
          <SkeletonBlock className="h-4 w-40" />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-20 w-full" />)}
          </div>
        </section>
      </div>
    </main>
  );
}
