import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getConfiguredMaintenanceBaseUrl,
  isSuccessfulMaintenanceJobResponse,
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
  it('parses object-shaped JSON responses within the byte limit', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
    const result = await readBoundedMaintenanceJobResponse(response);

    expect(result).toEqual({ body: { ok: true }, failure: null });
    expect(isSuccessfulMaintenanceJobResponse(response, result)).toBe(true);
  });

  it('rejects an oversized declared content length before parsing and cancels the body', async () => {
    let cancelledReason: unknown;
    const body = new ReadableStream<Uint8Array>({
      cancel(reason) {
        cancelledReason = reason;
      },
    });
    const response = new Response(body, {
      status: 200,
      headers: { 'content-length': String(64 * 1024 + 1) },
    });

    const result = await readBoundedMaintenanceJobResponse(response);

    expect(cancelledReason).toBe('job_response_too_large');
    expect(result).toEqual({ body: { error: 'job_response_too_large' }, failure: 'job_response_too_large' });
    expect(isSuccessfulMaintenanceJobResponse(response, result)).toBe(false);
  });

  it.each(['invalid', '-1', '1.5', '9007199254740992'])('rejects invalid declared content length %s', async (value) => {
    const response = new Response('{}', {
      status: 200,
      headers: { 'content-length': value },
    });

    const result = await readBoundedMaintenanceJobResponse(response);

    expect(result).toEqual({
      body: { error: 'job_response_invalid_content_length' },
      failure: 'job_response_invalid_content_length',
    });
    expect(isSuccessfulMaintenanceJobResponse(response, result)).toBe(false);
  });

  it('rejects an oversized chunked response while streaming and cancels the reader', async () => {
    const chunk = new Uint8Array(40 * 1024);
    let cancelledReason: unknown;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(chunk);
          controller.enqueue(chunk);
        },
        cancel(reason) {
          cancelledReason = reason;
        },
      }),
      { status: 200 },
    );

    const result = await readBoundedMaintenanceJobResponse(response);

    expect(cancelledReason).toBe('job_response_too_large');
    expect(result).toEqual({ body: { error: 'job_response_too_large' }, failure: 'job_response_too_large' });
    expect(isSuccessfulMaintenanceJobResponse(response, result)).toBe(false);
  });

  it('rejects a successful HTTP response with invalid JSON', async () => {
    const response = new Response('<html>proxy error</html>', { status: 200 });
    const result = await readBoundedMaintenanceJobResponse(response);

    expect(result).toEqual({ body: { error: 'job_response_invalid_json' }, failure: 'job_response_invalid_json' });
    expect(isSuccessfulMaintenanceJobResponse(response, result)).toBe(false);
  });

  it.each([
    ['array', []],
    ['null', null],
    ['string', 'ok'],
    ['number', 1],
  ])('rejects a successful HTTP response with %s JSON shape', async (_label, payload) => {
    const response = new Response(JSON.stringify(payload), { status: 200 });
    const result = await readBoundedMaintenanceJobResponse(response);

    expect(result).toEqual({
      body: { error: 'job_response_invalid_json_shape' },
      failure: 'job_response_invalid_json_shape',
    });
    expect(isSuccessfulMaintenanceJobResponse(response, result)).toBe(false);
  });

  it('rejects invalid UTF-8', async () => {
    const response = new Response(new Uint8Array([0xc3, 0x28]), { status: 200 });
    const result = await readBoundedMaintenanceJobResponse(response);

    expect(result).toEqual({ body: { error: 'job_response_invalid_utf8' }, failure: 'job_response_invalid_utf8' });
    expect(isSuccessfulMaintenanceJobResponse(response, result)).toBe(false);
  });

  it('keeps HTTP failures failed even when their bounded JSON body is valid', async () => {
    const response = new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
    const result = await readBoundedMaintenanceJobResponse(response);

    expect(result).toEqual({ body: { error: 'internal_error' }, failure: null });
    expect(isSuccessfulMaintenanceJobResponse(response, result)).toBe(false);
  });
});
