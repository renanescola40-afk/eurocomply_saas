import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const callback = readFileSync(join(root, 'src/app/auth/callback/route.ts'), 'utf8');
const auth = readFileSync(join(root, 'src/hooks/useAuth.tsx'), 'utf8');

describe('OAuth callback locale continuity', () => {
  it('gives the explicit allowlisted OAuth locale precedence over a transient middleware path prefix', () => {
    const queryLookup = callback.indexOf("const queryLocale = requestUrl.searchParams.get('locale')");
    const pathLookup = callback.indexOf("const firstPathSegment = requestUrl.pathname.split('/').filter(Boolean)[0]");

    expect(queryLookup).toBeGreaterThan(-1);
    expect(pathLookup).toBeGreaterThan(queryLookup);
    expect(callback).toContain('queryLocale && locales.includes(queryLocale as Locale)');
    expect(callback).toContain('return queryLocale as Locale');
    expect(callback).not.toContain("? firstPathSegment\n    : requestUrl.searchParams.get('locale') ?? request.cookies.get(LOCALE_COOKIE)?.value");
  });

  it('keeps invalid locale input fail-closed to path, cookie or default locale authority', () => {
    expect(callback).toContain('locales.includes(queryLocale as Locale)');
    expect(callback).toContain('locales.includes(firstPathSegment as Locale)');
    expect(callback).toContain('request.cookies.get(LOCALE_COOKIE)?.value');
    expect(callback).toContain('defaultLocale');
  });

  it('keeps OAuth initiation bound to the root callback with an explicit selected locale', () => {
    expect(auth).toContain("const callbackUrl = new URL('/auth/callback', window.location.origin)");
    expect(auth).toContain("callbackUrl.searchParams.set('locale', locale)");
    expect(auth).toContain("provider: 'google'");
    expect(auth).toContain('redirectTo: getRootAuthCallbackUrl(options?.next)');
  });

  it('does not weaken callback continuation or open-redirect guards', () => {
    expect(callback).toContain('CALLBACK_CONTINUATION_PATHS');
    expect(callback).toContain("normalizedNext.startsWith('//')");
    expect(callback).toContain("normalizedNext.includes('://')");
    expect(callback).toContain('isAllowedCallbackContinuation(normalizedNext, locale)');
    expect(callback).toContain('applyNoStoreHeaders');
  });
});
