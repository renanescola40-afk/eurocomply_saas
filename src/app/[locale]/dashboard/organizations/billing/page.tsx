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

function checkoutMessage(checkout?: string, billingError?: string) {
  if (billingError) {
    return {
      title: 'Billing action could not be completed',
      description: decodeURIComponent(billingError),
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

function billingErrorRedirect(locale: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected billing error';
  redirect(`/${locale}/dashboard/organizations/billing?billing_error=${encodeURIComponent(message)}`);
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

    try {
      const planId = String(formData.get('planId') ?? '');
      const url = await createCheckoutSession({
        organizationId: currentOrganization.id,
        planId,
        userId: currentUser.id,
        successPath: `/${params.locale}/dashboard/organizations/billing?checkout=success`,
        cancelPath: `/${params.locale}/dashboard/organizations/billing?checkout=cancelled`,
      });

      revalidatePath(`/${params.locale}/dashboard/organizations/billing`);
      redirect(url);
    } catch (error) {
      billingErrorRedirect(params.locale, error);
    }
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

    try {
      const url = await createCustomerPortalSession({
        organizationId: currentOrganization.id,
        userId: currentUser.id,
        returnPath: `/${params.locale}/dashboard/organizations/billing`,
      });

      redirect(url);
    } catch (error) {
      billingErrorRedirect(params.locale, error);
    }
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
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
              Manage subscription access for {organization.name}. Stripe handles checkout and the customer portal, while EuroComply enforces plan limits across the workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <form action={openCustomerPortal}>
                <Button type="submit" className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">Manage subscription</Button>
              </form>
              {upgradeRecommended && (
                <span className="inline-flex h-10 items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200">
                  Upgrade recommended
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Current plan</p>
            <p className="mt-3 text-5xl font-bold tracking-tight">{currentPlan.name}</p>
            <p className="mt-2 text-slate-300">€{currentPlan.priceMonthly}/month</p>
            <div className={`mt-5 rounded-2xl border p-4 ${getStatusTone(billing.status)}`}>
              <p className="text-xs font-medium uppercase tracking-[0.18em] opacity-80">Subscription status</p>
              <p className="mt-2 text-2xl font-semibold capitalize">{formatStatus(billing.status)}</p>
              {(billing.status === 'past_due' || billing.status === 'unpaid') && (
                <p className="mt-2 text-sm">Payment attention is required. Open Stripe billing to update the payment method.</p>
              )}
              {billing.status === 'canceled' && (
                <p className="mt-2 text-sm">This subscription is canceled. Choose a plan to restore paid access.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {message && (
        <div className={`rounded-2xl border p-4 ${message.className}`}>
          <p className="font-semibold">{message.title}</p>
          <p className="mt-1 text-sm opacity-90">{message.description}</p>
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Plan usage</p>
            <h2 className="text-2xl font-semibold tracking-tight">Current limits</h2>
          </div>
          <p className="text-sm text-muted-foreground">Warnings appear automatically when usage approaches 80% of the current plan.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {usageMeters.map((meter) => (
            <UsageMeter key={meter.label} {...meter} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Plans</p>
            <h2 className="text-2xl font-semibold tracking-tight">Choose the right tier</h2>
          </div>
          <p className="text-sm text-muted-foreground">Upgrade when your team, evidence library or vendor program outgrows the current tier.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {BILLING_PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan.id;
            const isUpgrade = plan.priceMonthly > currentPlan.priceMonthly;

            return (
              <Card key={plan.id} className={`overflow-hidden rounded-3xl transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg ${isCurrent ? 'border-primary shadow-md' : ''}`}>
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription className="mt-2 text-base">€{plan.priceMonthly}/month</CardDescription>
                    </div>
                    {isCurrent && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Current</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border bg-background p-3"><p className="text-muted-foreground">Users</p><p className="font-semibold">{plan.limits.users}</p></div>
                    <div className="rounded-2xl border bg-background p-3"><p className="text-muted-foreground">Documents</p><p className="font-semibold">{plan.limits.documents}</p></div>
                    <div className="rounded-2xl border bg-background p-3"><p className="text-muted-foreground">Vendors</p><p className="font-semibold">{plan.limits.vendors}</p></div>
                    <div className="rounded-2xl border bg-background p-3"><p className="text-muted-foreground">Risks</p><p className="font-semibold">{plan.limits.risks}</p></div>
                  </div>

                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <form action={openCustomerPortal}>
                      <Button type="submit" className="w-full rounded-full" variant="outline">
                        Manage current plan
                      </Button>
                    </form>
                  ) : (
                    <form action={startCheckout}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <Button type="submit" className="w-full rounded-full">
                        {isUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
