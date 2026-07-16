import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const rateLimiterPath = join(process.cwd(), 'src/lib/security/rate-limiter.ts');
const source = readFileSync(rateLimiterPath, 'utf8');

describe('Upstash rate-limit provider boundary contract', () => {
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

  it('cancels oversized streamed responses and fails through the existing closed path', () => {
    expect(source).toContain("await reader.cancel('upstash_response_too_large')");
    expect(source).toContain("return failClosed(windowMs, 'redis_unavailable')");
  });
});
