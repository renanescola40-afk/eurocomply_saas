import { describe, expect, it } from 'vitest';

import { probeExactDeploymentHealth } from '../../scripts/release/write-github-vercel-production-deployment-evidence.mjs';

describe('production deployment health edge compatibility', () => {
  it('uses the proven production-response probe identity while preserving exact health checks', async () => {
    let capturedInit: RequestInit | undefined;

    const result = await probeExactDeploymentHealth({
      publicUrl: 'https://www.risckcomply.com',
      fetchImpl: async (input, init) => {
        expect(String(input)).toBe('https://www.risckcomply.com/api/health');
        capturedInit = init;
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store, private',
          },
        });
      },
    });

    const headers = new Headers(capturedInit?.headers);
    expect(headers.get('user-agent')).toBe('risck-comply-production-response-proof/1.0');
    expect(capturedInit?.redirect).toBe('manual');
    expect(result).toMatchObject({
      passed: true,
      status: 200,
      bodyStatus: 'ok',
      noStore: true,
    });
  });

  it('still fails closed when the production edge redirects the health probe', async () => {
    const result = await probeExactDeploymentHealth({
      publicUrl: 'https://www.risckcomply.com',
      fetchImpl: async () => new Response(null, {
        status: 302,
        headers: { location: 'https://example.invalid/challenge' },
      }),
    });

    expect(result).toMatchObject({
      passed: false,
      status: 302,
      bodyStatus: null,
      noStore: false,
    });
  });
});
