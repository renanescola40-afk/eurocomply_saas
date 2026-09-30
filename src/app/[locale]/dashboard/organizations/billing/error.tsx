'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[billing] render_error', { digest: error.digest, name: error.name });
  }, [error]);

  return (
    <main className="min-h-0 bg-transparent py-6 text-white">
      <section className="max-w-2xl rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-5 sm:p-6" role="alert">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-200">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-300/70">Billing unavailable</p>
            <h1 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-slate-100">We could not load billing safely.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Billing data is private and no-store. Retry to re-fetch usage and subscription state from the server.
            </p>
            <Button type="button" onClick={reset} className="mt-5 h-10 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40">
              <RotateCw className="h-4 w-4" aria-hidden="true" /> Retry billing
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
