import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createCheckoutSession, createCustomerPortalSession } from '@/server/actions/billing';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

type BillingPageProps = {
  params: { locale: string };
  searchParams?: { checkout?: string; billing_error?: string };
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

export default async function OrganizationBillingPage({ params, searchParams }: BillingPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${params.locale}/onboarding`);
  }

  const billing = await getOrganizationBillingContext(organization.id);
  const currentPlan = getBillingPlan(billing.plan) ?? BILLING_PLANS[0];
  const message = checkoutMessage(searchParams?.checkout, searchParams?.billing_error);
  const usageMeters = [
    { label: 'Team members', current: billing.usage.users, limit: currentPlan.limits.users },
    { label: 'Documents', current: billing.usage.documents, limit: currentPlan.limits.documents },
    { label: 'Vendors', current: billing.usage.vendors, limit: currentPlan.limits.vendors },
    { label: 'Risks', current: billing.usage.risks, limit: currentPlan.limits.risks },
  ];
  const highestUsage = Math.max(...usageMeters.map((meter) => getUsagePercent(meter.current, meter.limit)));
  const upgradeRecommended = highestUsage >= 80;

  async function startCheckout(formData: FormData) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    const planId = String(formData.get('planId') ?? '');
    let url: string;

    try {
      url = await createCheckoutSession({
        planId,
        successPath: `/${params.locale}/dashboard/organizations/billing?checkout=success`,
        cancelPath: `/${params.locale}/dashboard/organizations/billing?checkout=cancelled`,
      });
    } catch {
      billingErrorRedirect(params.locale);
    }

    revalidatePath(`/${params.locale}/dashboard/organizations/billing`);
    redirect(url!);
  }

  async function openCustomerPortal() {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    let url: string;

    try {
      url = await createCustomerPortalSession({
        returnPath: `/${params.locale}/dashboard/organizations/billing`,
      });
    } catch {
      billingErrorRedirect(params.locale);
    }

    redirect(url!);
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">Billing command center</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">Plan, usage and upgrades</h1>
            <p className="mt-5 max-w-2xl text-lg text-white/70">
              Manage EuroComply subscription status, usage limits and add-ons for {organization.name}.
            </p>
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
              <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusTone(billing.status)}`}>
                {formatStatus(billing.status)}
              </span>
              <p className="text-sm text-white/60">{upgradeRecommended ? 'Usage is approaching plan limits. Consider upgrading.' : 'Usage is within current plan limits.'}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {usageMeters.map((meter) => (
          <UsageMeter key={meter.label} {...meter} />
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {BILLING_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan.id;
          return (
            <Card key={plan.id} className={`flex flex-col ${isCurrent ? 'border-primary' : ''}`}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <p className="text-3xl font-bold">
                  €{plan.priceMonthly}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight}>• {highlight}</li>
                  ))}
                </ul>
                <form action={startCheckout} className="mt-auto">
                  <input type="hidden" name="planId" value={plan.id} />
                  <Button type="submit" className="w-full" variant={isCurrent ? 'outline' : 'default'} disabled={isCurrent}>
                    {isCurrent ? 'Current plan' : 'Upgrade'}
                  </Button>
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
          <form action={openCustomerPortal}>
            <Button type="submit">Open billing portal</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
