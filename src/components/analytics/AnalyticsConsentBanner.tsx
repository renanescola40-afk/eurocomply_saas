'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { denyAnalyticsConsent, grantAnalyticsConsent } from '@/lib/analytics/posthog-client';

const CONSENT_STORAGE_KEY = 'risckcomply.analytics.consent';

function consentIsRequired() {
  return process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === 'true';
}

export function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!consentIsRequired()) return;
    const existingConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    setVisible(existingConsent !== 'granted' && existingConsent !== 'denied');
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border bg-background/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold">Privacy-first product analytics</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Help us improve RISCK COMPLY by sharing privacy-safe usage analytics. We do not capture document contents, risk notes, vendor names, form inputs or compliance data.
          </p>
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
            Decline
          </Button>
          <Button
            type="button"
            className="rounded-full"
            onClick={() => {
              grantAnalyticsConsent();
              setVisible(false);
              window.location.reload();
            }}
          >
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}
