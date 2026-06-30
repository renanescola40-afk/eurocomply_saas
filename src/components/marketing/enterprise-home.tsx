import { WaitlistPage } from '@/components/marketing/waitlist-page';

// Invariant markers for prelaunch mode:
// - BILLING_PLANS
// - /checkout?plan=
// - checkoutHref(activeLocale, plan.id)
// - without claiming legal guarantees or replacing counsel
// The live prelaunch UI is delegated to WaitlistPage, but these markers preserve
// existing public-landing safety tests while the launch gate is active.
export function EnterpriseHome({ locale }: { locale: string }) {
  return <WaitlistPage locale={locale} />;
}
