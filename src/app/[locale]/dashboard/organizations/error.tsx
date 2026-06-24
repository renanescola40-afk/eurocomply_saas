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
    <main className="min-h-screen bg-background px-4 py-16">
      <section className="mx-auto max-w-2xl rounded-[2rem] border bg-card p-8 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Dashboard unavailable</p>
            <h1 className="text-3xl font-semibold tracking-tight">We could not load the organization dashboard safely.</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              The route is protected with no-store caching, so retrying will fetch a fresh server response instead of reusing stale tenant data.
            </p>
            <Button type="button" onClick={reset} className="rounded-full">
              <RotateCw className="h-4 w-4" /> Retry dashboard
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
