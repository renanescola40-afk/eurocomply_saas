import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowRight, CheckCircle2, CreditCard, FileText, Gauge, LockKeyhole, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createCheckoutSession, createCustomerPortalSession } from '@/server/actions/billing';
import type { OrganizationBillingContext } from '@/server/queries/billing';

type BillingPageViewProps = {
  locale: string;
  billing: OrganizationBillingContext;
  checkout?: string;
  billingError?: string;
};

function formatStatus(status: string | null) {
  if (!status) return 'No active Stripe subscription';

  const labels: Record<string, string> = {
    active: 'Active',
    trialing: 'Trialing',
    past_due: 'Past due',
    unpaid: 'Unpaid',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    incomplete_expired: 'Incomplete expired',
  };

  return labels[status] ?? status.replaceAll('_', ' ');
}

function getStatusTone(status: string | null) {
  if (status === 'active' || status === 'trialing') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (status === 'canceled' || status === 'incomplete_expired') return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
}

function formatLimitValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Unlimited';
  return String(value);
}

function getUsagePercent(current: number, limit: number) {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

function getUsageMessage(current: number, limit: number) {
  if (!Number.isFinite(limit) || limit <= 0) return 'Enterprise capacity';
  const percent = getUsagePercent(current, limit);

  if (percent >= 100) return 'Limit reached';
  if (percent >= 80) return 'Upgrade recommended';
  return 'Healthy usage';
}

function getUsageTone(percent: number, limit: number) {
  if (!Number.isFinite(limit) || limit <= 0) return 'bg-blue-300 text-blue-200';
  if (percent >= 100) return 'bg-rose-400 text-rose-200';
  if (percent >= 80) return 'bg-amber-300 text-amber-200';
  return 'bg-emerald-400 text-emerald-200';
}

function UsageMeter({ label, current, limit }: { label: string; current: number; limit: number }) {
  const percent = getUsagePercent(current, limit);
  const message = getUsageMessage(current, limit);
  const [barTone, textTone] = getUsageTone(percent, limit).split(' ');

  return (
    <div className="premium-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{current} / {formatLimitValue(limit)}</p>
        </div>
        <span className={`rounded-full border border-white/10 px-3 py-1 text-xs font-semibold ${textTone}`}>{message}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${Number.isFinite(limit) && limit > 0 ? percent : 100}%` }} />
      </div>
      <p className="mt-3 text-sm text-white/45">{Number.isFinite(limit) && limit > 0 ? `${percent}% used` : 'No hard cap configured for this plan.'}</p>
    </div>
  );
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function checkoutMessage(checkout?: string, billingError?: string) {
  if (billingError) {
    return {
      title: 'Billing action could not be completed',
      description: safeDecodeURIComponent(billingError),
      className: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
    };
  }

  if (checkout === 'success') {
    return {
      title: 'Checkout completed',
      description: 'Stripe is processing the subscription. Your plan will update after the webhook sync finishes.',
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    };
  }

  if (checkout === 'cancelled') {
    return {
      title: 'Checkout cancelled',
      description: 'No billing changes were made. You can restart checkout whenever you are ready.',
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    };
  }

  return null;
}

function billingErrorRedirect(locale: string): never {
  redirect(`/${locale}/dashboard/organizations/billing?billing_error=${encodeURIComponent('Billing action could not be completed. Please try again later.')}`);
}

async function startCheckout(formData: FormData) {
  'use server';

  const locale = String(formData.get('locale') ?? 'en');
  const planId = String(formData.get('planId') ?? '');

  try {
    const url = await createCheckoutSession({
      planId,
      successPath: `/${locale}/dashboard/organizations/billing?checkout=success`,
      cancelPath: `/${locale}/dashboard/organizations/billing?checkout=cancelled`,
    });
    redirect(url);
  } catch {
    billingErrorRedirect(locale);
  }
}

async function openCustomerPortal(formData: FormData) {
  'use server';

  const locale = String(formData.get('locale') ?? 'en');

  try {
    const url = await createCustomerPortalSession({
      returnPath: `/${locale}/dashboard/organizations/billing`,
    });
    redirect(url);
  } catch {
    billingErrorRedirect(locale);
  }
}

export function BillingPageView({ locale, billing, checkout, billingError }: BillingPageViewProps) {
  const currentPlan = getBillingPlan(billing.plan) ?? BILLING_PLANS[0];
  const message = checkoutMessage(checkout, billingError);
  const usageMeters = [
    { label: 'Users', current: billing.usage.users, limit: currentPlan.limits.users, icon: UsersRound },
    { label: 'Documents', current: billing.usage.documents, limit: currentPlan.limits.documents, icon: FileText },
    { label: 'Vendors', current: billing.usage.vendors, limit: currentPlan.limits.vendors, icon: ShieldCheck },
    { label: 'Risks', current: billing.usage.risks, limit: currentPlan.limits.risks, icon: Gauge },
  ];
  const upgradeRecommended = usageMeters.some((meter) => getUsagePercent(meter.current, meter.limit) >= 80);
  const billingSignals = [
    { label: 'audit-ready billing trail', icon: CheckCircle2 },
    { label: 'role-based billing actions', icon: LockKeyhole },
    { label: 'Stripe-hosted payment portal', icon: CreditCard },
  ];

  async function refreshBilling() {
    'use server';
    revalidatePath(`/${locale}/dashboard/organizations/billing`);
  }

  return (
    <main className="relative min-h-screen space-y-8 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_50%,#050505_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-20" />
      <div className="relative mx-auto max-w-7xl space-y-8">
        <section className="premium-card rounded-[2rem] p-6 text-white md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr] lg:items-stretch">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">Billing & settings</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] md:text-5xl">Manage your RISCK COMPLY plan</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58 md:text-base">Review usage, upgrade subscription limits and open Stripe billing without exposing internal payment details inside the app.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {billingSignals.map((item) => {
                  const Icon = item.icon;
                  return <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-medium text-white/55"><Icon className="h-3.5 w-3.5" /> {item.label}</span>;
                })}
              </div>
              {message && (
                <div className={`mt-6 rounded-2xl border p-4 ${message.className}`} role={billingError ? 'alert' : 'status'}>
                  <p className="font-semibold">{message.title}</p>
                  <p className="mt-1 text-sm opacity-85">{message.description}</p>
                </div>
              )}
            </div>

            <Card className="border-white/10 bg-white/[0.055] text-white shadow-none backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl tracking-tight">Current plan: {currentPlan.name}</CardTitle>
                <CardDescription className="text-white/55">Subscription status, usage signal and next billing action.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusTone(billing.status)}`}>{formatStatus(billing.status)}</span>
                <p className="text-sm leading-6 text-white/58">{upgradeRecommended ? 'Usage is approaching plan limits. Upgrade before work gets blocked.' : 'Usage is within current plan limits. Keep monitoring before procurement review.'}</p>
                <form action={openCustomerPortal} className="flex flex-col gap-3 sm:flex-row">
                  <input type="hidden" name="locale" value={locale} />
                  <Button type="submit" className="rounded-full bg-white text-black hover:bg-white/90">Open billing portal <ArrowRight className="h-4 w-4" /></Button>
                  <Button type="submit" variant="outline" formAction={refreshBilling} className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10"><RefreshCw className="h-4 w-4" /> Refresh</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {usageMeters.map((meter) => <UsageMeter key={meter.label} label={meter.label} current={meter.current} limit={meter.limit} />)}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {BILLING_PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan.id;
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
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <p className="text-4xl font-semibold tracking-[-0.04em]">€{plan.priceMonthly}<span className="text-sm font-normal text-white/45">/month</span></p>
                  <ul className="space-y-2 text-sm text-white/58">
                    {plan.features.map((highlight) => <li key={highlight} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" /> {highlight}</li>)}
                  </ul>
                  <form action={startCheckout} className="mt-auto">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="planId" value={plan.id} />
                    <Button type="submit" className="w-full rounded-full" variant={isCurrent ? 'outline' : 'default'} disabled={isCurrent}>{isCurrent ? 'Current plan' : 'Upgrade plan'}</Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}
