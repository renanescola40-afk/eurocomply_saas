import Link from 'next/link';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { locales, type Locale } from '@/lib/i18n/routing';

const copy: Record<Locale, { required: (plan: string) => string; upgrades: string; plans: string; truth: string }> = {
  en: { required: (plan) => `${plan} plan required`, upgrades: 'Explore upgrade options', plans: 'Compare plans', truth: 'Access changes only after billing confirms the entitlement.' },
  pt: { required: (plan) => `Plano ${plan} requerido`, upgrades: 'Explorar opções de upgrade', plans: 'Comparar planos', truth: 'O acesso só muda depois de o billing confirmar o entitlement.' },
  es: { required: (plan) => `Se requiere el plan ${plan}`, upgrades: 'Explorar opciones de upgrade', plans: 'Comparar planes', truth: 'El acceso solo cambia después de que billing confirme el entitlement.' },
  fr: { required: (plan) => `Plan ${plan} requis`, upgrades: 'Explorer les options de mise à niveau', plans: 'Comparer les plans', truth: 'L’accès ne change qu’après confirmation de l’entitlement par la facturation.' },
  it: { required: (plan) => `Piano ${plan} richiesto`, upgrades: 'Esplora opzioni di upgrade', plans: 'Confronta piani', truth: 'L’accesso cambia solo dopo la conferma dell’entitlement da parte del billing.' },
  de: { required: (plan) => `${plan}-Plan erforderlich`, upgrades: 'Upgrade-Optionen ansehen', plans: 'Pläne vergleichen', truth: 'Zugriff ändert sich erst nach Bestätigung des Entitlements durch Billing.' },
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
  addOnSlug,
}: {
  locale: string;
  title: string;
  description: string;
  requiredPlan?: string;
  ctaLabel?: string;
  addOnSlug?: string;
}) {
  const localized = getCopy(locale);
  const addOnQuery = addOnSlug ? `?addon=${encodeURIComponent(addOnSlug)}` : '';

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
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{localized.truth}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="rounded-full">
            <Link href={`/${locale}/dashboard/organizations/add-ons${addOnQuery}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {ctaLabel ?? localized.upgrades} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href={`/${locale}/pricing`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {localized.plans}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
