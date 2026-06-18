import { describe, expect, it } from 'vitest';
import {
  getEvidencePackContentLength,
  isJsonContentType,
  readBoundedEvidencePackExport,
} from './route';

function makeJsonRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request('https://app.eurocomply.example/api/audit/evidence-pack/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function validEvidencePack() {
  return {
    payload: { report: 'ok' },
    integrity: {
      schemaVersion: '2026-06-10',
      algorithm: 'sha256',
      payloadHash: 'abc123',
      signed: false,
      generatedAt: '2026-06-18T00:00:00.000Z',
    },
  };
}

describe('public evidence pack verifier request hardening', () => {
  it('accepts JSON content types only', () => {
    expect(isJsonContentType(makeJsonRequest(validEvidencePack()))).toBe(true);
    expect(isJsonContentType(makeJsonRequest(validEvidencePack(), { 'content-type': 'application/vnd.eurocomply+json' }))).toBe(true);
    expect(isJsonContentType(new Request('https://app.example.test', { method: 'POST', body: '{}' }))).toBe(false);
    expect(isJsonContentType(new Request('https://app.example.test', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }))).toBe(false);
  });

  it('parses finite non-negative content length values only', () => {
    expect(getEvidencePackContentLength(makeJsonRequest(validEvidencePack(), { 'content-length': '123' }))).toBe(123);
    expect(getEvidencePackContentLength(makeJsonRequest(validEvidencePack(), { 'content-length': '-1' }))).toBeNull();
    expect(getEvidencePackContentLength(makeJsonRequest(validEvidencePack(), { 'content-length': 'NaN' }))).toBeNull();
  });

  it('reads valid bounded evidence pack exports', async () => {
    await expect(readBoundedEvidencePackExport(makeJsonRequest(validEvidencePack()))).resolves.toEqual(validEvidencePack());
  });

  it('rejects oversized bodies before parsing', async () => {
    await expect(
      readBoundedEvidencePackExport(makeJsonRequest(validEvidencePack(), { 'content-length': '1000001' })),
    ).resolves.toBeNull();
  });

  it('rejects malformed or incomplete exports', async () => {
    await expect(readBoundedEvidencePackExport(makeJsonRequest('{not-json'))).rejects.toThrow();
    await expect(readBoundedEvidencePackExport(makeJsonRequest({ payload: {} }))).resolves.toBeNull();
    await expect(readBoundedEvidencePackExport(makeJsonRequest({ integrity: validEvidencePack().integrity }))).resolves.toBeNull();
  });
});
