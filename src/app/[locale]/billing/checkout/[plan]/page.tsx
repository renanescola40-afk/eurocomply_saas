import { redirect } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { BILLING_PLANS, getSelfServePlan } from '@/server/billing/plans';
import { getStripe } from '@/server/billing/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? 'http://localhost:3000';

function getBaseUrl() {
  if (APP_URL.startsWith('http')) return APP_URL;
  return `https://${APP_URL}`;
}

export default async function BillingCheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; plan: string }>;
}) {
  const { locale, plan } = await params;
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const normalizedPlan = getSelfServePlan(plan);

  if (!normalizedPlan) {
    redirect(`/${activeLocale}/pricing`);
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${activeLocale}/login?next=/${activeLocale}/billing/checkout/${normalizedPlan}`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) {
    redirect(`/${activeLocale}/onboarding`);
  }

  const stripe = getStripe();
  const billingPlan = BILLING_PLANS[normalizedPlan];
  const baseUrl = getBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: billingPlan.stripePriceEnv, quantity: 1 }],
    success_url: `${baseUrl}/${activeLocale}/dashboard/organizations?billing=success&plan=${normalizedPlan}`,
    cancel_url: `${baseUrl}/${activeLocale}/pricing?billing=cancelled&plan=${normalizedPlan}`,
    allow_promotion_codes: true,
    client_reference_id: organization.id,
    customer_email: user.email ?? undefined,
    metadata: {
      organization_id: organization.id,
      user_id: user.id,
      plan: normalizedPlan,
    },
    subscription_data: {
      metadata: {
        organization_id: organization.id,
        user_id: user.id,
        plan: normalizedPlan,
      },
    },
  });

  if (!session.url) {
    redirect(`/${activeLocale}/pricing?billing=unavailable`);
  }

  redirect(session.url);
}
