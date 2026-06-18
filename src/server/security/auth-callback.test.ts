import { describe, expect, it } from 'vitest';
import { normalizePublicAuthErrorCode } from '@/lib/auth/public-errors';
import {
  getAuthCallbackLoginUrl,
  getSafeAuthCallbackNextPath,
  getSafeAuthCallbackNextPathForLocale,
} from './auth-callback';

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
});
