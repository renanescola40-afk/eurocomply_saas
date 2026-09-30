export default function OrganizationTeamLoading() {
  return (
    <main className="min-h-0 bg-transparent" aria-busy="true" aria-label="Loading team and Enterprise access">
      <div className="w-full space-y-6">
        <div className="h-36 animate-pulse rounded-xl border border-slate-800 bg-[#0b121e]" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-800 bg-[#0d1624]" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="h-80 animate-pulse rounded-xl border border-slate-800 bg-[#0b121e]" />
          <div className="h-80 animate-pulse rounded-xl border border-slate-800 bg-[#0b121e]" />
        </div>
      </div>
    </main>
  );
}
