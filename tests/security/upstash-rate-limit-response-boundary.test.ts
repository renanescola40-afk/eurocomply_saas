import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rateLimit } from '@/lib/security/rate-limiter';

const rateLimiterPath = join(process.cwd(), 'src/lib/security/rate-limiter.ts');
const source = readFileSync(rateLimiterPath, 'utf8');

const originalEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};

function restoreEnvironment() {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function mockJsonResponse(payload: unknown) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('Upstash rate-limit provider boundary contract', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL_ENV = 'production';
    process.env.UPSTASH_REDIS_REST_URL = 'https://rate-limit-test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-upstash-token';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreEnvironment();
  });

  it('keeps the existing application-level request timeout', () => {
    expect(source).toContain('signal: AbortSignal.timeout(3000)');
  });

  it('bounds successful Upstash responses before JSON parsing', () => {
    const boundedReadIndex = source.indexOf('await readBoundedUpstashResponse(response)');
    const jsonParseIndex = source.indexOf('JSON.parse(decoded)');

    expect(source).toContain('const UPSTASH_RESPONSE_MAX_BYTES = 64 * 1024;');
    expect(source).toContain("response.headers.get('content-length')");
    expect(source).toContain('totalBytes > UPSTASH_RESPONSE_MAX_BYTES');
    expect(source).toContain('upstash_response_too_large');
    expect(source).not.toContain('await response.json()');
    expect(boundedReadIndex).toBeGreaterThan(-1);
    expect(jsonParseIndex).toBeGreaterThan(-1);
  });

  it('parses the official Upstash pipeline object shape and enforces the real counter', async () => {
    mockJsonResponse([{ result: 2 }, { result: 0 }, { result: 45 }]);

    const startedAt = Date.now();
    const result = await rateLimit({ key: 'official-shape', limit: 5, windowMs: 60_000 });

    expect(result).toMatchObject({ success: true, remaining: 3 });
    expect(result.reason).toBeUndefined();
    expect(result.reset).toBeGreaterThanOrEqual(startedAt + 44_000);
    expect(result.reset).toBeLessThanOrEqual(Date.now() + 46_000);
  });

  it('blocks when the official Upstash counter exceeds the configured limit', async () => {
    mockJsonResponse([{ result: 6 }, { result: 0 }, { result: 30 }]);

    const result = await rateLimit({ key: 'limit-exceeded', limit: 5, windowMs: 60_000 });

    expect(result).toMatchObject({ success: false, remaining: 0 });
    expect(result.reason).toBeUndefined();
  });

  it.each([
    ['missing pipeline items', []],
    ['unexpected pipeline length', [{ result: 2 }, { result: 0 }, { result: 45 }, { result: 'extra' }]],
    ['command error', [{ result: 2 }, { error: 'ERR expire failed' }, { result: 45 }]],
    ['string counter', [{ result: '2' }, { result: 0 }, { result: 45 }]],
    ['invalid expire result', [{ result: 2 }, { result: 2 }, { result: 45 }]],
    ['negative TTL', [{ result: 2 }, { result: 0 }, { result: -1 }]],
  ])('fails closed in production for %s', async (_label, payload) => {
    mockJsonResponse(payload);

    const result = await rateLimit({ key: 'invalid-provider-payload', limit: 5, windowMs: 60_000 });

    expect(result).toMatchObject({ success: false, remaining: 0, reason: 'redis_unavailable' });
  });

  it('cancels an oversized declared response before reading it and fails closed', async () => {
    let cancelledReason: unknown;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('[]'));
        controller.close();
      },
      cancel(reason) {
        cancelledReason = reason;
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(body, {
        status: 200,
        headers: { 'content-length': String(64 * 1024 + 1) },
      }),
    );

    const result = await rateLimit({ key: 'oversized-provider-response', limit: 5, windowMs: 60_000 });

    expect(cancelledReason).toBe('upstash_response_too_large');
    expect(result).toMatchObject({ success: false, remaining: 0, reason: 'redis_unavailable' });
  });

  it('retains the existing production fail-closed path for provider parsing failures', () => {
    expect(source).toContain("return failClosed(windowMs, 'redis_unavailable')");
    expect(source).toContain('return parseUpstashPipelineResponse(JSON.parse(decoded) as unknown)');
    expect(source).not.toContain('results[0]?.[1]');
  });
});
