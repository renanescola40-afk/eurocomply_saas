import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const writer = readFileSync('src/server/queries/audit-events.ts', 'utf8');
const liveProof = readFileSync('scripts/security/run-audit-chain-live-validation.mjs', 'utf8');
const rpcMigration = readFileSync('supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql', 'utf8');

describe('audit-chain burst concurrency hardening', () => {
  it('keeps database serialization and bounded application conflict retries together', () => {
    expect(rpcMigration).toContain('pg_advisory_xact_lock(hashtext(p_organization_id::text))');
    expect(rpcMigration).toContain("raise exception 'audit chain previous hash mismatch' using errcode = '40001'");
    expect(writer).toContain('MAX_CHAIN_APPEND_ATTEMPTS = 128');
    expect(writer).toContain('CHAIN_APPEND_RETRY_BASE_MS = 10');
    expect(writer).toContain('CHAIN_APPEND_RETRY_CAP_MS = 1000');
    expect(writer).toContain('waitForAuditChainRetry(attempt)');
    expect(writer).toContain('isPreviousHashMismatch(error) && attempt < MAX_CHAIN_APPEND_ATTEMPTS');
    expect(writer).toContain('Math.random()');
  });

  it('fails closed when the current chain head cannot be read', () => {
    expect(writer).toContain('return { hash: null, error }');
    expect(writer).toContain('if (previousHashRead.error)');
    expect(writer).not.toContain('if (error) return null;');
  });

  it('does not weaken the transactional or fallback boundary while retrying contention', () => {
    expect(writer).toContain("const CHAIN_APPEND_RPC = 'append_audit_event_chained'");
    expect(writer).toContain("reason: 'transactional_append_unavailable'");
    expect(writer).toContain("AUDIT_CHAIN_ALLOW_NON_TRANSACTIONAL_FALLBACK");
    expect(writer).toContain("AUDIT_CHAIN_ALLOW_LEGACY_FALLBACK");
    expect(writer).not.toContain('AUDIT_CHAIN_ALLOW_NON_TRANSACTIONAL_FALLBACK = true');
    expect(writer).not.toContain('AUDIT_CHAIN_ALLOW_LEGACY_FALLBACK = true');
  });

  it('requires zero-loss live bursts at 10, 25, 50 and 100 parallel writes', () => {
    expect(liveProof).toContain('CONCURRENCY_LEVELS = Object.freeze([10, 25, 50, 100])');
    expect(liveProof).toContain('LIVE_APPEND_MAX_ATTEMPTS = 128');
    expect(liveProof).toContain('LIVE_RETRY_BASE_MS = 25');
    expect(liveProof).toContain('LIVE_RETRY_CAP_MS = 2000');
    expect(liveProof).toContain('LIVE_BATCH_SETTLE_MS = 250');
    expect(liveProof).toContain('appendWithRetry');
    expect(liveProof).toContain('Math.random()');
    expect(liveProof).toContain('lost: level - successful.length');
    expect(liveProof).toContain('previousHashMismatches');
    expect(liveProof).toContain('maxWorkerLatencyMs');
    expect(liveProof).toContain('latencyMs');
    expect(liveProof).toContain('batch.lost === 0 && batch.persisted === batch.requested');
    expect(liveProof).toContain('PASS requires zero lost events at 10, 25, 50 and 100 parallel writes.');
  });

  it('re-reads, verifies and cleans the complete synthetic chain after the burst', () => {
    expect(liveProof).toContain('expectedSyntheticEvents');
    expect(liveProof).toContain('records.length === expectedSyntheticEvents');
    expect(liveProof).toContain('verifyAuditChain(records, anchorPreviousHash)');
    expect(liveProof).toContain('tamperDetected');
    expect(liveProof).toContain('missingPreviousDetected');
    expect(liveProof).toContain('CLEANUP_CHUNK_SIZE = 50');
    expect(liveProof).toContain('cleanupSyntheticAuditEvents');
  });
});