"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analyticsEvents, captureAnalyticsEvent } from "@/lib/analytics/posthog-client";
import { useZoerIframe } from "@/hooks/useZoerIframe";

export default function GlobalClientEffects() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  useZoerIframe();

  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");

    if (checkoutStatus !== "success") return;

    const key = `risckcomply.analytics.checkout_success.${pathname}`;
    if (window.sessionStorage.getItem(key)) return;

    window.sessionStorage.setItem(key, "1");
    captureAnalyticsEvent(analyticsEvents.checkoutCompleted, {
      path: pathname,
      source: "return_url",
    });
  }, [pathname, searchParams]);

  return null;
}
