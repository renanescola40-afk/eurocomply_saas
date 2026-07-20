#!/usr/bin/env node

export function classifyProviderFailure(provider, input = {}) {
  const status = Number(input.status ?? 0);
  const code = String(input.code ?? '').toLowerCase();
  const message = String(input.message ?? '').toLowerCase();
  const retryAfter = Number(input.retryAfterSeconds ?? 0);

  let category = 'unknown';
  let retryable = false;
  let severity = 'error';

  if (status === 401 || status === 403 || /auth|signature|token|permission/.test(`${code} ${message}`)) {
    category = 'authentication';
    severity = 'critical';
  } else if (status === 429 || /rate.?limit|too many/.test(`${code} ${message}`)) {
    category = 'rate_limit';
    retryable = true;
    severity = 'warning';
  } else if (status >= 500 || /timeout|unavailable|connection|network/.test(`${code} ${message}`)) {
    category = 'provider_unavailable';
    retryable = true;
    severity = 'critical';
  } else if (status >= 400 && status < 500) {
    category = 'request_rejected';
  }

  return {
    provider: String(provider || 'unknown'),
    category,
    retryable,
    severity,
    retryAfterSeconds: retryAfter > 0 ? retryAfter : null,
    publicCode: `provider_${category}`,
  };
}

if (process.argv[1]?.endsWith('provider-failure-classifier.mjs')) {
  console.log(JSON.stringify(classifyProviderFailure(process.argv[2], {
    status: process.argv[3], code: process.argv[4], message: process.argv.slice(5).join(' '),
  })));
}
