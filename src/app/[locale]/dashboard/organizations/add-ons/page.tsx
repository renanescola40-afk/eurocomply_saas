import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, Crown, LockKeyhole, ShieldCheck } from 'lucide-react';

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
  if (status === 'included' || status === 'active') return 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100';
  if (status === 'available') return 'border-white/[0.09] bg-white/[0.035] text-white/70';
  if (status === 'preview') return 'border-amber-300/18 bg-amber-300/[0.055] text-amber-100';
  return 'border-white/[0.07] bg-white/[0.02] text-white/42';
}

function getStatusIcon(status: UpgradeStatus) {
  return status === 'blocked' || status === 'preview' ? LockKeyhole : status === 'available' ? ArrowUpRight : CheckCircle2;
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
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        {query.plan && !selectedPlan ? (
          <section className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-50" role="status">
            {copy.invalidPlan}
          </section>
        ) : null}

        {selectedPlanDiffers && selectedPlan ? (
          <section className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] p-5" aria-labelledby="selected-plan-title">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-100/55">{copy.selectedPlan}</p>
                <h2 id="selected-plan-title" className="mt-1.5 text-lg font-semibold text-white/88">{selectedPlan.name}</h2>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-white/46">{copy.selectedPlanBody}</p>
              </div>
              {selectedPlanPrice !== null ? (
                <div className="shrink-0 text-left md:text-right">
                  <p className="text-[10px] uppercase tracking-[0.13em] text-white/34">{copy.selectedPlanPrice}</p>
                  <p className="mt-1 text-2xl font-semibold text-white/88">€{selectedPlanPrice}<span className="text-sm font-normal text-white/38">{copy.perMonth}</span></p>
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/${locale}/pricing`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-sm font-semibold text-white/62 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">{copy.backToPricing}</Link>
              <Link href={canManageBilling ? `/${locale}/dashboard/organizations/billing?plan=${selectedPlan.id}` : `/${locale}/dashboard/organizations/team`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-[#06100d] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">{copy.continuePlanReview}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </section>
        ) : null}

        <header className="grid gap-5 border-b border-white/[0.065] pb-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{copy.eyebrow}</p>
            <h1 id="upgrade-center-title" className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">{copy.subtitle}</p>
          </div>
          <div className="rounded-xl border border-white/[0.075] bg-[#101715] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/34">{copy.currentPlan}</p>
            <div className="mt-1.5 flex items-center gap-2"><Crown className="h-4 w-4 text-emerald-300" aria-hidden="true" /><p className="text-lg font-semibold text-white/88">{currentPlanName}</p></div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/42">
              <span className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.055] px-2.5 py-1 text-emerald-100/75">{copy.planActive}</span>
              <span className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1">{copy.activeAddOns}: {activeCount + includedCount}</span>
            </div>
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-2">
          <article className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] p-4">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" aria-hidden="true" /><div><h2 className="text-sm font-semibold text-white/82">{copy.billingAuthority}</h2><p className="mt-1.5 text-sm leading-6 text-white/45">{copy.billingAuthorityBody}</p></div></div>
          </article>
          <article className="rounded-xl border border-amber-300/15 bg-amber-300/[0.045] p-4">
            <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 text-amber-300" aria-hidden="true" /><div><h2 className="text-sm font-semibold text-white/82">{copy.noDirectPurchase}</h2><p className="mt-1.5 text-sm leading-6 text-white/45">{copy.noDirectPurchaseBody}</p></div></div>
          </article>
        </section>

        {focusedAddOn ? (
          <section className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] p-4" aria-labelledby="focused-addon-title">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-100/55">{copy.focusLabel}</p>
            <h2 id="focused-addon-title" className="mt-1.5 text-base font-semibold text-white/85">{focusedAddOn.name}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/45">{focusedAddOn.description}</p>
          </section>
        ) : null}

        <section className="space-y-4" aria-labelledby="addon-catalog-title">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="addon-catalog-title" className="text-lg font-semibold tracking-tight text-white/86">{copy.catalogTitle}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-white/42">{copy.catalogSubtitle}</p>
            </div>
            <Link href={`/${locale}/pricing`} className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-sm font-semibold text-white/62 transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">{copy.viewPlans}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {BILLING_ADD_ONS.map((addOn) => {
              const status = getUpgradeStatus(canonicalPlan, addOn, activeAddOns);
              const Icon = getStatusIcon(status);
              const statusLabel = status === 'included' ? copy.included : status === 'active' ? copy.active : status === 'available' ? copy.available : copy.unavailable;
              const dependencies = addOn.dependencies.map((slug) => BILLING_ADD_ONS.find((candidate) => candidate.slug === slug)?.name ?? slug);
              const isFocused = focusedAddOn?.slug === addOn.slug;

              return (
                <article key={addOn.slug} id={`addon-${addOn.slug}`} className={`flex flex-col rounded-xl border bg-[#101715] p-5 ${isFocused ? 'border-emerald-300/25' : 'border-white/[0.075]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/32">{copy.categories[addOn.category]}</p>
                      <h3 className="mt-1.5 text-base font-semibold tracking-tight text-white/86">{addOn.name}</h3>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone(status)}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{statusLabel}</span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/44">{addOn.description}</p>

                  <dl className="mt-4 divide-y divide-white/[0.05] border-y border-white/[0.05] text-xs text-white/40">
                    <div className="flex justify-between gap-4 py-2.5"><dt>{copy.availableOn}</dt><dd className="text-right text-white/62">{planList(addOn)}</dd></div>
                    {dependencies.length ? <div className="flex justify-between gap-4 py-2.5"><dt>{copy.dependencies}</dt><dd className="text-right text-white/62">{dependencies.join(' · ')}</dd></div> : null}
                  </dl>

                  <div className="mt-auto pt-4">
                    {status === 'preview' ? (
                      <p className="text-sm leading-6 text-amber-100/65">{copy.noDirectPurchaseBody}</p>
                    ) : status === 'included' ? (
                      <p className="text-sm font-semibold text-emerald-200/80">{copy.includedWithEnterprise}</p>
                    ) : (
                      <div className="flex items-end justify-between gap-4">
                        <div><p className="text-xl font-semibold text-white/86">€{addOn.priceMonthly}<span className="text-sm font-normal text-white/38">{copy.perMonth}</span></p><p className="mt-0.5 text-xs text-white/32">€{addOn.priceAnnual}{copy.perYear}</p></div>
                        {status === 'available' && canManageBilling ? <Link href={`/${locale}/dashboard/organizations/billing`} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-300 px-3 text-xs font-semibold text-[#06100d] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">{copy.reviewBilling}</Link> : null}
                        {status === 'blocked' ? <Link href={`/${locale}/pricing`} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/[0.08] px-3 text-xs font-semibold text-white/55 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60">{copy.viewPlans}</Link> : null}
                      </div>
                    )}
                    {status === 'available' && !canManageBilling ? <p className="mt-2 text-xs leading-5 text-amber-100/65">{copy.contactBillingAdmin}</p> : null}
                    {status === 'blocked' ? <p className="mt-2 text-xs leading-5 text-white/38">{copy.requiresPlan(getPlanDisplayName(addOn.availableOn[0]))}</p> : null}
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
