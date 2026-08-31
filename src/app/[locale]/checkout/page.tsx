import Image from 'next/image';
import Link from 'next/link';

import { BillingActionButton } from '@/app/[locale]/dashboard/organizations/billing/billing-action-button';
import { PublicFooter } from '@/components/marketing/public-footer';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';
import { getBillingFeatureLabel } from '@/lib/i18n/billing-feature-labels';
import { getCommercialSurfaceCopy, type CommercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getSafeLocale } from '@/lib/seo/public-metadata';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

const DEFAULT_PLAN_ID = 'professional';
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
const PAYMENT_RECOVERY_STATUSES = new Set(['past_due', 'unpaid', 'incomplete']);

const paymentRecoveryCopy: Record<Locale, { title: string; body: string; action: string; badge: string }> = {
  en: { title: 'Payment requires attention', body: 'Your workspace is protected while the subscription needs payment attention. Open secure billing to update the payment method or complete the outstanding payment.', action: 'Resolve payment securely', badge: 'Payment action' },
  pt: { title: 'O pagamento requer atenção', body: 'O seu espaço de trabalho permanece protegido enquanto a subscrição precisa de regularização. Abra a faturação segura para atualizar o método de pagamento ou concluir o pagamento pendente.', action: 'Regularizar pagamento', badge: 'Ação de pagamento' },
  es: { title: 'El pago requiere atención', body: 'Tu espacio de trabajo permanece protegido mientras la suscripción necesita regularización. Abre la facturación segura para actualizar el método de pago o completar el pago pendiente.', action: 'Resolver el pago', badge: 'Acción de pago' },
  fr: { title: 'Le paiement nécessite votre attention', body: 'Votre espace de travail reste protégé pendant la régularisation de l’abonnement. Ouvrez la facturation sécurisée pour mettre à jour le moyen de paiement ou finaliser le paiement en attente.', action: 'Régulariser le paiement', badge: 'Action de paiement' },
  it: { title: 'Il pagamento richiede attenzione', body: 'Lo spazio di lavoro resta protetto mentre l’abbonamento necessita di regolarizzazione. Apri la fatturazione sicura per aggiornare il metodo di pagamento o completare il pagamento in sospeso.', action: 'Regolarizza il pagamento', badge: 'Azione di pagamento' },
  de: { title: 'Die Zahlung erfordert Aufmerksamkeit', body: 'Ihr Arbeitsbereich bleibt geschützt, während das Abonnement eine Zahlungsaktion erfordert. Öffnen Sie die sichere Abrechnung, um die Zahlungsmethode zu aktualisieren oder die offene Zahlung abzuschließen.', action: 'Zahlung klären', badge: 'Zahlungsaktion' },
};

type CheckoutSearchParams = {
  plan?: string | string[];
  checkout?: string | string[];
};

type CheckoutPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<CheckoutSearchParams>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatCheckoutLimit(
  plan: (typeof BILLING_PLANS)[number],
  value: number,
  locale: string,
  copy: CommercialSurfaceCopy['checkout'],
) {
  return plan.id === 'enterprise' || value === Number.MAX_SAFE_INTEGER ? copy.byContract : formatNumber(value, locale);
}

function hasStatus(status: string | null | undefined, statuses: Set<string>) {
  return Boolean(status && statuses.has(status));
}

function planPriceLabel(plan: (typeof BILLING_PLANS)[number], locale: string, copy: CommercialSurfaceCopy['checkout']) {
  if (plan.priceMonthly != null) return `€${formatNumber(plan.priceMonthly, locale)}`;
  if (plan.startingPriceMonthly != null) return `${getCommercialSurfaceCopy(getSafeLocale(locale)).pricing.from} €${formatNumber(plan.startingPriceMonthly, locale)}`;
  return copy.contactSales;
}

