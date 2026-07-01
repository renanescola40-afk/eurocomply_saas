export default function SalesConsoleLoading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-6 w-48 animate-pulse rounded-full bg-white/10" />
        <div className="h-12 w-72 animate-pulse rounded-2xl bg-white/10" />
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.04]" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
      </div>
    </main>
  );
}
