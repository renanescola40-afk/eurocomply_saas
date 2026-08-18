import { redirect } from 'next/navigation';

import { locales, type Locale } from '@/lib/i18n/routing';

type LegacyFriaAssessmentPageProps = {
  params: {
    locale: string;
    id: string;
  };
};

export default function LegacyFriaAssessmentPage({ params }: LegacyFriaAssessmentPageProps) {
  const locale = (locales.includes(params.locale as Locale) ? params.locale : 'en') as Locale;
  const query = new URLSearchParams({ assessment: params.id });

  redirect(`/${locale}/dashboard/fria?${query.toString()}`);
}
