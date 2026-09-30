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
    <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-6 text-white md:p-8" aria-labelledby="upgrade-required-title">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            {localized.required(requiredPlan)}
          </div>
          <h1 id="upgrade-required-title" className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">{description}</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">{localized.truth}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="h-10 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700">
            <Link href={`/${locale}/dashboard/organizations/add-ons${addOnQuery}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b121e]">
              {ctaLabel ?? localized.upgrades} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-lg border-slate-700 bg-[#0d1624] px-4 text-slate-100 hover:bg-slate-800 hover:text-white">
            <Link href={`/${locale}/pricing`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b121e]">
              {localized.plans}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
