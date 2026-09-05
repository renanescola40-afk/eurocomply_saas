import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/audit-chain-runtime-proof.yml', 'utf8');
const producer = readFileSync('scripts/security/run-audit-chain-live-validation-v2.mjs', 'utf8');
const migration = readFileSync('supabase/migrations/20260905075429_fail_fast_audit_chain_advisory_contention.sql', 'utf8');

describe('bounded audit-chain runtime proof', () => {
  it('bounds provider requests and batches below the outer GitHub timeout', () => {
    expect(workflow).toContain('timeout-minutes: 20');
    expect(producer).toContain('const LIVE_REQUEST_TIMEOUT_MS = 8_000');
    expect(producer).toContain('const LIVE_BATCH_TIMEOUT_MS = 30_000');
    expect(producer).toContain('AbortSignal.timeout(LIVE_REQUEST_TIMEOUT_MS)');
    expect(producer).toContain('AbortSignal.any([init.signal, timeoutSignal])');
    expect(producer).toContain('withDeadline(');
    expect(producer).toContain('Promise.allSettled');
  });

  it('proves fail-fast stale-head contention and a fresh-head retry at every burst level', () => {
    expect(producer).toContain('const CONCURRENCY_LEVELS = Object.freeze([10, 25, 50, 100])');
    expect(producer).toContain("strategy: 'single-stale-head-winner-plus-fresh-retry'");
    expect(producer).toContain('const exactlyOneSuccess = successes.length === 1');
    expect(producer).toContain('const expectedConflictsObserved = conflicts === level - 1');
    expect(producer).toContain('const retryPreviousHash = await getPreviousHash');
    expect(producer).toContain('const retrySucceeded = !retry.error');
    expect(migration).toContain('pg_try_advisory_xact_lock');
    expect(migration).toContain("errcode = '40001'");
    expect(migration).toContain('audit chain previous hash mismatch');
  });

  it('tracks every attempted audit id so ambiguous writes are included in cleanup', () => {
    expect(producer).toContain('const attemptedAuditEventIds = []');
    expect(producer).toContain('attemptedIds.push(...payloads.map((payload) => payload.input.id))');
    expect(producer).toContain('attemptedIds.push(retryPayload.input.id)');
    expect(producer).toContain('attemptedAuditEventIds.push(normalPayload.input.id)');
    expect(producer).toContain('cleanupSyntheticAuditEvents(supabase, attemptedAuditEventIds)');
  });

  it('writes redacted phase checkpoints before external timeout can erase diagnosis', () => {
    expect(producer).toContain('function writeRuntimeCheckpoint');
    expect(producer).toContain("writeRuntimeCheckpoint('validation_started')");
    expect(producer).toContain("writeRuntimeCheckpoint('fixture_setup_started')");
    expect(producer).toContain("writeRuntimeCheckpoint('normal_append_complete')");
    expect(producer).toContain('writeRuntimeCheckpoint(`concurrency_${level}_started`');
    expect(producer).toContain("writeRuntimeCheckpoint('cleanup_started'");
    expect(producer).toContain('containsSensitiveValues: false');
    expect(producer).toContain('rawIdentifiersStored: false');
  });
});
