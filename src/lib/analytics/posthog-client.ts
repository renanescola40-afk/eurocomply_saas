'use client';

import { analyticsEvents, sanitizeAnalyticsProperties, type AnalyticsEventName, type AnalyticsProperties } from './events';

type PostHogBrowser = {
  init: (key: string, options: Record<string, unknown>) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  group: (groupType: string, groupKey: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
  opt_in_capturing?: () => void;
  opt_out_capturing?: () => void;
  has_opted_in_capturing?: () => boolean;
  has_opted_out_capturing?: () => boolean;
  stopSessionRecording?: () => void;
  startSessionRecording?: () => void;
  isFeatureEnabled?: (flag: string) => boolean | undefined;
  onFeatureFlags?: (callback: () => void) => void;
};

declare global {
  interface Window {
    posthog?: PostHogBrowser;
    __posthogLoaded?: boolean;
    __posthogLoading?: boolean;
  }
}

const POSTHOG_SCRIPT_ID = 'posthog-js-sdk';
const CONSENT_STORAGE_KEY = 'risckcomply.analytics.consent';
const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';
const SENSITIVE_PATH_PATTERNS = [
  /\/documents?(\/|$)/i,
  /\/riscos?(\/|$)/i,
  /\/vendor-assurance(\/|$)/i,
  /\/uploads?(\/|$)/i,
  /\/settings(\/|$)/i,
  /\/billing(\/|$)/i,
];

function getPostHogKey() {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || '';
}

function getPostHogHost() {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;
}

function requiresConsent() {
  return process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === 'true';
}

function hasAnalyticsConsent() {
  if (typeof window === 'undefined') return false;
  if (!requiresConsent()) return true;
  return window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted';
}

export function grantAnalyticsConsent() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
  window.posthog?.opt_in_capturing?.();
}

export function denyAnalyticsConsent() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
  window.posthog?.stopSessionRecording?.();
  window.posthog?.opt_out_capturing?.();
}

export function isSensitiveAnalyticsPath(pathname: string) {
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function installPostHogQueue() {
  if (typeof window === 'undefined') return undefined;
  const existing = window.posthog;
  if (existing) return existing;

  const queue = [] as unknown[];
  const posthog = queue as unknown as PostHogBrowser;
  const methods = ['init', 'capture', 'identify', 'group', 'reset', 'opt_in_capturing', 'opt_out_capturing'];

  for (const method of methods) {
    (posthog as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
      queue.push([method, ...args]);
    };
  }

  window.posthog = posthog;
  return posthog;
}

export function initPostHog(pathname?: string) {
  if (typeof window === 'undefined') return;
  const apiKey = getPostHogKey();

  if (!apiKey || window.__posthogLoaded || window.__posthogLoading || !hasAnalyticsConsent()) return;

  const posthog = installPostHogQueue();
  if (!posthog) return;

  window.__posthogLoading = true;
  const script = document.createElement('script');
  script.id = POSTHOG_SCRIPT_ID;
  script.async = true;
  script.src = `${getPostHogHost().replace(/\/$/, '')}/static/array.js`;
  script.onload = () => {
    window.__posthogLoaded = true;
    window.__posthogLoading = false;
  };
  script.onerror = () => {
    window.__posthogLoading = false;
  };

  if (!document.getElementById(POSTHOG_SCRIPT_ID)) {
    document.head.appendChild(script);
  }

  posthog.init(apiKey, {
    api_host: getPostHogHost(),
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    respect_dnt: true,
    persistence: 'localStorage+cookie',
    opt_out_capturing_by_default: requiresConsent(),
    loaded: (loadedPostHog: PostHogBrowser) => {
      if (pathname && isSensitiveAnalyticsPath(pathname)) {
        loadedPostHog.stopSessionRecording?.();
      }
    },
  });
}

export function updateSessionRecordingForPath(pathname: string) {
  if (typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) {
    window.posthog?.stopSessionRecording?.();
    return;
  }

  if (isSensitiveAnalyticsPath(pathname)) {
    window.posthog?.stopSessionRecording?.();
    return;
  }

  if (process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY === 'true') {
    window.posthog?.startSessionRecording?.();
  }
}

export function identifyAnalyticsUser(userId: string | null | undefined, properties: AnalyticsProperties = {}) {
  if (!userId || typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  initPostHog(window.location.pathname);
  window.posthog?.identify(userId, sanitizeAnalyticsProperties(properties));
}

export function groupAnalyticsOrganization(organizationId: string | null | undefined, properties: AnalyticsProperties = {}) {
  if (!organizationId || typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  initPostHog(window.location.pathname);
  window.posthog?.group('company', organizationId, sanitizeAnalyticsProperties(properties));
}

export function captureAnalyticsEvent(event: AnalyticsEventName, properties: AnalyticsProperties = {}) {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  initPostHog(window.location.pathname);
  window.posthog?.capture(event, sanitizeAnalyticsProperties({ schema_version: 1, ...properties }));
}

export function resetAnalytics() {
  if (typeof window === 'undefined') return;
  window.posthog?.reset();
}

export function isAnalyticsFeatureEnabled(flag: 'ai_features' | 'enterprise_exports' | 'onboarding_v2') {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return false;
  initPostHog(window.location.pathname);
  return Boolean(window.posthog?.isFeatureEnabled?.(flag));
}

export { analyticsEvents };
