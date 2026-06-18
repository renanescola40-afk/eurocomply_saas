import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUDIT_CHAIN_VERIFY_LIMIT,
  MAX_AUDIT_CHAIN_VERIFY_LIMIT,
  parseAuditChainVerifyLimit,
} from './route';

describe('audit chain verification request contract', () => {
  const baseUrl = 'https://app.example.test/api/audit/chain/verify';

  it('uses the default limit when none is provided', () => {
    expect(parseAuditChainVerifyLimit(baseUrl)).toEqual({
      ok: true,
      limit: DEFAULT_AUDIT_CHAIN_VERIFY_LIMIT,
    });
  });

  it('accepts integer limits inside the allowed range', () => {
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=1`)).toEqual({ ok: true, limit: 1 });
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=${MAX_AUDIT_CHAIN_VERIFY_LIMIT}`)).toEqual({
      ok: true,
      limit: MAX_AUDIT_CHAIN_VERIFY_LIMIT,
    });
  });

  it('rejects non-integer and ambiguous limits instead of clamping silently', () => {
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=abc`)).toEqual({ ok: false, error: 'invalid_limit' });
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=1.5`)).toEqual({ ok: false, error: 'invalid_limit' });
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=-1`)).toEqual({ ok: false, error: 'invalid_limit' });
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=`)).toEqual({ ok: false, error: 'invalid_limit' });
  });

  it('rejects out-of-range limits', () => {
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=0`)).toEqual({ ok: false, error: 'invalid_limit' });
    expect(parseAuditChainVerifyLimit(`${baseUrl}?limit=${MAX_AUDIT_CHAIN_VERIFY_LIMIT + 1}`)).toEqual({
      ok: false,
      error: 'invalid_limit',
    });
  });
});
