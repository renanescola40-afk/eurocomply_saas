import { createHash } from 'node:crypto';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

import { OnboardingRuntimeBoundary as B2BOnboardingFlowRuntimeBoundary } from '@/components/onboarding/onboarding-runtime-boundary';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';
import { locales, type Locale } from '@/lib/i18n/routing';
import { toOnboardingMutationFailure, type OnboardingMutationResult } from '@/lib/onboarding/action-failure';
import { slugifyOrganization, type OnboardingActivationInput, type OnboardingDraftInput } from '@/lib/onboarding/activation';
import { getOnboardingPlanIntent } from '@/lib/onboarding/plan-intent';
import { completeOnboardingActivation, saveOnboardingDraft } from '@/server/actions/onboarding';
import { createOrganization } from '@/server/actions/organizations';
import { getCurrentUser } from '@/server/queries/auth';
import { getOnboardingActivationState } from '@/server/queries/onboarding';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';

type OnboardingSearchParams = {
  plan?: string;
  purchase_error?: string;
};

type OnboardingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<OnboardingSearchParams>;
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

function getPlanQuery(planId?: string) {
  const plan = getBillingPlan(planId);
  return plan ? `?plan=${encodeURIComponent(plan.id)}` : '';
}

function getBillingRecoveryPath(locale: Locale, planId?: string) {
  const query = new URLSearchParams({ onboarding: 'payment_required' });
  const plan = getBillingPlan(planId);

  if (plan) {
    query.set('plan', plan.id);
  }

  return `/${locale}/dashboard/organizations/billing?${query.toString()}`;
}

function getPurchaseContextPath(locale: Locale, input?: { planId?: string; error?: string }) {
  const query = new URLSearchParams();
  const plan = getBillingPlan(input?.planId);

  if (plan) query.set('plan', plan.id);
  if (input?.error) query.set('purchase_error', input.error);

  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return `/${locale}/onboarding${suffix}`;
}

function getPurchaseCopy(locale: Locale) {
  switch (locale) {
    case 'pt':
      return {
        eyebrow: 'Pagamento obrigatório',
        title: 'Ative a sua subscrição antes de entrar no RISCK COMPLY',
        description: 'A conta serve apenas para identificar o comprador. O produto, onboarding operacional e dados de compliance permanecem bloqueados até a confirmação da subscrição.',
        companyLabel: 'Nome da empresa',
        companyPlaceholder: 'A sua empresa',
        planLabel: 'Plano',
        submit: 'Continuar para pagamento seguro',
        guardrail: 'Criar uma conta não desbloqueia nenhuma funcionalidade paga.',
        error: 'Não foi possível preparar o pagamento. Verifique o nome da empresa e tente novamente.',
      };
    case 'es':
      return {
        eyebrow: 'Pago obligatorio',
        title: 'Activa tu suscripción antes de entrar en RISCK COMPLY',
        description: 'La cuenta solo identifica al comprador. El producto, el onboarding operativo y los datos de cumplimiento permanecen bloqueados hasta confirmar la suscripción.',
        companyLabel: 'Nombre de la empresa',
        companyPlaceholder: 'Tu empresa',
        planLabel: 'Plan',
        submit: 'Continuar al pago seguro',
        guardrail: 'Crear una cuenta no desbloquea ninguna función de pago.',
        error: 'No se pudo preparar el pago. Revisa el nombre de la empresa e inténtalo de nuevo.',
      };
    case 'fr':
      return {
        eyebrow: 'Paiement requis',
        title: 'Activez votre abonnement avant d’accéder à RISCK COMPLY',
        description: 'Le compte sert uniquement à identifier l’acheteur. Le produit, l’onboarding opérationnel et les données de conformité restent bloqués jusqu’à confirmation de l’abonnement.',
        companyLabel: 'Nom de l’entreprise',
        companyPlaceholder: 'Votre entreprise',
        planLabel: 'Offre',
        submit: 'Continuer vers le paiement sécurisé',
        guardrail: 'Créer un compte ne débloque aucune fonctionnalité payante.',
        error: 'Impossible de préparer le paiement. Vérifiez le nom de l’entreprise et réessayez.',
      };
    case 'de':
      return {
        eyebrow: 'Zahlung erforderlich',
        title: 'Aktivieren Sie Ihr Abonnement, bevor Sie RISCK COMPLY nutzen',
        description: 'Das Konto dient nur zur Identifizierung des Käufers. Produkt, operatives Onboarding und Compliance-Daten bleiben bis zur bestätigten Subscription gesperrt.',
        companyLabel: 'Unternehmensname',
        companyPlaceholder: 'Ihr Unternehmen',
        planLabel: 'Plan',
        submit: 'Weiter zur sicheren Zahlung',
        guardrail: 'Das Erstellen eines Kontos schaltet keine kostenpflichtige Funktion frei.',
        error: 'Die Zahlung konnte nicht vorbereitet werden. Prüfen Sie den Unternehmensnamen und versuchen Sie es erneut.',
      };
    case 'it':
      return {
        eyebrow: 'Pagamento richiesto',
        title: 'Attiva l’abbonamento prima di entrare in RISCK COMPLY',
        description: 'L’account serve solo a identificare l’acquirente. Prodotto, onboarding operativo e dati di compliance restano bloccati finché l’abbonamento non viene confermato.',
        companyLabel: 'Nome dell’azienda',
        companyPlaceholder: 'La tua azienda',
        planLabel: 'Piano',
        submit: 'Continua al pagamento sicuro',
        guardrail: 'Creare un account non sblocca alcuna funzionalità a pagamento.',
        error: 'Impossibile preparare il pagamento. Controlla il nome dell’azienda e riprova.',
      };
    default:
      return {
        eyebrow: 'Payment required',
        title: 'Activate your subscription before entering RISCK COMPLY',
        description: 'The account only identifies the buyer. The product, operational onboarding and compliance data remain locked until the subscription is confirmed.',
        companyLabel: 'Company name',
        companyPlaceholder: 'Your company',
        planLabel: 'Plan',
        submit: 'Continue to secure payment',
        guardrail: 'Creating an account does not unlock any paid functionality.',
        error: 'We could not prepare payment. Check the company name and try again.',
      };
  }
}

