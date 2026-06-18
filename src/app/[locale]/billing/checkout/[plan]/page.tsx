import { redirect } from 'next/navigation';
import { normalizeLocale } from '@/lib/i18n/locales';
import { isSelfServePlan } from '@/server/billing/plans';

export const dynamic = 'force-dynamic';

export default async function BillingCheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; plan: string }>;
}) {
  const { locale, plan } = await params;
  const activeLocale = normalizeLocale(locale);

  if (!isSelfServePlan(plan)) {
    redirect(`/${activeLocale}/pricing?checkout=invalid_plan`);
  }

  redirect(`/${activeLocale}/pricing?checkout=start_secure_checkout&plan=${encodeURIComponent(plan)}`);
}
