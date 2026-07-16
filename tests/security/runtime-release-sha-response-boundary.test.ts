import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('runtime release SHA verifier response boundary', () => {
  it('bounds the protected readiness response before JSON parsing', () => {
    const verifier = read('scripts/release/verify-runtime-release-sha.mjs');

    expect(verifier).toContain('const MAX_RUNTIME_RESPONSE_BYTES = 64 * 1024');
    expect(verifier).toContain("response.headers.get('content-length')");
    expect(verifier).toContain('response.body.getReader()');
    expect(verifier).toContain('totalBytes > MAX_RUNTIME_RESPONSE_BYTES');
    expect(verifier).toContain("reader.cancel('runtime_release_response_too_large')");
    expect(verifier).toContain("new TextDecoder('utf-8', { fatal: true })");
    expect(verifier).toContain('JSON.parse(text)');
    expect(verifier).toContain('responseBody = await readBoundedJsonResponse(response)');
    expect(verifier).not.toContain('await response.json()');
    expect(verifier).toContain("redirect: 'error'");
    expect(verifier).toContain('AbortSignal.timeout(timeoutMs)');
  });

  it('does not persist the raw remote body or remote error text as release evidence', () => {
    const verifier = read('scripts/release/verify-runtime-release-sha.mjs');

    expect(verifier).toContain('rawNetworkPayloadStored: false');
    expect(verifier).toContain('remote error text');
    expect(verifier).not.toContain('rawResponseBody:');
    expect(verifier).not.toContain('responseText:');
  });
});
