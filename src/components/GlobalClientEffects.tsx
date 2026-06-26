"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { analyticsEvents, captureAnalyticsEvent } from "@/lib/analytics/posthog-client";
import { useZoerIframe } from "@/hooks/useZoerIframe";

export default function GlobalClientEffects() {
  const pathname = usePathname() || "/";

  useZoerIframe();

  useEffect(() => {
    const checkoutStatus = new URLSearchParams(window.location.search).get("checkout");

    if (checkoutStatus !== "success") return;

    const key = `risckcomply.analytics.checkout_success.${pathname}`;
    if (window.sessionStorage.getItem(key)) return;

    window.sessionStorage.setItem(key, "1");
    captureAnalyticsEvent(analyticsEvents.checkoutCompleted, {
      path: pathname,
      source: "return_url",
    });
  }, [pathname]);

  return null;
}
