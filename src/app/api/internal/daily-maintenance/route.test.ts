import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConfiguredMaintenanceBaseUrl, resolveMaintenanceBaseUrl } from './route';

function makeRequest(url = 'https://attacker.example/api/internal/daily-maintenance') {
  return new Request(url, {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-cron-secret',
    },
  });
}

describe('daily maintenance base URL hardening', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the configured app URL and ignores the caller host', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.eurocomply.example/some/path/');

    expect(getConfiguredMaintenanceBaseUrl()).toBe('https://app.eurocomply.example');
    expect(resolveMaintenanceBaseUrl(makeRequest())).toBe('https://app.eurocomply.example');
  });

  it('rejects non-http app URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'file:///etc/passwd');

    expect(getConfiguredMaintenanceBaseUrl()).toBeNull();
  });

  it('fails closed in production when the app URL is missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    expect(resolveMaintenanceBaseUrl(makeRequest())).toBeNull();
  });

  it('allows request-origin fallback only outside production', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    expect(resolveMaintenanceBaseUrl(makeRequest('http://localhost:3000/api/internal/daily-maintenance'))).toBe('http://localhost:3000');
  });
});
