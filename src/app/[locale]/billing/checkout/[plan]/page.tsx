import { redirect } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getStripePriceId, isSelfServePlan } from '@/server/billing/plans';
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

  if (!isSelfServePlan(plan)) {
    redirect(`/${activeLocale}/pricing`);
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${activeLocale}/login?next=/${activeLocale}/billing/checkout/${plan}`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) {
    redirect(`/${activeLocale}/onboarding`);
  }

  const stripe = getStripe();
  const baseUrl = getBaseUrl();
  const priceId = getStripePriceId(plan);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/${activeLocale}/dashboard/organizations?billing=success&plan=${plan}`,
    cancel_url: `${baseUrl}/${activeLocale}/pricing?billing=cancelled&plan=${plan}`,
    allow_promotion_codes: true,
    client_reference_id: organization.id,
    customer_email: user.email ?? undefined,
    metadata: {
      organization_id: organization.id,
      user_id: user.id,
      plan,
    },
    subscription_data: {
      metadata: {
        organization_id: organization.id,
        user_id: user.id,
        plan,
      },
    },
  });

  if (!session.url) {
    redirect(`/${activeLocale}/pricing?billing=unavailable`);
  }

  redirect(session.url);
}
