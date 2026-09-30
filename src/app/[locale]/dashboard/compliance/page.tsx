export default function Page() {
  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">Compliance workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Organize internal reviews, tasks, supporting material and exports in one place.
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6">
          <p className="text-sm font-semibold text-slate-100">Compliance operations</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            Use this workspace as the central surface for review activity and supporting compliance work.
          </p>
        </section>
      </div>
    </main>
  );
}
