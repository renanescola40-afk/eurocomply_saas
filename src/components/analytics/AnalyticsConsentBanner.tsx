'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { denyAnalyticsConsent, grantAnalyticsConsent, initPostHog } from '@/lib/analytics/posthog-client';
import { getCommercialSurfaceCopy } from '@/lib/i18n/commercial-surface-copy';
import { locales, type Locale } from '@/lib/i18n/routing';

const CONSENT_STORAGE_KEY = 'risckcomply.analytics.consent';
const CONSENT_TITLE_ID = 'analytics-consent-title';
const CONSENT_DESCRIPTION_ID = 'analytics-consent-description';

const policyLabel: Record<Locale, string> = {
  en: 'Cookie Policy and settings',
  pt: 'Política de Cookies e definições',
  es: 'Política de Cookies y ajustes',
  fr: 'Politique relative aux cookies et réglages',
  it: 'Cookie Policy e impostazioni',
  de: 'Cookie-Richtlinie und Einstellungen',
};

function consentIsRequired() {
  return process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === 'true';
}

function localeFromPath(pathname: string): Locale {
  const candidate = pathname.split('/').filter(Boolean)[0];
  return (locales.includes(candidate as Locale) ? candidate : 'en') as Locale;
}

export function AnalyticsConsentBanner() {
  const pathname = usePathname() || '/';
  const locale = localeFromPath(pathname);
  const copy = getCommercialSurfaceCopy(localeFromPath(pathname)).consent;
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!consentIsRequired()) return;
    const existingConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    setVisible(existingConsent !== 'granted' && existingConsent !== 'denied');
  }, []);

  useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={CONSENT_TITLE_ID}
      aria-describedby={CONSENT_DESCRIPTION_ID}
      tabIndex={-1}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border bg-background/95 p-4 shadow-2xl backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p id={CONSENT_TITLE_ID} className="text-sm font-semibold">{copy.title}</p>
          <p id={CONSENT_DESCRIPTION_ID} className="mt-1 text-xs leading-5 text-muted-foreground">{copy.body}</p>
          <Link href={`/${locale}/cookie-policy`} className="mt-2 inline-flex rounded-sm text-xs font-semibold text-cyan-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            {policyLabel[locale]}
          </Link>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              denyAnalyticsConsent();
              setVisible(false);
            }}
          >
            {copy.decline}
          </Button>
          <Button
            type="button"
            className="rounded-full"
            onClick={() => {
              grantAnalyticsConsent();
              initPostHog(window.location.pathname);
              setVisible(false);
            }}
          >
            {copy.allow}
          </Button>
        </div>
      </div>
    </div>
  );
}
