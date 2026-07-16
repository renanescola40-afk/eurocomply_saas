#!/usr/bin/env node

const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;

function parseHttpsUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function isExactProductionCallback(value, expectedProductionUrl) {
  const callback = parseHttpsUrl(value);
  if (!callback || !expectedProductionUrl) return false;

  return callback.origin === expectedProductionUrl.origin
    && callback.pathname === '/auth/callback'
    && callback.search === ''
    && callback.hash === '';
}

async function readBoundedJsonResponse(response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new Error('provider_response_too_large');
  }

  if (!response.body) throw new Error('provider_response_body_missing');

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_PROVIDER_RESPONSE_BYTES) {
        await reader.cancel('provider_response_too_large');
        throw new Error('provider_response_too_large');
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return JSON.parse(text);
}

const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN ?? '').trim();
const projectRef = String(process.env.SUPABASE_PROJECT_REF ?? '').trim();
const expectedProductionUrl = parseHttpsUrl(process.env.RELEASE_PRODUCTION_URL);

if (!accessToken || !projectRef || !expectedProductionUrl) {
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

  const config = await readBoundedJsonResponse(response);
  const siteUrl = parseHttpsUrl(config.external_url ?? config.site_url);
  const allowlist = Array.isArray(config.uri_allow_list)
    ? config.uri_allow_list
    : String(config.uri_allow_list ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  const passed = config.external_google_enabled === true
    && Boolean(siteUrl)
    && siteUrl.origin === expectedProductionUrl.origin
    && allowlist.some((value) => isExactProductionCallback(value, expectedProductionUrl));

  process.exit(passed ? 0 : 4);
} catch {
  process.exit(5);
}
