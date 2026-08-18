import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, Crown, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { BILLING_ADD_ONS, isBillingAddOnCommerciallyActive, type BillingAddOn } from '@/lib/billing/add-ons';
import { getPlanDisplayName } from '@/lib/billing/addons';
import { getBillingPlan } from '@/lib/billing/plans';
import { getAddOnsCopy } from '@/lib/i18n/add-ons-copy';
import { roleHasPermission } from '@/lib/security/permissions';
import { getOrganizationRoleForUser } from '@/server/auth/permissions';
import { listActiveOrganizationAddOns } from '@/server/billing/addons';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { normalizePlan, type CanonicalSubscriptionPlan } from '@/server/queries/subscription';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ plan?: string; addon?: string }>;
};

type UpgradeStatus = 'included' | 'active' | 'available' | 'blocked' | 'preview';

function getUpgradeStatus(plan: CanonicalSubscriptionPlan, addOn: BillingAddOn, activeAddOnIds: Set<string>): UpgradeStatus {
  if (!isBillingAddOnCommerciallyActive(addOn)) return 'preview';
  if (plan === 'enterprise') return 'included';
  if (activeAddOnIds.has(addOn.slug)) return 'active';
  return addOn.availableOn.includes(plan) ? 'available' : 'blocked';
}

function statusTone(status: UpgradeStatus) {
  if (status === 'included' || status === 'active') return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
  if (status === 'available') return 'border-blue-400/25 bg-blue-400/10 text-blue-100';
  if (status === 'preview') return 'border-amber-400/20 bg-amber-400/[0.07] text-amber-100';
  return 'border-white/10 bg-white/[0.035] text-white/60';
}

function getStatusIcon(status: UpgradeStatus) {
  return status === 'blocked' || status === 'preview' ? LockKeyhole : status === 'available' ? Sparkles : CheckCircle2;
}

function planList(addOn: BillingAddOn) {
  return addOn.availableOn.map((plan) => getPlanDisplayName(plan)).join(' · ');
}

