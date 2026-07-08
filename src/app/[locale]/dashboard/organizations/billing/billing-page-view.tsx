import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrganizationBillingContext } from '@/server/queries/billing';
import { BillingActionButton } from './billing-action-button';

type BillingPageViewProps = {
  locale: string;
  billing: OrganizationBillingContext;
  checkout?: string;
  billingError?: string;
};

const SALES_LED_PLAN_IDS = new Set(['enterprise']);

function formatLimitValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Unlimited';
  return String(value);
}

function formatStatus(status: string | null) {
  if (!status) return 'No active subscription';
  return status.replaceAll('_', ' ');
}

export function BillingPageView({ locale, billing, checkout, billingError }: BillingPageViewProps) {
  const currentPlan = getBillingPlan(billing.plan) ?? BILLING_PLANS[0];

  return (
    <main className="relative min-h-screen space-y-8 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_50%,#050505_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-20" />
      <div className="relative mx-auto max-w-7xl space-y-8">
        <section className="premium-card rounded-[2rem] p-6 text-white md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr] lg:items-stretch">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">Billing & settings</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] md:text-5xl">Manage your RISCK COMPLY plan</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58 md:text-base">Review usage, subscription limits and billing actions without exposing internal payment details inside the app.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['reviewable billing trail', 'role-based billing actions', 'hosted payment portal'].map((label) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-medium text-white/55">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {label}
                  </span>
                ))}
              </div>
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
                <BillingActionButton action="portal" locale={locale} className="rounded-full bg-white text-black hover:bg-white/90">Open billing portal</BillingActionButton>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {BILLING_PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan.id;
            const isSalesLed = SALES_LED_PLAN_IDS.has(plan.id);
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
                  <p className="text-4xl font-semibold tracking-[-0.04em]">€{plan.priceMonthly}<span className="text-sm font-normal text-white/45">/month</span></p>
                  <ul className="space-y-2 text-sm text-white/58">
                    {plan.features.map((highlight) => <li key={highlight} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" /> {highlight}</li>)}
                  </ul>
                  {isSalesLed && !isCurrent ? (
                    <Link href={`/${locale}/contact?intent=sales&plan=${plan.id}`} className="inline-flex h-10 w-full items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/90">Talk to sales</Link>
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