function buildPurchaseSlug(organizationName: string, userId: string) {
  const normalized = slugifyOrganization(organizationName) || 'workspace';
  const suffix = createHash('sha256').update(userId).digest('hex').slice(0, 8);
  const maxBaseLength = 80 - suffix.length - 1;
  return `${normalized.slice(0, maxBaseLength).replace(/-+$/g, '') || 'workspace'}-${suffix}`;
}

async function requireLicensedOnboardingPageAccess(input: {
  organizationId: string;
  locale: Locale;
  planId?: string;
}) {
  let authority: Awaited<ReturnType<typeof getOrganizationBillingAuthority>>;

  try {
    authority = await getOrganizationBillingAuthority(input.organizationId);
  } catch {
    redirect(`/${input.locale}/pricing?billing=billing_authority_unavailable`);
  }

  if (!authority.licensed) {
    redirect(getBillingRecoveryPath(input.locale, input.planId));
  }

  return authority;
}

export default async function OnboardingPage({ params, searchParams }: OnboardingPageProps) {
  noStore();

  const emptySearchParams: OnboardingSearchParams = {};
  const [{ locale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(emptySearchParams),
  ]);
  const safeLocale = getSafeLocale(locale);
  const planQuery = getPlanQuery(resolvedSearchParams.plan);
  const requestedPlan = getOnboardingPlanIntent(resolvedSearchParams.plan);
  const requestedBillingPlan = getBillingPlan(resolvedSearchParams.plan) ?? getBillingPlan('professional')!;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
  }

  // Payment-first boundary: an authenticated account is not product access.
  // Resolve the tenant before loading any operational onboarding state. Existing
  // unlicensed tenants are sent directly to the narrow billing recovery lane.
  const organization = await getCurrentOrganizationForUser(user.id);
  if (organization?.id) {
    await requireLicensedOnboardingPageAccess({
      organizationId: organization.id,
      locale: safeLocale,
      planId: resolvedSearchParams.plan,
    });
  }

  if (!organization) {
    const copy = getPurchaseCopy(safeLocale);

    async function createPurchaseContext(formData: FormData) {
      'use server';

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        redirect(`/${safeLocale}/login?next=${encodeURIComponent(getPurchaseContextPath(safeLocale, { planId: resolvedSearchParams.plan }))}`);
      }

      const organizationName = String(formData.get('organizationName') ?? '').trim();
      const submittedPlan = String(formData.get('plan') ?? '').trim();
      const selectedPlan = getBillingPlan(submittedPlan) ?? requestedBillingPlan;

      if (organizationName.length < 2 || organizationName.length > 120) {
        redirect(getPurchaseContextPath(safeLocale, {
          planId: selectedPlan.id,
          error: 'invalid_company',
        }));
      }

      const existingOrganization = await getCurrentOrganizationForUser(currentUser.id);
      if (existingOrganization?.id) {
        redirect(getBillingRecoveryPath(safeLocale, selectedPlan.id));
      }

      try {
        await createOrganization({
          name: organizationName,
          slug: buildPurchaseSlug(organizationName, currentUser.id),
        });
      } catch {
        redirect(getPurchaseContextPath(safeLocale, {
          planId: selectedPlan.id,
          error: 'organization_create_failed',
        }));
      }

      redirect(getBillingRecoveryPath(safeLocale, selectedPlan.id));
    }

    return (
      <main className="min-h-screen bg-[#03070b] px-6 py-16 text-white">
        <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-10">
            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">{copy.eyebrow}</p>
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">{copy.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 md:text-base">{copy.description}</p>
            </div>

            {resolvedSearchParams.purchase_error ? (
              <div role="alert" className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {copy.error}
              </div>
            ) : null}

            <form action={createPurchaseContext} className="space-y-5">
              <div>
                <label htmlFor="organizationName" className="mb-2 block text-sm font-medium text-white/80">{copy.companyLabel}</label>
                <input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  minLength={2}
                  maxLength={120}
                  required
                  autoComplete="organization"
                  placeholder={copy.companyPlaceholder}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-white/30"
                />
              </div>

              <div>
                <label htmlFor="plan" className="mb-2 block text-sm font-medium text-white/80">{copy.planLabel}</label>
                <select
                  id="plan"
                  name="plan"
                  defaultValue={requestedBillingPlan.id}
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#0b0f13] px-4 text-sm text-white outline-none transition focus:border-white/30"
                >
                  {BILLING_PLANS.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}{plan.priceMonthly !== null ? ` — €${plan.priceMonthly}/mo` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                {copy.submit}
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-white/45">{copy.guardrail}</p>
          </div>
        </section>
      </main>
    );
  }

  // Only licensed tenants can reach this point and load operational onboarding
  // state such as AI systems, readiness recommendations, tasks and invitations.
  const initialState = await getOnboardingActivationState(user.id);

  if (initialState.organization?.isOnboardingCompleted) {
    redirect(`/${safeLocale}/dashboard`);
  }

  async function saveDraftFromOnboarding(input: OnboardingDraftInput): Promise<OnboardingMutationResult> {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
    }

    let result: Awaited<ReturnType<typeof saveOnboardingDraft>>;
    try {
      result = await saveOnboardingDraft(input);
    } catch (error) {
      return toOnboardingMutationFailure(error, safeLocale, 'save');
    }

    // This is defense in depth. Page entry already requires licensed=true, and
    // the action must re-check authority before the browser can continue.
    await requireLicensedOnboardingPageAccess({
      organizationId: result.organizationId,
      locale: safeLocale,
      planId: input.selectedPlan,
    });

    return { ok: true, ...result };
  }

  async function completeActivationFromOnboarding(input: OnboardingActivationInput): Promise<OnboardingMutationResult> {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/onboarding${planQuery}`)}`);
    }

    try {
      const result = await completeOnboardingActivation(input, safeLocale);
      return { ok: true, ...result };
    } catch (error) {
      return toOnboardingMutationFailure(error, safeLocale, 'complete');
    }
  }

  return (
    <main className="min-h-screen bg-[#03070b]">
      <B2BOnboardingFlowRuntimeBoundary
        locale={safeLocale}
        requestedPlan={requestedPlan}
        initialState={initialState}
        onSaveDraft={saveDraftFromOnboarding}
        onComplete={completeActivationFromOnboarding}
      />
    </main>
  );
}
