'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[documents] render_error', { digest: error.digest, name: error.name });
  }, [error]);

  return (
    <main className="min-h-0 bg-transparent">
      <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-6 text-white md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-rose-400/10 p-3 text-rose-300">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Documents unavailable</p>
            <h1 className="text-3xl font-semibold tracking-tight">We could not load controlled documents.</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">
              Document metadata is tenant-scoped and served no-store; retry to fetch a fresh paginated response.
            </p>
            <Button type="button" onClick={reset} className="h-10 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700">
              <RotateCw className="h-4 w-4" aria-hidden="true" /> Retry documents
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
