import Link from 'next/link';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { locales, type Locale } from '@/lib/i18n/routing';

const copy: Record<Locale, { required: (plan: string) => string; plans: string }> = {
  en: { required: (plan) => `${plan} plan required`, plans: 'View plans' },
  pt: { required: (plan) => `Plano ${plan} requerido`, plans: 'Ver planos' },
  es: { required: (plan) => `Se requiere el plan ${plan}`, plans: 'Ver planes' },
  fr: { required: (plan) => `Plan ${plan} requis`, plans: 'Voir les plans' },
  it: { required: (plan) => `Piano ${plan} richiesto`, plans: 'Vedi piani' },
  de: { required: (plan) => `${plan}-Plan erforderlich`, plans: 'Pläne ansehen' },
};

function getCopy(locale: string) {
  const normalized = locales.includes(locale as Locale) ? (locale as Locale) : 'en';
  return copy[normalized];
}

export function UpgradeRequiredCard({
  locale,
  title,
  description,
  requiredPlan = 'Business',
  ctaLabel,
}: {
  locale: string;
  title: string;
  description: string;
  requiredPlan?: string;
  ctaLabel?: string;
}) {
  const localized = getCopy(locale);

  return (
    <section className="enterprise-panel rounded-[2rem] p-8" aria-labelledby="upgrade-required-title">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="enterprise-kicker mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-accent/50 px-3 py-1">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            {localized.required(requiredPlan)}
          </div>
          <h1 id="upgrade-required-title" className="text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-4xl">{title}</h1>
          <p className="enterprise-muted mt-3 text-sm leading-6 md:text-base">{description}</p>
        </div>
        <Button asChild className="rounded-full">
          <Link href={`/${locale}/pricing`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {ctaLabel ?? localized.plans} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
