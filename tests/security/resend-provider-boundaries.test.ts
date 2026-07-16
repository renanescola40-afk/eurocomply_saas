import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const senderPath = join(process.cwd(), 'src/lib/email/server-sender.ts');
const source = readFileSync(senderPath, 'utf8');

describe('transactional email provider boundary contract', () => {
  it('applies an application-level timeout to every Resend request', () => {
    expect(source).toContain('const RESEND_REQUEST_TIMEOUT_MS = 10_000;');
    expect(source).toContain('signal: AbortSignal.timeout(RESEND_REQUEST_TIMEOUT_MS)');
  });

  it('bounds Resend response bodies before JSON parsing', () => {
    const boundedReadIndex = source.indexOf('await readBoundedResendResponse(response)');
    const jsonParseIndex = source.indexOf('JSON.parse(text)');

    expect(source).toContain('const RESEND_RESPONSE_MAX_BYTES = 64 * 1024;');
    expect(source).toContain("response.headers.get('content-length')");
    expect(source).toContain('totalBytes > RESEND_RESPONSE_MAX_BYTES');
    expect(source).toContain('provider_response_too_large');
    expect(source).not.toContain('await response.json()');
    expect(boundedReadIndex).toBeGreaterThan(-1);
    expect(jsonParseIndex).toBeGreaterThan(-1);
  });

  it('cancels oversized streamed responses', () => {
    expect(source).toContain('await response.body?.cancel().catch(() => undefined)');
    expect(source).toContain('await reader.cancel().catch(() => undefined)');
  });
});
