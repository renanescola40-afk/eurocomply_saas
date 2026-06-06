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
  searchParams?: { checkout?: string };
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
  if (status === 'active' || status === 'trialing') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (status === 'canceled' || status === 'incomplete_expired') return 'border-red-500/30 bg-red-500/10 text-red-300';
  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}

function getUsagePercent(current: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

function getUsageMessage(current: number, limit: number) {
  const percent = getUsagePercent(current, limit);

  if (percent >= 100) return 'Limit reached';
  if (percent >= 80) return 'Close to limit';
  return 'Healthy usage';
}

function UsageMeter({ label, current, limit }: { label: string; current: number; limit: number }) {
  const percent = getUsagePercent(current, limit);
  const message = getUsageMessage(current, limit);
  const tone = percent >= 100 ? 'text-red-300' : percent >= 80 ? 'text-amber-300' : 'text-muted-foreground';

  return (
    <div className="space-y-2 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{current} / {limit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className={`text-xs ${tone}`}>{message}</p>
    </div>
  );
}

function checkoutMessage(checkout?: string) {
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
  const message = checkoutMessage(searchParams?.checkout);
  const usageMeters = [
    { label: 'Team members', current: billing.usage.users, limit: currentPlan.limits.users },
    { label: 'Documents', current: billing.usage.documents, limit: currentPlan.limits.documents },
    { label: 'Vendors', current: billing.usage.vendors, limit: currentPlan.limits.vendors },
    { label: 'Risks', current: billing.usage.risks, limit: currentPlan.limits.risks },
  ];

  async function startCheckout(formData: FormData) {
    'use server';

    const planId = String(formData.get('planId') ?? '');
    const url = await createCheckoutSession({
      organizationId: organization.id,
      planId,
      userId: user.id,
      successPath: `/${params.locale}/dashboard/organizations/billing?checkout=success`,
      cancelPath: `/${params.locale}/dashboard/organizations/billing?checkout=cancelled`,
    });

    revalidatePath(`/${params.locale}/dashboard/organizations/billing`);
    redirect(url);
  }

  async function openCustomerPortal() {
    'use server';

    const url = await createCustomerPortalSession({
      organizationId: organization.id,
      userId: user.id,
      returnPath: `/${params.locale}/dashboard/organizations/billing`,
    });

    redirect(url);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Billing</p>
        <h1 className="text-3xl font-semibold tracking-tight">Manage EuroComply billing</h1>
        <p className="max-w-2xl text-muted-foreground">
          Manage subscription access for {organization.name}. Checkout is powered by Stripe and subscription state is synced back to your organization.
        </p>
      </section>

      {message && (
        <div className={`rounded-2xl border p-4 ${message.className}`}>
          <p className="font-semibold">{message.title}</p>
          <p className="mt-1 text-sm opacity-90">{message.description}</p>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current subscription</CardTitle>
            <CardDescription>Plan, status and Stripe management access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="mt-1 text-3xl font-bold">{currentPlan.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">€{currentPlan.priceMonthly}/month</p>
            </div>
            <div className={`rounded-xl border p-4 ${getStatusTone(billing.status)}`}>
              <p className="text-sm font-medium">Subscription status</p>
              <p className="mt-1 text-2xl font-semibold capitalize">{formatStatus(billing.status)}</p>
              {(billing.status === 'past_due' || billing.status === 'unpaid') && (
                <p className="mt-2 text-sm">Payment attention is required. Open Stripe billing to update the payment method.</p>
              )}
              {billing.status === 'canceled' && (
                <p className="mt-2 text-sm">This subscription is canceled. Choose a plan to restore paid access.</p>
              )}
            </div>
            <form action={openCustomerPortal}>
              <Button type="submit" variant="outline" className="w-full">Manage subscription in Stripe</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan usage</CardTitle>
            <CardDescription>Monitor limits before customers hit a hard stop.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {usageMeters.map((meter) => (
              <UsageMeter key={meter.label} {...meter} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {BILLING_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan.id;
          const isUpgrade = plan.priceMonthly > currentPlan.priceMonthly;

          return (
            <Card key={plan.id} className={isCurrent ? 'border-primary' : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>€{plan.priceMonthly}/month</CardDescription>
                  </div>
                  {isCurrent && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Current</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>{plan.limits.users} users</li>
                  <li>{plan.limits.documents} documents</li>
                  <li>{plan.limits.vendors} vendors</li>
                  <li>{plan.limits.risks} risks</li>
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <form action={startCheckout}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <Button type="submit" className="w-full" variant={isCurrent ? 'outline' : 'default'}>
                    {isCurrent ? 'Restart checkout' : isUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
