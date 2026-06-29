import { Skeleton } from '@/components/ui/skeleton';

export default function LocaleLoading() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-25" />
      <div className="relative mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl bg-muted/65" />
            <Skeleton className="h-5 w-36 bg-muted/65" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full bg-muted/65" />
        </div>

        <section className="grid gap-12 py-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="space-y-6">
            <Skeleton className="h-9 w-64 rounded-full bg-muted/65" />
            <Skeleton className="h-16 w-full max-w-3xl bg-muted/65" />
            <Skeleton className="h-16 w-11/12 max-w-2xl bg-muted/65" />
            <Skeleton className="h-7 w-4/5 max-w-xl bg-muted/65" />
            <div className="flex gap-3">
              <Skeleton className="h-14 w-44 rounded-full bg-muted/65" />
              <Skeleton className="h-14 w-36 rounded-full bg-muted/65" />
            </div>
          </div>
          <div className="enterprise-panel rounded-[2rem] p-6">
            <Skeleton className="h-8 w-48 bg-muted/65" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-2xl bg-muted/65" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
