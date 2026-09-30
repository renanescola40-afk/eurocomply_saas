'use client';

import { useEffect } from 'react';

export default function OrganizationTeamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[enterprise-access-console] page_render_failed', {
      name: error.name,
      digest: error.digest ?? 'unavailable',
    });
  }, [error]);

  return (
    <main className="min-h-0 bg-transparent py-6 text-white">
      <section className="max-w-xl rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-5 sm:p-6" role="alert">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-300/70">Enterprise access unavailable</p>
        <h1 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-slate-100">The access console could not be loaded</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          No access mutation was performed. Retry the tenant-scoped page request or return after the runtime services recover.
        </p>
        <button type="button" onClick={reset} className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
          Retry safely
        </button>
      </section>
    </main>
  );
}
