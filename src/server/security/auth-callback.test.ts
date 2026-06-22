import { describe, expect, it } from 'vitest';
import { normalizePublicAuthErrorCode } from '@/lib/auth/public-errors';
import {
  getAuthCallbackLoginUrl,
  getSafeAuthCallbackNextPath,
  getSafeAuthCallbackNextPathForLocale,
  resolveAuthAppBaseUrl,
} from './auth-callback';

const APP_URL_ENV = ['NEXT', 'PUBLIC', 'APP', 'URL'].join('_');

describe('auth callback redirect hardening', () => {
  it('falls back when next is missing or external', () => {
    expect(getSafeAuthCallbackNextPath(null)).toBe('/pt/dashboard/organizations');
    expect(getSafeAuthCallbackNextPath('https://evil.example/dashboard')).toBe('/pt/dashboard/organizations');
    expect(getSafeAuthCallbackNextPath('//evil.example/dashboard')).toBe('/pt/dashboard/organizations');
  });

  it('only allows localized dashboard paths', () => {
    expect(getSafeAuthCallbackNextPath('/en/dashboard/organizations')).toBe('/en/dashboard/organizations');
    expect(getSafeAuthCallbackNextPath('/pt/dashboard/evidence?id=123')).toBe('/pt/dashboard/evidence?id=123');
    expect(getSafeAuthCallbackNextPath('/en/settings')).toBe('/en/dashboard/organizations');
  });

  it('uses the caller locale when starting OAuth without a safe next path', () => {
    expect(getSafeAuthCallbackNextPathForLocale(null, 'fr')).toBe('/fr/dashboard/organizations');
    expect(getSafeAuthCallbackNextPathForLocale('/fr/dashboard/evidence', 'fr')).toBe('/fr/dashboard/evidence');
    expect(getSafeAuthCallbackNextPathForLocale('/en/dashboard/evidence', 'fr')).toBe('/fr/dashboard/organizations');
    expect(getSafeAuthCallbackNextPathForLocale('https://evil.example/fr/dashboard', 'fr')).toBe('/fr/dashboard/organizations');
  });

  it('only emits allowlisted public auth error codes', () => {
    expect(normalizePublicAuthErrorCode('missing_oauth_code')).toBe('missing_oauth_code');
    expect(normalizePublicAuthErrorCode('Database connection failed')).toBe('auth_exchange_failed');
    expect(normalizePublicAuthErrorCode('invalid_grant: refresh token revoked')).toBe('auth_exchange_failed');
  });

  it('builds login redirects with public codes and safe next paths', () => {
    const url = getAuthCallbackLoginUrl(
      'https://app.eurocomply.example/auth/callback',
      '/en/dashboard/organizations',
      'auth_exchange_failed',
    );

    expect(url.pathname).toBe('/en/login');
    expect(url.searchParams.get('error')).toBe('auth_exchange_failed');
    expect(url.searchParams.get('next')).toBe('/en/dashboard/organizations');
  });

  it('uses the configured app origin for auth redirects', () => {
    expect(
      resolveAuthAppBaseUrl('https://attacker.example/auth/google', {
        [APP_URL_ENV]: 'https://app.eurocomply.example/some-path',
        NODE_ENV: 'production',
      }),
    ).toBe('https://app.eurocomply.example');
  });

  it('fails closed in production when the app base URL is unavailable', () => {
    expect(
      resolveAuthAppBaseUrl('https://attacker.example/auth/google', {
        NODE_ENV: 'production',
      }),
    ).toBeNull();

    expect(
      resolveAuthAppBaseUrl('https://attacker.example/auth/google', {
        [APP_URL_ENV]: 'not-a-url',
        NODE_ENV: 'production',
      }),
    ).toBeNull();
  });

  it('allows request-origin fallback outside production only', () => {
    expect(
      resolveAuthAppBaseUrl('https://local.example/auth/google', {
        NODE_ENV: 'test',
      }),
    ).toBe('https://local.example');
  });
});
