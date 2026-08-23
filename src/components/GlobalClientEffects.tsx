"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  ANALYTICS_CONSENT_GRANTED_EVENT,
  analyticsEvents,
  captureAnalyticsEvent,
} from "@/lib/analytics/posthog-client";
import {
  buildCommercialCtaProperties,
  resolveCommercialCtaId,
} from "@/lib/analytics/commercial-cta";
import {
  classifyPublicMarketingPage,
  getMarketingAttributionProperties,
  persistMarketingAttribution,
} from "@/lib/analytics/marketing-attribution";
import { useZoerIframe } from "@/hooks/useZoerIframe";

const CONSENT_STORAGE_KEY = "risckcomply.analytics.consent";

function isMarketingCaptureAllowed() {
  if (process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === "false") return true;
  return window.localStorage.getItem(CONSENT_STORAGE_KEY) === "granted";
}

export default function GlobalClientEffects() {
  const pathname = usePathname() || "/";

  useZoerIframe();

  useEffect(() => {
    persistMarketingAttribution();

    const capturePublicPageView = () => {
      const page = classifyPublicMarketingPage(pathname);
      if (!page || !isMarketingCaptureAllowed()) return;

      const key = `risckcomply.analytics.public_page.${page.event}.${pathname}.${window.location.search}`;
      if (window.sessionStorage.getItem(key)) return;

      captureAnalyticsEvent(page.event, {
        path: pathname,
        page_type: page.pageType,
        funnel_stage: page.funnelStage,
        ...getMarketingAttributionProperties("last_touch"),
      });
      window.sessionStorage.setItem(key, "1");
    };

    capturePublicPageView();
    window.addEventListener(ANALYTICS_CONSENT_GRANTED_EVENT, capturePublicPageView);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_GRANTED_EVENT, capturePublicPageView);
    };
  }, [pathname]);

  useEffect(() => {
    const captureCommercialCta = (event: MouseEvent) => {
      if (!isMarketingCaptureAllowed()) return;
      if (!(event.target instanceof Element)) return;

      const target = event.target.closest<HTMLElement>("[data-cta-id],a[href]");
      if (!target) return;

      const ctaId = resolveCommercialCtaId({
        pathname,
        explicitId: target.dataset.ctaId,
        href: target instanceof HTMLAnchorElement ? target.getAttribute("href") : null,
      });
      if (!ctaId) return;

      const properties = buildCommercialCtaProperties(pathname, ctaId);
      if (!properties.cta_id) return;

      persistMarketingAttribution();
      captureAnalyticsEvent(analyticsEvents.ctaClicked, {
        ...properties,
        ...getMarketingAttributionProperties("last_touch"),
      });
    };

    document.addEventListener("click", captureCommercialCta);
    return () => document.removeEventListener("click", captureCommercialCta);
  }, [pathname]);

  useEffect(() => {
    const captureCheckoutSuccess = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const checkoutStatus = searchParams.get("checkout");

      if (checkoutStatus !== "success" || !isMarketingCaptureAllowed()) return;

      const key = `risckcomply.analytics.checkout_success.${pathname}.${window.location.search}`;
      if (window.sessionStorage.getItem(key)) return;

      captureAnalyticsEvent(analyticsEvents.checkoutCompleted, {
        path: pathname,
        source: "return_url",
        funnel_stage: "commercial",
        ...getMarketingAttributionProperties("last_touch"),
      });
      window.sessionStorage.setItem(key, "1");

      searchParams.delete("checkout");
      const nextSearch = searchParams.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", nextUrl);
    };

    captureCheckoutSuccess();
    window.addEventListener(ANALYTICS_CONSENT_GRANTED_EVENT, captureCheckoutSuccess);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_GRANTED_EVENT, captureCheckoutSuccess);
    };
  }, [pathname]);

  return null;
}
