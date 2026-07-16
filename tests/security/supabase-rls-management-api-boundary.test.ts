import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('scripts/security/check-rls.mjs', 'utf8');

describe('Supabase RLS Management API boundary', () => {
  it('applies an application deadline and rejects redirects', () => {
    expect(source).toContain('AbortSignal.timeout(MANAGEMENT_API_TIMEOUT_MS)');
    expect(source).toContain("redirect: 'error'");
  });

  it('bounds both successful and error response bodies before parsing', () => {
    expect(source).toContain('MAX_MANAGEMENT_API_RESPONSE_BYTES');
    expect(source).toContain("response.headers.get('content-length')");
    expect(source).toContain('response.body.getReader()');
    expect(source).toContain("reader.cancel('management_api_response_too_large')");
    expect(source).toContain("new TextDecoder('utf-8', { fatal: true })");
    expect(source).toContain('const text = await readBoundedText(response)');
  });

  it('does not regress to unbounded convenience readers', () => {
    expect(source).not.toContain('response.json()');
    expect(source).not.toContain('response.text()');
  });
});
