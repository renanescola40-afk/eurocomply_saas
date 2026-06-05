import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { BILLING_PLANS } from '@/lib/billing/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createCheckoutSession, createCustomerPortalSession } from '@/server/actions/billing';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

export default async function OrganizationBillingPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${params.locale}/onboarding`);
  }

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
        <h1 className="text-3xl font-semibold tracking-tight">Choose a EuroComply plan</h1>
        <p className="max-w-2xl text-muted-foreground">
          Manage subscription access for {organization.name}. Checkout is powered by Stripe and subscription state is synced back to your organization.
        </p>
      </section>

      <form action={openCustomerPortal}>
        <Button type="submit" variant="outline">Manage subscription in Stripe</Button>
      </form>

      <section className="grid gap-4 md:grid-cols-3">
        {BILLING_PLANS.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>€{plan.priceMonthlyEur}/month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{plan.limits.users} users</li>
                <li>{plan.limits.documents} documents</li>
                <li>{plan.limits.vendors} vendors</li>
                <li>{plan.limits.risks} risks</li>
              </ul>
              <form action={startCheckout}>
                <input type="hidden" name="planId" value={plan.id} />
                <Button type="submit" className="w-full">Start {plan.name}</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
