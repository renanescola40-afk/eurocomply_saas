import { describe, expect, it, vi } from 'vitest';
import { verifyTrustedOrigin } from './origin-guard';

describe('verifyTrustedOrigin', () => {
  it('allows safe methods without origin', () => {
    const request = new Request('https://app.example.com/api/test', { method: 'GET' });
    expect(verifyTrustedOrigin(request, new Set(['https://app.example.com']))).toEqual({ ok: true, reason: 'safe_method' });
  });

  it('allows trusted origins for mutating methods', () => {
    const request = new Request('https://app.example.com/api/test', {
      method: 'POST',
      headers: { origin: 'https://app.example.com' },
    });

    expect(verifyTrustedOrigin(request, new Set(['https://app.example.com']))).toEqual({ ok: true, reason: 'trusted_origin' });
  });

  it('allows the request canonical origin even when deployment env origins are stale', () => {
    const request = new Request('https://risckcomply.com/api/prelaunch', {
      method: 'POST',
      headers: { origin: 'https://risckcomply.com' },
    });

    expect(verifyTrustedOrigin(request, new Set(['https://old-deployment.example']))).toEqual({
      ok: true,
      reason: 'trusted_origin',
    });
  });

  it('rejects untrusted origins for mutating methods', () => {
    const request = new Request('https://app.example.com/api/test', {
      method: 'DELETE',
      headers: { origin: 'https://evil.example' },
    });

    expect(verifyTrustedOrigin(request, new Set(['https://app.example.com']))).toEqual({
      ok: false,
      reason: 'untrusted_origin',
      origin: 'https://evil.example',
    });
  });

  it('uses referer origin when origin is missing', () => {
    const request = new Request('https://app.example.com/api/test', {
      method: 'PATCH',
      headers: { referer: 'https://app.example.com/dashboard' },
    });

    expect(verifyTrustedOrigin(request, new Set(['https://app.example.com']))).toEqual({ ok: true, reason: 'trusted_origin' });
  });

  it('rejects missing origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const request = new Request('https://app.example.com/api/test', { method: 'POST' });

    expect(verifyTrustedOrigin(request, new Set(['https://app.example.com']))).toEqual({
      ok: false,
      reason: 'missing_origin',
      origin: null,
    });

    vi.unstubAllEnvs();
  });
});
