import { Skeleton } from '@/components/ui/skeleton';

export default function LocaleLoading() {
  return (
    <main className="min-h-screen bg-[#080e18] text-white" aria-busy="true" aria-label="Loading RISCK COMPLY">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg bg-[#0d1624]" />
            <Skeleton className="h-5 w-36 rounded bg-[#0d1624]" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg bg-[#0d1624]" />
        </div>

        <section className="grid gap-8 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-20">
          <div className="space-y-4">
            <Skeleton className="h-4 w-48 rounded bg-[#0d1624]" />
            <Skeleton className="h-12 w-full max-w-3xl rounded-lg bg-[#0d1624]" />
            <Skeleton className="h-12 w-11/12 max-w-2xl rounded-lg bg-[#0d1624]" />
            <Skeleton className="h-5 w-4/5 max-w-xl rounded bg-[#0d1624]" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-40 rounded-lg bg-[#0d1624]" />
              <Skeleton className="h-10 w-32 rounded-lg bg-[#0d1624]" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6">
            <Skeleton className="h-5 w-48 rounded bg-[#0d1624]" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl border border-slate-800 bg-[#0d1624]" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
