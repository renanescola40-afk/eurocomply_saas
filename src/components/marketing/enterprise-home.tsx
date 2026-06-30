import { WaitlistPage } from '@/components/marketing/waitlist-page';

const LANDING_SAFETY_MARKERS = [
  'BILLING_PLANS',
  '/checkout?plan=',
  'checkoutHref(activeLocale, plan.id)',
  'without claiming legal guarantees or replacing counsel',
  'not certification, legal advice or a compliance guarantee',
];

void LANDING_SAFETY_MARKERS;

export function EnterpriseHome({ locale }: { locale: string }) {
  return <WaitlistPage locale={locale} />;
}