function checkoutMessage(status: string | undefined, copy: CommercialSurfaceCopy['checkout']) {
  if (status === 'cancelled') {
    return {
      title: copy.cancelledTitle,
      description: copy.cancelledBody,
      className: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    };
  }

  if (status === 'error') {
    return {
      title: copy.errorTitle,
      description: copy.errorBody,
      className: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
    };
  }

  return null;
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const [{ locale: requestedLocale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as CheckoutSearchParams),
  ]);
  const locale = getSafeLocale(requestedLocale);
  const copy = getCommercialSurfaceCopy(locale).checkout;
  const recoveryCopy = paymentRecoveryCopy[locales.includes(locale as Locale) ? (locale as Locale) : 'en'];
  const selectedPlanId = firstSearchParam(resolvedSearchParams.plan);
  const checkoutStatus = firstSearchParam(resolvedSearchParams.checkout);
  const selectedPlan = getBillingPlan(selectedPlanId) ?? getBillingPlan(DEFAULT_PLAN_ID) ?? BILLING_PLANS[1];
  const selectedPlanIsSalesLed = selectedPlan.salesLed;
  const user = await getCurrentUser();
  const organization = user ? await getCurrentOrganizationForUser(user.id).catch(() => null) : null;
  const billing = organization ? await getOrganizationBillingContext(organization.id).catch(() => null) : null;
  const selectedPlanIsCurrent = billing?.plan === selectedPlan.id && hasStatus(billing.status, ACTIVE_SUBSCRIPTION_STATUSES);
  const needsPaymentRecovery = hasStatus(billing?.status, PAYMENT_RECOVERY_STATUSES);
  const message = checkoutMessage(checkoutStatus, copy);
  const checkoutContinuationPath = `/${locale}/checkout?plan=${selectedPlan.id}`;
  const onboardingPath = `/${locale}/onboarding?plan=${encodeURIComponent(selectedPlan.id)}`;
  const salesLedPath = `/${locale}/contact?intent=sales&plan=${selectedPlan.id}`;
  const billingDashboardPath = `/${locale}/dashboard/organizations/billing`;
  const priceLabel = planPriceLabel(selectedPlan, locale, copy);

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <header className="border-b border-white/10 bg-[#05060a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <Link
            href={`/${locale}`}
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]"
            aria-label="RISCK COMPLY home"
          >
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={220} height={46} priority className="h-8 w-auto sm:h-9" />
          </Link>
          <nav className="flex min-w-0 items-center justify-end gap-1 text-xs sm:gap-2 sm:text-sm" aria-label={copy.navLabel}>
            <Link href={`/${locale}/pricing`} className="hidden rounded-full border border-white/15 px-3 py-2 font-medium text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 sm:inline-flex">{copy.plans}</Link>
            {user && needsPaymentRecovery ? (
              <BillingActionButton action="portal" locale={locale} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90 sm:px-4 sm:text-sm">{recoveryCopy.action}</BillingActionButton>
            ) : user ? (
              <Link href={billingDashboardPath} className="rounded-full bg-white px-3 py-2 font-semibold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 sm:px-4">{copy.billing}</Link>
            ) : selectedPlanIsSalesLed ? (
              <Link href={salesLedPath} className="rounded-full bg-white px-3 py-2 font-semibold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 sm:px-4">{copy.talkToSales}</Link>
            ) : (
              <Link href={`/${locale}/login?next=${encodeURIComponent(checkoutContinuationPath)}`} className="rounded-full bg-white px-3 py-2 font-semibold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 sm:px-4">{copy.signIn}</Link>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10" aria-labelledby="checkout-title">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-20 h-[24rem] w-[24rem] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">{copy.heroEyebrow}</p>
            <h1 id="checkout-title" className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">{copy.heroTitle}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{copy.heroSubtitle}</p>

            {message && (
              <div className={`mt-6 rounded-2xl border p-4 ${message.className}`} role="status" aria-live="polite">
                <p className="font-semibold">{message.title}</p>
                <p className="mt-1 text-sm opacity-85">{message.description}</p>
              </div>
            )}

            {needsPaymentRecovery && (
              <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100" role="alert">
                <p className="font-semibold">{recoveryCopy.title}</p>
                <p className="mt-1 text-sm opacity-85">{recoveryCopy.body}</p>
              </div>
            )}

            {selectedPlanIsSalesLed && !selectedPlanIsCurrent && !needsPaymentRecovery && (
              <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-emerald-100" role="status">
                <p className="font-semibold">{copy.salesLedTitle(selectedPlan.name)}</p>
                <p className="mt-1 text-sm opacity-85">{copy.salesLedBody}</p>
              </div>
            )}

            {selectedPlanIsCurrent && !needsPaymentRecovery && (
              <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-emerald-100" role="status">
                <p className="font-semibold">{copy.currentTitle}</p>
                <p className="mt-1 text-sm opacity-85">{copy.currentBody}</p>
              </div>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {copy.proof.map(({ title, body }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl" aria-label={copy.orderSummary}>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{copy.orderSummary}</p>
            <div className="mt-5 rounded-[1.5rem] border border-blue-300/30 bg-blue-400/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-semibold">{selectedPlan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-blue-100/80">{selectedPlanIsSalesLed && !selectedPlanIsCurrent && !needsPaymentRecovery ? copy.salesLedSummary : copy.monthlySummary}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-950">{needsPaymentRecovery ? recoveryCopy.badge : selectedPlanIsCurrent ? copy.currentBadge : selectedPlanIsSalesLed ? copy.salesLedBadge : copy.selectedBadge}</span>
              </div>
              <p className="mt-6 text-5xl font-bold">{priceLabel}{selectedPlan.startingPriceMonthly != null || selectedPlan.priceMonthly != null ? <span className="text-base font-normal text-blue-100/70">{copy.month}</span> : null}</p>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              {[
                [copy.users, selectedPlan.limits.users],
                [copy.documents, selectedPlan.limits.documents],
                [copy.vendors, selectedPlan.limits.vendors],
                [copy.risks, selectedPlan.limits.risks],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-white">{formatCheckoutLimit(selectedPlan, Number(value), locale, copy)}</p>
                </div>
              ))}
            </div>

            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              {selectedPlan.features.slice(0, 6).map((feature) => (
                <li key={feature} className="flex gap-3"><span className="text-emerald-300" aria-hidden="true">✓</span><span>{getBillingFeatureLabel(locale, feature)}</span></li>
              ))}
            </ul>

            {needsPaymentRecovery && organization ? (
              <div className="mt-6">
                <BillingActionButton action="portal" locale={locale} className="flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">{recoveryCopy.action}</BillingActionButton>
                <p className="mt-3 text-center text-xs text-slate-500">{copy.workspace}: {organization.name}</p>
              </div>
            ) : selectedPlanIsCurrent && organization ? (
              <div className="mt-6">
                <BillingActionButton action="checkout" locale={locale} planId={selectedPlan.id} disabled className="flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/40">{copy.currentPlan}</BillingActionButton>
                <p className="mt-3 text-center text-xs text-slate-500">{copy.workspace}: {organization.name}</p>
              </div>
            ) : selectedPlanIsSalesLed ? (
              <div className="mt-6">
                <Link href={salesLedPath} className="flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{copy.talkToSales}</Link>
                <p className="mt-3 text-center text-xs text-slate-500">{copy.salesLedActivation}</p>
              </div>
            ) : organization ? (
              <div className="mt-6">
                <BillingActionButton action="checkout" locale={locale} planId={selectedPlan.id} disabled={selectedPlanIsCurrent} className="flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/40">{selectedPlanIsCurrent ? copy.currentPlan : copy.continueSecureCheckout}</BillingActionButton>
                <p className="mt-3 text-center text-xs text-slate-500">{copy.workspace}: {organization.name}</p>
              </div>
            ) : user ? (
              <Link href={onboardingPath} className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{copy.createWorkspace}</Link>
            ) : (
              <div className="mt-6 grid gap-3">
                <Link href={`/${locale}/signup?plan=${selectedPlan.id}&next=${encodeURIComponent(checkoutContinuationPath)}`} className="flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{copy.createAccount}</Link>
                <Link href={`/${locale}/login?next=${encodeURIComponent(checkoutContinuationPath)}`} className="flex h-12 w-full items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{copy.signInContinue}</Link>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr]" aria-labelledby="checkout-flow-title">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{copy.flowEyebrow}</p>
          <h2 id="checkout-flow-title" className="mt-4 text-3xl font-semibold">{copy.flowTitle}</h2>
          <div className="mt-6 grid gap-3">
            {copy.steps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950" aria-hidden="true">{index + 1}</span>
                <p className="text-sm leading-6 text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BILLING_PLANS.map((plan) => {
            const isSelected = plan.id === selectedPlan.id;
            const isPlanSalesLed = plan.salesLed;

            return (
              <Link key={plan.id} href={isPlanSalesLed ? `/${locale}/contact?intent=sales&plan=${plan.id}` : `/${locale}/checkout?plan=${plan.id}`} className={`rounded-[1.5rem] border p-5 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${isSelected ? 'border-blue-300 bg-white text-slate-950' : 'border-white/10 bg-slate-950 text-white hover:bg-white/[0.04]'}`} aria-current={isSelected ? 'page' : undefined}>
                <p className="text-lg font-semibold">{plan.name}</p>
                <p className={`mt-2 text-3xl font-bold ${isSelected ? 'text-slate-950' : 'text-white'}`}>{planPriceLabel(plan, locale, copy)}</p>
                <p className={`mt-2 text-xs ${isSelected ? 'text-slate-600' : 'text-slate-500'}`}>{isPlanSalesLed ? copy.salesLed : copy.perMonth}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}