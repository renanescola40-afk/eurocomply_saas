function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export default function OrganizationDashboardLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.24))]">
      <header className="sticky top-0 z-40 border-b bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
          <SkeletonBlock className="h-10 w-32 rounded-full" />
          <div className="hidden flex-1 items-center gap-2 md:flex">
            <SkeletonBlock className="h-10 w-36 rounded-full" />
            <SkeletonBlock className="h-10 w-32 rounded-full" />
            <SkeletonBlock className="h-10 w-40 rounded-full" />
            <SkeletonBlock className="h-10 w-28 rounded-full" />
          </div>
          <SkeletonBlock className="ml-auto h-10 w-10 rounded-full" />
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-8 md:py-10">
        <section className="rounded-[2rem] border bg-background/86 p-6 shadow-2xl shadow-primary/5 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <SkeletonBlock className="h-7 w-28 rounded-full" />
                <SkeletonBlock className="h-7 w-32 rounded-full" />
                <SkeletonBlock className="h-7 w-28 rounded-full" />
              </div>
              <div className="space-y-3">
                <SkeletonBlock className="h-5 w-48" />
                <SkeletonBlock className="h-12 max-w-3xl" />
                <SkeletonBlock className="h-12 max-w-2xl" />
                <SkeletonBlock className="h-6 max-w-xl" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
              </div>
            </div>

            <SkeletonBlock className="h-52 rounded-3xl" />
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonBlock className="h-36" />
          <SkeletonBlock className="h-36" />
          <SkeletonBlock className="h-36" />
          <SkeletonBlock className="h-36" />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SkeletonBlock className="h-72" />
          <SkeletonBlock className="h-72" />
        </section>
      </div>
    </main>
  );
}
