import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, readyEnvironmentCheck } from './route';

function makeRequest(token?: string) {
  return new Request('https://app.eurocomply.example/api/ready', {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe('ready endpoint hardening', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('groups environment readiness without exposing individual variable names', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');

    expect(readyEnvironmentCheck()).toEqual([
      {
        name: 'supabase',
        configured: true,
        missingCount: 0,
      },
    ]);
  });

  it('returns no-store unauthorized responses in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('HEALTHCHECK_TOKEN', 'expected-token');

    const response = await GET(makeRequest('wrong-token'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ status: 'unauthorized' });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('returns grouped readiness gaps without listing individual env keys', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('HEALTHCHECK_TOKEN', 'expected-token');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    const response = await GET(makeRequest('expected-token'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.environment).toEqual([
      {
        name: 'supabase',
        configured: false,
        missingCount: 3,
      },
    ]);
    expect(JSON.stringify(body)).not.toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(JSON.stringify(body)).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
