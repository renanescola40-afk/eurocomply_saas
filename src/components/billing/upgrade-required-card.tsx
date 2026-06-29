import Link from 'next/link';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UpgradeRequiredCard({
  locale,
  title,
  description,
  requiredPlan = 'Business',
  ctaLabel = 'Ver planos',
}: {
  locale: string;
  title: string;
  description: string;
  requiredPlan?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="enterprise-panel rounded-[2rem] p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="enterprise-kicker mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-accent/50 px-3 py-1">
            <LockKeyhole className="h-3.5 w-3.5" />
            Plano {requiredPlan} requerido
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-4xl">{title}</h1>
          <p className="enterprise-muted mt-3 text-sm leading-6 md:text-base">{description}</p>
        </div>
        <Button asChild className="rounded-full">
          <Link href={`/${locale}/pricing`}>
            {ctaLabel} <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
