import Link from 'next/link';
import { ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react';

import type { BillingPlan } from '@/lib/billing/plans';
import { locales, type Locale } from '@/lib/i18n/routing';
import { BillingActionButton } from './billing-action-button';

type Props = {
  locale: string;
  selectedPlan: BillingPlan;
  canManageBilling: boolean;
};

type Copy = {
  eyebrow: string;
  title: (planName: string) => string;
  body: string;
  continuePlan: (planName: string) => string;
  contactSales: (planName: string) => string;
  ownerRequired: string;
};

const copyByLocale: Record<Locale, Copy> = {
  en: {
    eyebrow: 'Selected during onboarding',
    title: (planName) => `${planName} is ready to continue`,
    body: 'Your selection is preserved here. Commercial access is granted only after the normal checkout or sales-led activation completes.',
    continuePlan: (planName) => `Continue with ${planName}`,
    contactSales: (planName) => `Continue with ${planName} sales`,
    ownerRequired: 'Owner action required',
  },
  pt: {
    eyebrow: 'Selecionado durante a configuração',
    title: (planName) => `${planName} está pronto para continuar`,
    body: 'A sua seleção foi preservada. O acesso comercial só é concedido depois de o processo normal de pagamento ou a ativação assistida por vendas terminar.',
    continuePlan: (planName) => `Continuar com ${planName}`,
    contactSales: (planName) => `Continuar com vendas para ${planName}`,
    ownerRequired: 'É necessária ação do proprietário',
  },
  es: {
    eyebrow: 'Seleccionado durante la configuración',
    title: (planName) => `${planName} está listo para continuar`,
    body: 'Tu selección se ha conservado. El acceso comercial solo se concede cuando finaliza el proceso normal de pago o la activación asistida por ventas.',
    continuePlan: (planName) => `Continuar con ${planName}`,
    contactSales: (planName) => `Continuar con ventas para ${planName}`,
    ownerRequired: 'Se requiere acción del propietario',
  },
  fr: {
    eyebrow: 'Sélectionné pendant la configuration',
    title: (planName) => `${planName} est prêt à continuer`,
    body: 'Votre sélection est conservée. L’accès commercial n’est accordé qu’après la fin du processus normal de paiement ou de l’activation assistée par les ventes.',
    continuePlan: (planName) => `Continuer avec ${planName}`,
    contactSales: (planName) => `Continuer avec les ventes pour ${planName}`,
    ownerRequired: 'Action du propriétaire requise',
  },
  it: {
    eyebrow: 'Selezionato durante la configurazione',
    title: (planName) => `${planName} è pronto per continuare`,
    body: 'La selezione è stata conservata. L’accesso commerciale viene concesso solo dopo il completamento del normale processo di pagamento o dell’attivazione assistita dalle vendite.',
    continuePlan: (planName) => `Continua con ${planName}`,
    contactSales: (planName) => `Continua con le vendite per ${planName}`,
    ownerRequired: 'È richiesta un’azione del proprietario',
  },
  de: {
    eyebrow: 'Bei der Einrichtung ausgewählt',
    title: (planName) => `${planName} kann fortgesetzt werden`,
    body: 'Ihre Auswahl bleibt erhalten. Kommerzieller Zugriff wird erst nach dem regulären Zahlungsvorgang oder der vertriebsgeführten Aktivierung gewährt.',
    continuePlan: (planName) => `Mit ${planName} fortfahren`,
    contactSales: (planName) => `${planName} mit dem Vertrieb fortsetzen`,
    ownerRequired: 'Aktion des Inhabers erforderlich',
  },
};

function safeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

export function BillingPlanIntentBanner({ locale, selectedPlan, canManageBilling }: Props) {
  const copy = copyByLocale[safeLocale(locale)];

  return (
    <aside
      aria-labelledby="selected-plan-title"
      className="relative z-10 mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8"
    >
      <div className="rounded-[1.5rem] border border-cyan-200/20 bg-cyan-200/[0.06] p-5 text-white shadow-[0_18px_55px_rgba(0,0,0,.24)] backdrop-blur md:flex md:items-center md:justify-between md:gap-6">
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100/65">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h2 id="selected-plan-title" className="mt-2 text-xl font-semibold tracking-[-0.025em]">
            {copy.title(selectedPlan.name)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/58">{copy.body}</p>
        </div>

        <div className="mt-4 shrink-0 md:mt-0">
          {!canManageBilling ? (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex h-11 max-w-full items-center justify-center gap-2 rounded-full border border-white/10 px-5 text-sm font-semibold text-white/40 disabled:cursor-not-allowed"
            >
              <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />
              {copy.ownerRequired}
            </button>
          ) : selectedPlan.salesLed ? (
            <Link
              href={`/${locale}/contact?intent=sales&plan=${selectedPlan.id}&source=onboarding`}
              className="inline-flex h-11 max-w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              {copy.contactSales(selectedPlan.name)}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <BillingActionButton
              action="checkout"
              locale={locale}
              planId={selectedPlan.id}
              className="h-11 max-w-full rounded-full px-5"
            >
              {copy.continuePlan(selectedPlan.name)}
            </BillingActionButton>
          )}
        </div>
      </div>
    </aside>
  );
}
