import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('public health endpoint hardening', () => {
  it('returns a no-store health response without sensitive operational metadata', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(body).toMatchObject({
      service: 'eurocomply-saas',
      status: 'ok',
      checks: {
        application: 'ok',
      },
    });
    expect(body).not.toHaveProperty('environment');
    expect(body).not.toHaveProperty('commit');
    expect(JSON.stringify(body)).not.toContain('VERCEL');
  });
});
