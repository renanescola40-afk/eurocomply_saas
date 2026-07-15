#!/usr/bin/env node

function parseHttpsUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function isExactProductionCallback(value, siteUrl) {
  const callback = parseHttpsUrl(value);
  if (!callback || !siteUrl) return false;

  return callback.origin === siteUrl.origin
    && callback.pathname === '/auth/callback'
    && callback.search === ''
    && callback.hash === '';
}

const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN ?? '').trim();
const projectRef = String(process.env.SUPABASE_PROJECT_REF ?? '').trim();

if (!accessToken || !projectRef) {
  process.exit(2);
}

try {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!response.ok) process.exit(3);

  const config = await response.json();
  const siteUrl = parseHttpsUrl(config.external_url ?? config.site_url);
  const allowlist = Array.isArray(config.uri_allow_list)
    ? config.uri_allow_list
    : String(config.uri_allow_list ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  const passed = config.external_google_enabled === true
    && Boolean(siteUrl)
    && allowlist.some((value) => isExactProductionCallback(value, siteUrl));

  process.exit(passed ? 0 : 4);
} catch {
  process.exit(5);
}
