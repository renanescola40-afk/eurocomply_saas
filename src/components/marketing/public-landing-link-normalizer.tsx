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

function getPublicCheckoutHref(anchor: HTMLAnchorElement, locale: string) {
  const url = new URL(anchor.href, window.location.origin);
  if (url.origin !== window.location.origin) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  const [hrefLocale, billing, checkout, rawPlan] = segments;
  if (hrefLocale !== locale || billing !== 'billing' || checkout !== 'checkout' || !rawPlan) return null;

  const plan = PLAN_ALIASES[rawPlan.toLowerCase()];
  if (!plan || plan === 'enterprise') return null;

  return `/${locale}/checkout?plan=${encodeURIComponent(plan)}`;
}

export function PublicLandingLinkNormalizer({ locale }: { locale: string }) {
  useEffect(() => {
    if (!isSafeLocale(locale)) return;

    const normalizeAnchors = () => {
      for (const anchor of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
        const normalizedHref = getPublicCheckoutHref(anchor, locale);
        if (normalizedHref) anchor.setAttribute('href', normalizedHref);
      }
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement)) return;

      const normalizedHref = getPublicCheckoutHref(target, locale);
      if (!normalizedHref) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(normalizedHref);
    };

    normalizeAnchors();
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, [locale]);

  return null;
}
