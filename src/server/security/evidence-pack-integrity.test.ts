import { afterEach, describe, expect, it } from 'vitest';

import { buildEvidencePackIntegrity, verifyEvidencePackIntegrity } from './evidence-pack-integrity';

const originalEvidenceKey = process.env.EVIDENCE_PACK_SIGNING_SECRET;
const originalHealthKey = process.env.HEALTHCHECK_TOKEN;

afterEach(() => {
  process.env.EVIDENCE_PACK_SIGNING_SECRET = originalEvidenceKey;
  process.env.HEALTHCHECK_TOKEN = originalHealthKey;
});

describe('evidence pack integrity', () => {
  it('creates a stable digest for equivalent object key order', () => {
    delete process.env.EVIDENCE_PACK_SIGNING_SECRET;
    delete process.env.HEALTHCHECK_TOKEN;

    const first = buildEvidencePackIntegrity({ b: 2, a: 1 });
    const second = buildEvidencePackIntegrity({ a: 1, b: 2 });

    expect(first.payloadHash).toBe(second.payloadHash);
    expect(first.signed).toBe(false);
  });

  it('validates unchanged payloads', () => {
    const payload = { schemaVersion: '2026-06-10', summary: { score: 91 } };
    const integrity = buildEvidencePackIntegrity(payload);
    const result = verifyEvidencePackIntegrity({ payload, integrity });

    expect(result.validHash).toBe(true);
  });

  it('detects changed payload content', () => {
    const integrity = buildEvidencePackIntegrity({ summary: { score: 91 } });
    const result = verifyEvidencePackIntegrity({ payload: { summary: { score: 10 } }, integrity });

    expect(result.validHash).toBe(false);
  });
});