export default async function AddOnsAndCreditsPage({ params, searchParams }: PageProps) {
  noStore();
  const { locale } = await params;
  const query = searchParams ? await searchParams : {};
  const copy = getAddOnsCopy(locale);
  const selectedPlan = query.plan ? getBillingPlan(query.plan) : undefined;
  const user = await getCurrentUser();

  if (!user) redirect(`/${locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization?.id) redirect(`/${locale}/risck-comply-home`);

  const [entitlements, activeAddOnIds, role] = await Promise.all([
    getOrganizationEntitlements(organization.id),
    listActiveOrganizationAddOns(organization.id),
    getOrganizationRoleForUser(organization.id, user.id),
  ]);

  const canonicalPlan = normalizePlan(entitlements.plan);
  const currentPlanName = getPlanDisplayName(canonicalPlan);
  const activeAddOns = new Set<string>(activeAddOnIds);
  const canManageBilling = roleHasPermission(role, 'manage_billing');
  const selectedPlanDiffers = Boolean(selectedPlan && normalizePlan(selectedPlan.id) !== canonicalPlan);
  const selectedPlanPrice = selectedPlan?.priceMonthly ?? selectedPlan?.startingPriceMonthly ?? null;
  const focusedAddOn = BILLING_ADD_ONS.find((addOn) => addOn.slug === query.addon);
  const includedCount = BILLING_ADD_ONS.filter((addOn) => getUpgradeStatus(canonicalPlan, addOn, activeAddOns) === 'included').length;
  const activeCount = BILLING_ADD_ONS.filter((addOn) => getUpgradeStatus(canonicalPlan, addOn, activeAddOns) === 'active').length;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_34rem),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_28rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-20" />
      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 md:py-10 lg:px-8">
        {query.plan && !selectedPlan ? (
          <section className="rounded-[1.5rem] border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-50" role="status">
            {copy.invalidPlan}
          </section>
        ) : null}

        {selectedPlanDiffers && selectedPlan ? (
          <section className="rounded-[1.75rem] border border-blue-400/25 bg-blue-400/10 p-5 shadow-sm md:p-6" aria-labelledby="selected-plan-title">
            <Badge variant="outline" className="rounded-full border-blue-300/25 bg-black/20 text-blue-100">{copy.selectedPlan}</Badge>
            <div className="mt-4 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2 id="selected-plan-title" className="text-2xl font-semibold tracking-tight">{selectedPlan.name}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50/75">{copy.selectedPlanBody}</p>
              </div>
              {selectedPlanPrice !== null ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left md:text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/50">{copy.selectedPlanPrice}</p>
                  <p className="mt-1 text-3xl font-semibold">€{selectedPlanPrice}<span className="text-sm font-normal text-white/50">{copy.perMonth}</span></p>
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/${locale}/pricing`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{copy.backToPricing}</Link>
              <Link href={canManageBilling ? `/${locale}/dashboard/organizations/billing?plan=${selectedPlan.id}` : `/${locale}/dashboard/organizations/team`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{copy.continuePlanReview}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </section>
        ) : null}

        <section className="enterprise-panel rounded-[2rem] p-6 md:p-9" aria-labelledby="upgrade-center-title">
          <div className="grid gap-8 lg:grid-cols-[1.45fr_0.55fr] lg:items-end">
            <div>
              <p className="enterprise-kicker">{copy.eyebrow}</p>
              <h1 id="upgrade-center-title" className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.045em] md:text-6xl">{copy.title}</h1>
              <p className="enterprise-muted mt-4 max-w-3xl text-sm leading-7 md:text-base">{copy.subtitle}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{copy.currentPlan}</p>
              <div className="mt-2 flex items-center gap-2"><Crown className="h-5 w-5 text-blue-300" aria-hidden="true" /><p className="text-3xl font-semibold">{currentPlanName}</p></div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-100">{copy.planActive}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{copy.activeAddOns}: {activeCount + includedCount}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/[0.07] p-5 md:p-6">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" aria-hidden="true" /><div><h2 className="text-lg font-semibold">{copy.billingAuthority}</h2><p className="mt-2 text-sm leading-6 text-white/65">{copy.billingAuthorityBody}</p></div></div>
          </article>
          <article className="rounded-[1.75rem] border border-amber-400/20 bg-amber-400/[0.07] p-5 md:p-6">
            <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 text-amber-300" aria-hidden="true" /><div><h2 className="text-lg font-semibold">{copy.noDirectPurchase}</h2><p className="mt-2 text-sm leading-6 text-white/65">{copy.noDirectPurchaseBody}</p></div></div>
          </article>
        </section>

        {focusedAddOn ? (
          <section className="rounded-[1.75rem] border border-blue-400/25 bg-blue-400/[0.08] p-5 md:p-6" aria-labelledby="focused-addon-title">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">{copy.focusLabel}</p>
            <h2 id="focused-addon-title" className="mt-2 text-2xl font-semibold">{focusedAddOn.name}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">{focusedAddOn.description}</p>
          </section>
        ) : null}

        <section className="space-y-5" aria-labelledby="addon-catalog-title">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="addon-catalog-title" className="text-2xl font-semibold tracking-tight md:text-3xl">{copy.catalogTitle}</h2>
              <p className="enterprise-muted mt-2 max-w-3xl text-sm leading-6">{copy.catalogSubtitle}</p>
            </div>
            <Link href={`/${locale}/pricing`} className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{copy.viewPlans}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {BILLING_ADD_ONS.map((addOn) => {
              const status = getUpgradeStatus(canonicalPlan, addOn, activeAddOns);
              const Icon = getStatusIcon(status);
              const statusLabel = status === 'included' ? copy.included : status === 'active' ? copy.active : status === 'available' ? copy.available : copy.unavailable;
              const dependencies = addOn.dependencies.map((slug) => BILLING_ADD_ONS.find((candidate) => candidate.slug === slug)?.name ?? slug);
              const isFocused = focusedAddOn?.slug === addOn.slug;

              return (
                <article key={addOn.slug} id={`addon-${addOn.slug}`} className={`flex min-h-[310px] flex-col rounded-[1.65rem] border p-5 transition ${isFocused ? 'border-blue-300/45 bg-blue-400/[0.08] shadow-[0_0_0_1px_rgba(147,197,253,0.08)]' : 'border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.04]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">{copy.categories[addOn.category]}</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight">{addOn.name}</h3>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(status)}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{statusLabel}</span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-white/60">{addOn.description}</p>

                  <dl className="mt-5 space-y-2 text-xs text-white/50">
                    <div className="flex justify-between gap-4"><dt>{copy.availableOn}</dt><dd className="text-right text-white/70">{planList(addOn)}</dd></div>
                    {dependencies.length ? <div className="flex justify-between gap-4"><dt>{copy.dependencies}</dt><dd className="text-right text-white/70">{dependencies.join(' · ')}</dd></div> : null}
                  </dl>

                  <div className="mt-auto pt-6">
                    {status === 'preview' ? (
                      <p className="text-sm leading-6 text-amber-100/75">{copy.noDirectPurchaseBody}</p>
                    ) : status === 'included' ? (
                      <p className="text-sm font-semibold text-emerald-200">{copy.includedWithEnterprise}</p>
                    ) : (
                      <div className="flex items-end justify-between gap-4">
                        <div><p className="text-2xl font-semibold">€{addOn.priceMonthly}<span className="text-sm font-normal text-white/45">{copy.perMonth}</span></p><p className="mt-1 text-xs text-white/40">€{addOn.priceAnnual}{copy.perYear}</p></div>
                        {status === 'available' && canManageBilling ? <Link href={`/${locale}/dashboard/organizations/billing`} className="inline-flex min-h-10 items-center justify-center rounded-full border border-blue-300/25 bg-blue-400/10 px-4 text-xs font-semibold text-blue-100 transition hover:bg-blue-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{copy.reviewBilling}</Link> : null}
                        {status === 'blocked' ? <Link href={`/${locale}/pricing`} className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 px-4 text-xs font-semibold transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{copy.viewPlans}</Link> : null}
                      </div>
                    )}
                    {status === 'available' && !canManageBilling ? <p className="mt-3 text-xs leading-5 text-amber-100/75">{copy.contactBillingAdmin}</p> : null}
                    {status === 'blocked' ? <p className="mt-3 text-xs leading-5 text-white/45">{copy.requiresPlan(getPlanDisplayName(addOn.availableOn[0]))}</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
