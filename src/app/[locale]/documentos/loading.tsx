function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export default function DocumentsLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8 md:py-12" aria-label="Loading documents">
        <section className="rounded-[2rem] border bg-background/90 p-6 shadow-xl shadow-primary/5 md:p-8">
          <SkeletonBlock className="h-5 w-40 rounded-full" />
          <SkeletonBlock className="mt-5 h-10 max-w-2xl" />
          <SkeletonBlock className="mt-4 h-5 max-w-xl rounded-full" />
        </section>
        <SkeletonBlock className="h-20 rounded-[1.5rem]" />
        <SkeletonBlock className="h-24 rounded-[2rem]" />
        <section className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-40 rounded-[1.5rem]" />
          ))}
        </section>
      </div>
    </main>
  );
}
