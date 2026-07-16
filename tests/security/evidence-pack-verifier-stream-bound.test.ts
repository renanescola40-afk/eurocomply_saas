import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/app/api/audit/evidence-pack/verify/route.ts', 'utf8');

describe('public evidence-pack verifier body boundary', () => {
  it('streams and rejects oversized bodies before full buffering', () => {
    expect(source).toContain('request.body?.getReader()');
    expect(source).toContain('totalBytes += value.byteLength');
    expect(source).toContain('if (totalBytes > maxBytes)');
    expect(source).toContain("reader.cancel('evidence_pack_body_too_large')");
    expect(source).toContain('readBoundedUtf8Body(request, MAX_EVIDENCE_PACK_BYTES)');
    expect(source).not.toContain('await request.text()');
  });

  it('keeps the declared content-length fast rejection', () => {
    expect(source).toContain('contentLength > MAX_EVIDENCE_PACK_BYTES');
  });
});
