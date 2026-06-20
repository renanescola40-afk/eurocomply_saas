const ALLOWED_APP_URL_PROTOCOLS = new Set(['http:', 'https:']);

export type BillingReturnBaseUrlResult =
  | { ok: true; appUrl: string }
  | { ok: false; error: 'billing_app_url_unavailable' };

type BillingReturnBaseUrlEnv = {
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
};

function normalizeConfiguredAppUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (!ALLOWED_APP_URL_PROTOCOLS.has(url.protocol) || !url.host) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function resolveRequestOrigin(requestUrl: string) {
  try {
    const url = new URL(requestUrl);
    if (!ALLOWED_APP_URL_PROTOCOLS.has(url.protocol) || !url.host) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveBillingReturnBaseUrl(
  requestUrl: string,
  env: BillingReturnBaseUrlEnv = process.env,
): BillingReturnBaseUrlResult {
  const configuredAppUrl = normalizeConfiguredAppUrl(env.NEXT_PUBLIC_APP_URL);

  if (configuredAppUrl) {
    return { ok: true, appUrl: configuredAppUrl };
  }

  if (env.NODE_ENV === 'production') {
    return { ok: false, error: 'billing_app_url_unavailable' };
  }

  const developmentFallback = resolveRequestOrigin(requestUrl);
  if (!developmentFallback) {
    return { ok: false, error: 'billing_app_url_unavailable' };
  }

  return { ok: true, appUrl: developmentFallback };
}
