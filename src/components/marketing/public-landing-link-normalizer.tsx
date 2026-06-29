'use client';

import { useEffect } from 'react';
import { locales, type Locale } from '@/lib/i18n/routing';

const PLAN_ALIASES: Record<string, string> = {
  essential: 'essential',
  starter: 'essential',
  professional: 'professional',
  business: 'professional',
  growth: 'professional',
  enterprise: 'enterprise',
};

function isSafeLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function PublicLandingLinkNormalizer({ locale }: { locale: string }) {
  useEffect(() => {
    if (!isSafeLocale(locale)) return;

    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));

    for (const anchor of anchors) {
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) continue;

      const segments = url.pathname.split('/').filter(Boolean);
      const [hrefLocale, billing, checkout, rawPlan] = segments;
      if (hrefLocale !== locale || billing !== 'billing' || checkout !== 'checkout' || !rawPlan) continue;

      const plan = PLAN_ALIASES[rawPlan.toLowerCase()];
      if (!plan) continue;

      anchor.href = `/${locale}/checkout?plan=${encodeURIComponent(plan)}`;
    }
  }, [locale]);

  return null;
}
