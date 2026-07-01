'use client';

export default function SalesConsoleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.14),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-red-400/20 bg-red-500/10 p-8 shadow-2xl backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-100/60">Internal Lead Operations</p>
          <h1 className="mt-3 text-3xl font-semibold">Sales Console could not load safely</h1>
          <p className="mt-3 text-sm leading-6 text-red-50/70">
            The request failed without exposing lead data or internal details. Retry after confirming your platform admin access.
          </p>
          <button type="button" onClick={reset} className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">
            Retry securely
          </button>
        </section>
      </div>
    </main>
  );
}
