import { redirect } from 'next/navigation';
import { normalizeLocale } from '@/lib/i18n/locales';
import { normalizeBillingPlanId } from '@/server/billing/plans';

export const dynamic = 'force-dynamic';

export default async function BillingCheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; plan: string }>;
}) {
  const { locale, plan } = await params;
  const activeLocale = normalizeLocale(locale);
  const normalizedPlan = normalizeBillingPlanId(plan);

  if (!normalizedPlan) {
    redirect(`/${activeLocale}/pricing?checkout=invalid_plan`);
  }

  redirect(`/${activeLocale}/checkout?plan=${encodeURIComponent(normalizedPlan)}`);
}
