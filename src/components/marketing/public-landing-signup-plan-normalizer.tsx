'use client';

import { useEffect } from 'react';
import { locales, type Locale } from '@/lib/i18n/routing';

const SIGNUP_PLAN_ALIASES: Record<string, string> = {
  essential: 'essential',
  starter: 'essential',
  professional: 'professional',
  business: 'professional',
  growth: 'professional',
};

function isSafeLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

function getNormalizedSignupHref(anchor: HTMLAnchorElement, locale: string) {
  const url = new URL(anchor.href, window.location.origin);
  if (url.origin !== window.location.origin || url.pathname !== `/${locale}/signup`) return null;

  const plan = SIGNUP_PLAN_ALIASES[url.searchParams.get('plan')?.toLowerCase() ?? ''];
  if (!plan) return null;

  const next = url.searchParams.get('next');
  if (next !== `/${locale}/onboarding`) return null;

  const params = new URLSearchParams(url.searchParams);
  params.set('plan', plan);
  params.set('next', `/${locale}/onboarding?plan=${encodeURIComponent(plan)}`);
  return `/${locale}/signup?${params.toString()}`;
}

export function PublicLandingSignupPlanNormalizer({ locale }: { locale: string }) {
  useEffect(() => {
    if (!isSafeLocale(locale)) return;

    for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
      const normalizedHref = getNormalizedSignupHref(anchor, locale);
      if (normalizedHref) anchor.setAttribute('href', normalizedHref);
    }
  }, [locale]);

  return null;
}
