import Link from 'next/link';
import { CheckCircle2, LockKeyhole } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';
import type { OrganizationBillingContext } from '@/server/queries/billing';
import { BillingActionButton } from './billing-action-button';

type BillingPageViewProps = {
  locale: string;
  billing: OrganizationBillingContext;
  canManageBilling: boolean;
  checkout?: string;
  billingError?: string;
};

function formatLimitValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Unlimited';
  return String(value);
}

function formatStatus(status: string | null) {
  if (!status) return 'No active subscription';
  return status.replaceAll('_', ' ');
}

function formatPlanPrice(plan: (typeof BILLING_PLANS)[number]) {
  if (plan.priceMonthly != null) return `€${plan.priceMonthly}/month`;
  if (plan.startingPriceMonthly != null) return `From €${plan.startingPriceMonthly}/month`;
  return 'Contact sales';
}

function ReadOnlyBillingNotice({ locale }: { locale: string }) {
  return (
    <div className="rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-4 text-sm text-amber-50/90" role="status">
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Billing is read-only for your role</p>
          <p className="mt-1 leading-6 text-amber-50/70">Only the workspace owner can open the billing portal or change subscription plans. Ask the owner if a billing change is required.</p>
          <Link href={`/${locale}/dashboard/organizations/team`} className="mt-3 inline-flex rounded-md font-semibold text-amber-50 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100">View workspace team</Link>
        </div>
      </div>
    </div>
  );
}

export function BillingPageView({ locale, billing, canManageBilling, checkout, billingError }: BillingPageViewProps) {
  const currentPlan = getBillingPlan(billing.plan) ?? BILLING_PLANS[0];

  return (
    <main className="relative min-h-screen space-y-8 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_50%,#050505_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-20" />
      <div className="relative mx-auto max-w-7xl space-y-8">
        <section className="premium-card rounded-[2rem] p-6 text-white md:p-8" aria-labelledby="billing-title">
          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr] lg:items-stretch">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">Billing & settings</p>
              <h1 id="billing-title" className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] md:text-5xl">{canManageBilling ? 'Manage your RISCK COMPLY plan' : 'Review your RISCK COMPLY plan'}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58 md:text-base">Review usage, subscription limits and billing status without exposing internal payment details inside the app.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['reviewable billing trail', 'role-based billing actions', 'hosted payment portal'].map((label) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-medium text-white/55">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                  </span>
                ))}
              </div>
              {!canManageBilling ? <div className="mt-6"><ReadOnlyBillingNotice locale={locale} /></div> : null}
              {billingError ? (
                <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-100" role="alert">
                  <p className="font-semibold">Billing action could not be completed</p>
                  <p className="mt-1 text-sm opacity-85">{billingError}</p>
                </div>
              ) : null}
              {checkout === 'success' ? (
                <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100" role="status">
                  <p className="font-semibold">Checkout completed</p>
                  <p className="mt-1 text-sm opacity-85">Your plan will update after the subscription sync finishes.</p>
                </div>
              ) : null}
              {checkout === 'cancelled' ? (
                <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100" role="status">
                  <p className="font-semibold">Checkout cancelled</p>
                  <p className="mt-1 text-sm opacity-85">No billing changes were made.</p>
                </div>
              ) : null}
            </div>

            <Card className="border-white/10 bg-white/[0.055] text-white shadow-none backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl tracking-tight">Current plan: {currentPlan.name}</CardTitle>
                <CardDescription className="text-white/55">Subscription status and next billing action.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-semibold text-white/70">{formatStatus(billing.status)}</span>
                <p className="text-sm leading-6 text-white/58">Review usage and plan limits before making subscription changes.</p>
                {canManageBilling ? (
                  <BillingActionButton action="portal" locale={locale} className="rounded-full bg-white text-black hover:bg-white/90">Open billing portal</BillingActionButton>
                ) : (
                  <button type="button" disabled aria-disabled="true" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/35 disabled:cursor-not-allowed">Owner access required</button>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3" aria-label="Available plans">
          {BILLING_PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan.id;
            const isSalesLed = plan.salesLed;
            const description = `${formatLimitValue(plan.limits.users)} users, ${formatLimitValue(plan.limits.documents)} documents and ${formatLimitValue(plan.limits.vendors)} vendors included.`;

            return (
              <Card key={plan.id} className={`flex flex-col rounded-[1.75rem] border-white/10 bg-white/[0.035] text-white shadow-none ${isCurrent ? 'ring-1 ring-white/40' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription className="mt-2 text-white/52">{description}</CardDescription>
                    </div>
                    {isCurrent ? <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black">Current</span> : null}
                    {isSalesLed && !isCurrent ? <span className="rounded-full border border-cyan-200/30 px-3 py-1 text-xs font-bold text-cyan-100">Sales-led</span> : null}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <p className="text-4xl font-semibold tracking-[-0.04em]">{formatPlanPrice(plan)}</p>
                  <ul className="space-y-2 text-sm text-white/58">
                    {plan.features.map((highlight) => <li key={highlight} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" aria-hidden="true" /> {highlight}</li>)}
                  </ul>
                  {!canManageBilling ? (
                    <button type="button" disabled aria-disabled="true" className="mt-auto h-10 w-full rounded-full border border-white/10 px-4 text-sm font-semibold text-white/35 disabled:cursor-not-allowed">Owner action required</button>
                  ) : isSalesLed && !isCurrent ? (
                    <Link href={`/${locale}/contact?intent=sales&plan=${plan.id}`} className="inline-flex h-10 w-full items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Talk to sales</Link>
                  ) : (
                    <BillingActionButton action="checkout" locale={locale} planId={plan.id} className="w-full rounded-full" variant={isCurrent ? 'outline' : 'default'} disabled={isCurrent}>{isCurrent ? 'Current plan' : 'Upgrade plan'}</BillingActionButton>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}
