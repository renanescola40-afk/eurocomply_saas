import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

const supabaseMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  setAll: null as null | ((cookies: CookieToSet[]) => void),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: supabaseMock.createServerClient,
}));

vi.mock('next-intl/middleware', async () => {
  const { NextResponse } = await import('next/server');

  return {
    default: () => (request: { headers: Headers }) =>
      NextResponse.next({ request: { headers: request.headers } }),
  };
});

import { NextRequest } from 'next/server';
import middleware from '../src/middleware';

function makeRequest(path: string) {
  return new NextRequest(`https://app.example${path}`);
}

function configureSession({
  user,
  error = null,
  cookies = [],
}: {
  user: { id: string } | null;
  error?: { message: string } | null;
  cookies?: CookieToSet[];
}) {
  supabaseMock.getUser.mockImplementation(async () => {
    supabaseMock.setAll?.(cookies);
    return { data: { user }, error };
  });
}

function responseLocation(response: Response) {
  const location = response.headers.get('location');
  return location ? new URL(location) : null;
}

describe('Supabase middleware session cookie propagation', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key');

    supabaseMock.setAll = null;
    supabaseMock.createServerClient.mockReset();
    supabaseMock.getUser.mockReset();
    supabaseMock.createServerClient.mockImplementation(
      (
        _url: string,
        _key: string,
        options: { cookies: { setAll: (cookies: CookieToSet[]) => void } },
      ) => {
        supabaseMock.setAll = options.cookies.setAll;
        return { auth: { getUser: supabaseMock.getUser } };
      },
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    supabaseMock.createServerClient.mockReset();
    supabaseMock.getUser.mockReset();
    supabaseMock.setAll = null;
  });

  it('redirects a valid authenticated login request to localized onboarding', async () => {
    configureSession({ user: { id: 'user-valid' } });

    const response = await middleware(makeRequest('/en/login'));
    const location = responseLocation(response);

    expect(response.status).toBe(307);
    expect(location?.pathname).toBe('/en/onboarding');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });

  it('returns refreshed Supabase cookies on the authenticated redirect response', async () => {
    configureSession({
      user: { id: 'user-refreshed' },
      cookies: [
        {
          name: 'sb-project-auth-token',
          value: 'refreshed-session',
          options: { httpOnly: true, path: '/', sameSite: 'lax' },
        },
      ],
    });

    const response = await middleware(makeRequest('/en/login?plan=growth'));

    expect(responseLocation(response)?.pathname).toBe('/en/onboarding');
    expect(responseLocation(response)?.searchParams.get('plan')).toBe('growth');
    expect(response.cookies.get('sb-project-auth-token')?.value).toBe('refreshed-session');
  });

  it('propagates cookie cleanup for an expired or revoked private session', async () => {
    configureSession({
      user: null,
      error: { message: 'session_expired' },
      cookies: [
        {
          name: 'sb-project-auth-token',
          value: '',
          options: { maxAge: 0, path: '/' },
        },
      ],
    });

    const response = await middleware(
      makeRequest('/en/dashboard/organizations?tab=security'),
    );
    const location = responseLocation(response);

    expect(location?.pathname).toBe('/en/login');
    expect(location?.searchParams.get('next')).toBe(
      '/en/dashboard/organizations?tab=security',
    );
    expect(response.cookies.get('sb-project-auth-token')?.value).toBe('');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('keeps authenticated onboarding on the route while preserving refreshed cookies', async () => {
    configureSession({
      user: { id: 'user-onboarding' },
      cookies: [
        {
          name: 'sb-project-auth-token',
          value: 'onboarding-session',
          options: { httpOnly: true, path: '/' },
        },
      ],
    });

    const response = await middleware(makeRequest('/en/onboarding'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.cookies.get('sb-project-auth-token')?.value).toBe(
      'onboarding-session',
    );
    expect(response.cookies.get('NEXT_LOCALE')?.value).toBe('en');
  });

  it('does not initialize Supabase for public routes that do not need an auth decision', async () => {
    const response = await middleware(makeRequest('/en/pricing'));

    expect(response.status).toBe(200);
    expect(supabaseMock.createServerClient).not.toHaveBeenCalled();
    expect(response.cookies.get('NEXT_LOCALE')?.value).toBe('en');
  });
});
