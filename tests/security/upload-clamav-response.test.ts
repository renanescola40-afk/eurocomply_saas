import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseClamAvResponse, shouldBlockUploadForMalwareScan } from '@/server/security/malware-scan';

const SCANNED_AT = '2026-07-16T00:00:00.000Z';

function parse(response: string) {
  return parseClamAvResponse(response, 'clamav', true, SCANNED_AT);
}

describe('ClamAV response parsing', () => {
  it('accepts only the terminal ClamAV clean response', () => {
    const result = parse('stream: OK\0');

    expect(result).toMatchObject({ status: 'clean', provider: 'clamav', required: true });
    expect(shouldBlockUploadForMalwareScan(result)).toBe(false);
  });

  it('treats a signature response as infected', () => {
    const result = parse('stream: Eicar-Test-Signature FOUND\0');

    expect(result).toMatchObject({ status: 'infected', signature: 'Eicar-Test-Signature' });
    expect(shouldBlockUploadForMalwareScan(result)).toBe(true);
  });

  it.each([
    ['stream: OK FOUND', 'infected'],
    ['stream: OK ERROR', 'error'],
    ['scanner says OK', 'suspicious'],
    ['', 'suspicious'],
  ] as const)('fails closed for ambiguous response %j', (response, status) => {
    const result = parse(response);

    expect(result.status).toBe(status);
    expect(shouldBlockUploadForMalwareScan(result)).toBe(true);
  });

  it('keeps the runtime evidence runner on the same fail-closed precedence', () => {
    const source = readFileSync('scripts/security/run-upload-scanner-runtime-validation.mjs', 'utf8');
    const parser = source.slice(
      source.indexOf('function parseClamAvResponse'),
      source.indexOf('async function scanWithClamAv'),
    );

    expect(parser.indexOf('FOUND')).toBeLessThan(parser.indexOf('ERROR'));
    expect(parser.indexOf('ERROR')).toBeLessThan(parser.indexOf('OK\\s*$'));
    expect(parser).not.toContain("if (/\\bOK\\b/i.test(response))");
  });
});
