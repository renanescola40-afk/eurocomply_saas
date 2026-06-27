import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
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

function getUsagePercent(current: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

function getUsageMessage(current: number, limit: number) {
  const percent = getUsagePercent(current, limit);

  if (percent >= 100) return 'Limit reached';
  if (percent >= 80) return 'Upgrade recommended';
  return 'Healthy usage';
}

function getUsageTone(percent: number) {
  if (percent >= 100) return 'bg-rose-400 text-rose-200';
  if (percent >= 80) return 'bg-amber-300 text-amber-200';
  return 'bg-emerald-400 text-emerald-200';
}

function UsageMeter({ label, current, limit }: { label: string; current: number; limit: number }) {
  const percent = getUsagePercent(current, limit);
  const message = getUsageMessage(current, limit);
  const barTone = getUsageTone(percent).split(' ')[0];
  const textTone = getUsageTone(percent).split(' ')[1];

  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{current} / {limit}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${textTone}`}>{message}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{percent}% used</p>
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
      className: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    };
  }

  if (checkout === 'success') {
    return {
      title: 'Checkout completed',
      description: 'Stripe is processing the subscription. Your plan will update after the webhook sync finishes.',
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    };
  }

  if (checkout === 'cancelled') {
    return {
      title: 'Checkout cancelled',
      description: 'No billing changes were made. You can restart checkout whenever you are ready.',
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
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
    { label: 'Users', current: billing.usage.users, limit: currentPlan.limits.users },
    { label: 'Documents', current: billing.usage.documents, limit: currentPlan.limits.documents },
    { label: 'Vendors', current: billing.usage.vendors, limit: currentPlan.limits.vendors },
    { label: 'Risks', current: billing.usage.risks, limit: currentPlan.limits.risks },
  ];
  const upgradeRecommended = usageMeters.some((meter) => getUsagePercent(meter.current, meter.limit) >= 80);
  const hasSubscription = Boolean(billing.status);

  async function refreshBilling() {
    'use server';
    revalidatePath(`/${locale}/dashboard/organizations/billing`);
  }

  return (
    <main className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground/70">Billing</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">Manage your RISCK COMPLY plan</h1>
            <p className="mt-3 max-w-2xl text-white/70">Review usage, upgrade your subscription and open the Stripe billing portal.</p>
            {message && (
              <div className={`mt-6 rounded-2xl border p-4 ${message.className}`}>
                <p className="font-semibold">{message.title}</p>
                <p className="mt-1 text-sm opacity-85">{message.description}</p>
              </div>
            )}
          </div>

          <Card className="border-white/10 bg-white/10 text-white backdrop-blur">
            <CardHeader>
              <CardTitle>Current plan: {currentPlan.name}</CardTitle>
              <CardDescription className="text-white/60">Subscription status and usage summary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusTone(billing.status)}`}>{formatStatus(billing.status)}</span>
              <p className="text-sm text-white/60">{upgradeRecommended ? 'Usage is approaching plan limits. Consider upgrading.' : 'Usage is within current plan limits.'}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {!hasSubscription ? (
        <section className="rounded-[1.75rem] border border-dashed bg-muted/20 p-6 shadow-sm md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">No active paid plan yet.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Choose a plan once the first organization, evidence, risk and vendor are in place. This turns trial usage into a clear enterprise upgrade conversation.
            </p>
          </div>
          <form action={startCheckout} className="mt-4 md:mt-0">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="planId" value="growth" />
            <Button type="submit" className="rounded-full">Upgrade to Growth</Button>
          </form>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {usageMeters.map((meter) => <UsageMeter key={meter.label} {...meter} />)}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {BILLING_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan.id;
          const description = `${plan.limits.users} users, ${plan.limits.documents} documents and ${plan.limits.vendors} vendors included.`;

          return (
            <Card key={plan.id} className={`flex flex-col ${isCurrent ? 'border-primary' : ''}`}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <p className="text-3xl font-bold">€{plan.priceMonthly}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((highlight) => <li key={highlight}>• {highlight}</li>)}
                </ul>
                <form action={startCheckout} className="mt-auto">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="planId" value={plan.id} />
                  <Button type="submit" className="w-full" variant={isCurrent ? 'outline' : 'default'} disabled={isCurrent}>{isCurrent ? 'Current plan' : 'Upgrade'}</Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Stripe customer portal</CardTitle>
          <CardDescription>Open Stripe-hosted billing management to update payment methods, invoices and subscription details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={openCustomerPortal} className="flex gap-3">
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit">Open billing portal</Button>
            <Button type="submit" variant="outline" formAction={refreshBilling}>Refresh status</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
