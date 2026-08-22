import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('localized legacy Google auth route', () => {
  it('keeps the localized route bound to the hardened root handler', () => {
    const localizedGoogleRoute = readRepoFile('src/app/[locale]/auth/google/route.ts');
    const localizedCallbackRoute = readRepoFile('src/app/[locale]/auth/callback/route.ts');

    expect(localizedGoogleRoute.trim()).toBe("export { GET } from '@/app/auth/google/route';");
    expect(localizedCallbackRoute.trim()).toBe("export { GET } from '@/app/auth/callback/route';");
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
