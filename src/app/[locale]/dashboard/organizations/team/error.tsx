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
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#050505_0%,#080b12_46%,#050505_100%)] px-6 py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-red-300/20 bg-red-400/[0.08] p-8 text-center shadow-2xl shadow-black/30" role="alert">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200/70">Enterprise access unavailable</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">The access console could not be loaded</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          No access mutation was performed. Retry the tenant-scoped page request or return after the runtime services recover.
        </p>
        <button type="button" onClick={reset} className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90">
          Retry safely
        </button>
      </section>
    </main>
  );
}
