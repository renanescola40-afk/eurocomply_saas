export default function SalesConsoleLoading() {
  return (
    <main className="min-h-screen bg-[#080e18] text-white" aria-busy="true" aria-label="Loading Sales Console">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-3 border-b border-slate-800 pb-5">
          <div className="h-3 w-48 animate-pulse rounded bg-[#0d1624]" />
          <div className="h-8 w-72 max-w-full animate-pulse rounded-lg bg-[#0d1624]" />
          <div className="h-4 w-[34rem] max-w-full animate-pulse rounded bg-[#0d1624]" />
        </header>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-slate-800 bg-[#0b121e] p-4">
              <div className="h-3 w-24 animate-pulse rounded bg-[#0d1624]" />
              <div className="mt-3 h-7 w-12 animate-pulse rounded-lg bg-[#0d1624]" />
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e] p-4 sm:p-5">
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-slate-800 bg-[#0d1624] p-4 md:grid-cols-5">
                <div className="h-4 animate-pulse rounded bg-slate-800 md:col-span-2" />
                <div className="h-4 animate-pulse rounded bg-slate-800" />
                <div className="h-4 animate-pulse rounded bg-slate-800" />
                <div className="h-4 animate-pulse rounded bg-slate-800" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
