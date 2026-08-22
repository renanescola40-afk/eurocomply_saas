import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/auth/google/route';

const root = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('localized legacy Google auth route', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.risckcomply.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps the localized route bound to the hardened root handler', () => {
    const localizedGoogleRoute = readRepoFile('src/app/[locale]/auth/google/route.ts');
    const localizedCallbackRoute = readRepoFile('src/app/[locale]/auth/callback/route.ts');

    expect(localizedGoogleRoute.trim()).toBe("export { GET } from '@/app/auth/google/route';");
    expect(localizedCallbackRoute.trim()).toBe("export { GET } from '@/app/auth/callback/route';");
  });

  it('honors the locale encoded in a direct localized legacy route', async () => {
    const request = new NextRequest(
      'https://www.risckcomply.com/pt/auth/google?next=%2Fpt%2Fdashboard%2Forganizations',
    );

    const response = await GET(request);
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(307);
    expect(location.origin).toBe('https://www.risckcomply.com');
    expect(location.pathname).toBe('/pt/login');
    expect(location.searchParams.get('next')).toBe('/pt/dashboard/organizations');
    expect(location.searchParams.get('notice')).toBe('legacy_google_route');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('keeps an explicit allowlisted locale authoritative after middleware localization', async () => {
    const request = new NextRequest(
      'https://www.risckcomply.com/en/auth/google?locale=pt&next=%2Fpt%2Fdashboard%2Forganizations',
    );

    const response = await GET(request);
    const location = new URL(response.headers.get('location') ?? '');

    expect(location.pathname).toBe('/pt/login');
    expect(location.searchParams.get('next')).toBe('/pt/dashboard/organizations');
  });

  it('preserves the hardened configured-origin and no-store legacy redirect contract', () => {
    const googleRoute = readRepoFile('src/app/auth/google/route.ts');

    expect(googleRoute).toContain('resolveAuthAppBaseUrl(request.url)');
    expect(googleRoute).toContain("noStoreJson({ error: 'auth_app_url_unavailable' }, { status: 503 })");
    expect(googleRoute).toContain("loginUrl.searchParams.set('notice', 'legacy_google_route')");
    expect(googleRoute).toContain('applyNoStoreHeaders(NextResponse.redirect(loginUrl))');
  });

  it('documents why the localized alias is required by the current middleware routing model', () => {
    const middleware = readRepoFile('src/middleware.ts');

    expect(middleware).toContain('const redirectUrl = new URL(`/${detected}${pathname}`, req.url)');
    expect(middleware).toContain('redirectUrl.search = req.nextUrl.search');
  });
});
