import Link from 'next/link';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UpgradeRequiredCard({
  locale,
  title,
  description,
  requiredPlan = 'Business',
}: {
  locale: string;
  title: string;
  description: string;
  requiredPlan?: string;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
            <LockKeyhole className="h-3.5 w-3.5" />
            Plano {requiredPlan} requerido
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/65 md:text-base">{description}</p>
        </div>
        <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-white/90">
          <Link href={`/${locale}/pricing`}>
            Ver planos <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
