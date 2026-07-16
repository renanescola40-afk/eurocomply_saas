import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getConfiguredMaintenanceBaseUrl,
  readBoundedMaintenanceJobResponse,
  resolveMaintenanceBaseUrl,
} from './route';

function makeRequest(url = 'https://attacker.example/api/internal/daily-maintenance') {
  return new Request(url, {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-cron-secret',
    },
  });
}

describe('daily maintenance base URL hardening', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the configured app URL and ignores the caller host', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.eurocomply.example/some/path/');

    expect(getConfiguredMaintenanceBaseUrl()).toBe('https://app.eurocomply.example');
    expect(resolveMaintenanceBaseUrl(makeRequest())).toBe('https://app.eurocomply.example');
  });

  it('rejects non-http app URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'file:///etc/passwd');

    expect(getConfiguredMaintenanceBaseUrl()).toBeNull();
  });

  it('fails closed in production when the app URL is missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    expect(resolveMaintenanceBaseUrl(makeRequest())).toBeNull();
  });

  it('allows request-origin fallback only outside production', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    expect(resolveMaintenanceBaseUrl(makeRequest('http://localhost:3000/api/internal/daily-maintenance'))).toBe('http://localhost:3000');
  });
});

describe('daily maintenance response boundaries', () => {
  it('parses JSON responses within the byte limit', async () => {
    const result = await readBoundedMaintenanceJobResponse(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(result).toEqual({ body: { ok: true }, tooLarge: false });
  });

  it('rejects an oversized declared content length before parsing', async () => {
    const result = await readBoundedMaintenanceJobResponse(
      new Response('{}', {
        headers: { 'content-length': String(64 * 1024 + 1) },
      }),
    );

    expect(result).toEqual({ body: { error: 'job_response_too_large' }, tooLarge: true });
  });

  it('rejects an oversized chunked response while streaming', async () => {
    const chunk = new Uint8Array(40 * 1024);
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(chunk);
          controller.enqueue(chunk);
          controller.close();
        },
      }),
    );

    const result = await readBoundedMaintenanceJobResponse(response);

    expect(result).toEqual({ body: { error: 'job_response_too_large' }, tooLarge: true });
  });
});
