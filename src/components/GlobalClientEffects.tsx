"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { analyticsEvents, captureAnalyticsEvent } from "@/lib/analytics/posthog-client";
import { useZoerIframe } from "@/hooks/useZoerIframe";

export default function GlobalClientEffects() {
  const pathname = usePathname() || "/";

  useZoerIframe();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const checkoutStatus = searchParams.get("checkout");

    if (checkoutStatus !== "success") return;

    const key = `risckcomply.analytics.checkout_success.${pathname}.${window.location.search}`;
    if (window.sessionStorage.getItem(key)) return;

    window.sessionStorage.setItem(key, "1");
    captureAnalyticsEvent(analyticsEvents.checkoutCompleted, {
      path: pathname,
      source: "return_url",
    });

    searchParams.delete("checkout");
    const nextSearch = searchParams.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [pathname]);

  return null;
}
