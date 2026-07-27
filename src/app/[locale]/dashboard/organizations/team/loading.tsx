export default function OrganizationTeamLoading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#050505_0%,#080b12_46%,#050505_100%)] px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading team and Enterprise access">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="h-48 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.035]" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="h-96 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.035]" />
          <div className="h-96 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.035]" />
        </div>
      </div>
    </main>
  );
}
