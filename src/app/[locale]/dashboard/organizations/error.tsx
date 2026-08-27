'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardOrganizationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] render_error', { digest: error.digest, name: error.name });
  }, [error]);

  return (
    <main className="py-8 text-white">
      <section className="mx-auto max-w-2xl rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/[0.08] text-red-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/32">Dashboard unavailable</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white/90">We could not load the organization dashboard safely.</h1>
            <p className="mt-3 text-sm leading-6 text-white/45">
              The route is protected with no-store caching, so retrying will fetch a fresh server response instead of reusing stale tenant data.
            </p>
            <Button type="button" onClick={reset} className="mt-5 bg-emerald-300 text-[#06100d] hover:bg-emerald-200">
              <RotateCw className="mr-2 h-4 w-4" /> Retry dashboard
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
