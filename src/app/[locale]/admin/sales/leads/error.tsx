'use client';

export default function SalesConsoleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e18] px-4 py-8 text-white sm:px-6">
      <section className="w-full max-w-2xl rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-6 sm:p-8" role="alert">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-300/70">Internal Lead Operations</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-100">Sales Console could not load safely</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          The request failed without exposing lead data or internal details. Retry after confirming your platform admin access.
        </p>
        <button type="button" onClick={reset} className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
          Retry securely
        </button>
      </section>
    </main>
  );
}
