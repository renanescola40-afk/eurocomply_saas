import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const writer = readFileSync('src/server/queries/audit-events.ts', 'utf8');
const legacyLiveProof = readFileSync('scripts/security/run-audit-chain-live-validation.mjs', 'utf8');
const boundedLiveProof = readFileSync('scripts/security/run-audit-chain-live-validation-v2.mjs', 'utf8');
const rpcMigration = readFileSync('supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql', 'utf8');
const failFastRpcMigration = readFileSync('supabase/migrations/20260905075429_fail_fast_audit_chain_advisory_contention.sql', 'utf8');

describe('audit-chain burst concurrency hardening', () => {
  it('keeps database serialization and bounded application hash-mismatch retries together', () => {
    expect(rpcMigration).toContain('pg_advisory_xact_lock(hashtext(p_organization_id::text))');
    expect(rpcMigration).toContain("raise exception 'audit chain previous hash mismatch' using errcode = '40001'");
    expect(failFastRpcMigration).toContain('pg_try_advisory_xact_lock(hashtext(p_organization_id::text))');
    expect(failFastRpcMigration).toContain("raise exception 'audit chain append contention' using errcode = '40001'");
    expect(failFastRpcMigration).toContain("raise exception 'audit chain previous hash mismatch' using errcode = '40001'");
    expect(writer).toContain('MAX_CHAIN_APPEND_ATTEMPTS = 128');
    expect(writer).toContain('CHAIN_APPEND_RETRY_BASE_MS = 10');
    expect(writer).toContain('CHAIN_APPEND_RETRY_CAP_MS = 1000');
    expect(writer).toContain('waitForAuditChainRetry(attempt)');
    expect(writer).toContain("error.code === '40001' && /audit chain previous hash mismatch/i");
    expect(writer).toContain("error.code === '40001' && /audit chain append contention/i");
    expect(writer).toContain('isPreviousHashMismatch(error) && attempt < MAX_CHAIN_APPEND_ATTEMPTS');
    expect(writer).not.toContain("return error.code === '40001' ||");
    expect(writer).toContain('Math.random()');
  });

  it('fails fast on advisory-lock contention instead of amplifying it into the mismatch retry loop', () => {
    const contentionBranch = writer.indexOf('if (isAuditChainAppendContention(error)) {');
    const mismatchRetryBranch = writer.indexOf('if (isPreviousHashMismatch(error) && attempt < MAX_CHAIN_APPEND_ATTEMPTS)');

    expect(contentionBranch).toBeGreaterThan(-1);
    expect(mismatchRetryBranch).toBeGreaterThan(-1);
    expect(contentionBranch).toBeLessThan(mismatchRetryBranch);
    expect(writer.slice(contentionBranch, mismatchRetryBranch)).toContain('break;');
    expect(writer.slice(contentionBranch, mismatchRetryBranch)).not.toContain('waitForAuditChainRetry');
  });

  it('fails closed when the current chain head cannot be read', () => {
    expect(writer).toContain('return { hash: null, error }');
    expect(writer).toContain('if (previousHashRead.error)');
    expect(writer).not.toContain('if (error) return null;');
  });

  it('does not weaken the transactional or fallback boundary while retrying a genuine hash mismatch', () => {
    expect(writer).toContain("const CHAIN_APPEND_RPC = 'append_audit_event_chained'");
    expect(writer).toContain("reason: 'transactional_append_unavailable'");
    expect(writer).toContain('AUDIT_CHAIN_ALLOW_NON_TRANSACTIONAL_FALLBACK');
    expect(writer).toContain('AUDIT_CHAIN_ALLOW_LEGACY_FALLBACK');
    expect(writer).not.toContain('AUDIT_CHAIN_ALLOW_NON_TRANSACTIONAL_FALLBACK = true');
    expect(writer).not.toContain('AUDIT_CHAIN_ALLOW_LEGACY_FALLBACK = true');
  });

  it('retires the legacy 128-attempt live proof and delegates to the bounded canonical proof', () => {
    expect(legacyLiveProof).toContain("import './run-audit-chain-live-validation-v2.mjs';");
    expect(legacyLiveProof).not.toContain('LIVE_APPEND_MAX_ATTEMPTS');
    expect(legacyLiveProof).not.toContain('appendWithRetry');
    expect(legacyLiveProof).not.toContain("error?.code === '40001' ||");
  });

  it('accepts only recognized SQLSTATE 40001 audit-chain conflicts in the protected proof', () => {
    expect(boundedLiveProof).toContain("const message = error?.message ?? ''");
    expect(boundedLiveProof).toContain("return error?.code === '40001'");
    expect(boundedLiveProof).toContain('/audit chain append contention/i.test(message)');
    expect(boundedLiveProof).toContain('/audit chain previous hash mismatch/i.test(message)');
    expect(boundedLiveProof).not.toContain("return error?.code === '40001'\n    ||");
    expect(boundedLiveProof).toContain('Promise.allSettled');
    expect(boundedLiveProof).toContain("strategy: 'single-stale-head-winner-plus-fresh-retry'");
    expect(boundedLiveProof).toContain('const expectedConflictsObserved = conflicts === level - 1');
  });

  it('keeps bounded cleanup and full synthetic-chain verification in the canonical proof', () => {
    expect(boundedLiveProof).toContain('const attemptedAuditEventIds = []');
    expect(boundedLiveProof).toContain('cleanupSyntheticAuditEvents(supabase, attemptedAuditEventIds)');
    expect(boundedLiveProof).toContain('verifyAuditChain(records, anchorPreviousHash)');
    expect(boundedLiveProof).toContain('tamperDetected');
    expect(boundedLiveProof).toContain('missingPreviousDetected');
    expect(boundedLiveProof).toContain('CLEANUP_CHUNK_SIZE = 50');
  });
});
