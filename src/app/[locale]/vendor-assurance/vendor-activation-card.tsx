'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analyticsEvents, captureAnalyticsEvent } from '@/lib/analytics/posthog-client';

const storageKey = 'risckcomply.vendor-assurance.created-count';

export function VendorActivationCard({ locale }: { locale: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(storageKey) ?? '0');
    if (Number.isFinite(saved) && saved > 0) setCount(saved);
  }, []);

  function createVendorRecord() {
    setCount((current) => {
      const next = current + 1;
      window.localStorage.setItem(storageKey, String(next));
      return next;
    });

    captureAnalyticsEvent(analyticsEvents.vendorCreated, {
      source: 'vendor_assurance_activation',
      locale,
      count: 1,
    });
  }

  return (
    <aside className="rounded-[2rem] border bg-background/90 p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Vendor activation</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Create a privacy-safe vendor record signal for onboarding analytics. No supplier name, contract detail or assurance evidence is captured.
      </p>
      <Button type="button" onClick={createVendorRecord} className="mt-5 w-full rounded-full">
        <Plus className="h-4 w-4" /> Create vendor record
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">Local vendor records created: {count}</p>
    </aside>
  );
}
