export default function SalesConsoleLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <div className="h-4 w-56 animate-pulse rounded-full bg-white/10" />
          <div className="h-12 w-80 max-w-full animate-pulse rounded-2xl bg-white/10" />
          <div className="h-5 w-[34rem] max-w-full animate-pulse rounded-full bg-white/10" />
        </header>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
              <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
              <div className="mt-4 h-8 w-12 animate-pulse rounded-xl bg-white/10" />
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl">
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-5">
                <div className="h-4 animate-pulse rounded-full bg-white/10 md:col-span-2" />
                <div className="h-4 animate-pulse rounded-full bg-white/10" />
                <div className="h-4 animate-pulse rounded-full bg-white/10" />
                <div className="h-4 animate-pulse rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
