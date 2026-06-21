import { describe, expect, it, vi } from 'vitest';

import {
  buildAuditChainRecord,
  buildAuditEventHash,
  canonicalizeAuditEvent,
  verifyAuditChain,
  type AuditChainInput,
} from './audit-chain';

const baseEvent: AuditChainInput = {
  id: 'evt_001',
  organizationId: 'org_001',
  actorUserId: 'user_001',
  action: 'document_uploaded',
  entityType: 'document',
  entityId: 'doc_001',
  metadata: { sizeBytes: 10, nested: { b: 2, a: 1 } },
  createdAt: '2026-06-12T10:00:00.000Z',
};

describe('audit chain', () => {
  it('canonicalizes metadata deterministically', () => {
    const left = canonicalizeAuditEvent(baseEvent, null);
    const right = canonicalizeAuditEvent(
      {
        ...baseEvent,
        metadata: { nested: { a: 1, b: 2 }, sizeBytes: 10 },
      },
      null,
    );

    expect(left).toBe(right);
  });

  it('builds deterministic hashes for the same event and previous hash', () => {
    expect(buildAuditEventHash(baseEvent, null)).toBe(buildAuditEventHash(baseEvent, null));
  });

  it('changes the hash when metadata changes', () => {
    const original = buildAuditEventHash(baseEvent, null);
    const changed = buildAuditEventHash({ ...baseEvent, metadata: { sizeBytes: 11 } }, null);

    expect(changed).not.toBe(original);
  });

  it('verifies a valid hash chain', () => {
    const first = buildAuditChainRecord(baseEvent, null);
    const second = buildAuditChainRecord(
      {
        ...baseEvent,
        id: 'evt_002',
        action: 'evidence_pack_exported',
        entityType: 'organization',
        entityId: 'org_001',
        createdAt: '2026-06-12T11:00:00.000Z',
      },
      first.eventHash,
    );

    expect(verifyAuditChain([first, second])).toMatchObject({ ok: true, checked: 2, lastHash: second.eventHash });
  });

  it('verifies a bounded hash-chain segment with a trusted anchor', () => {
    const first = buildAuditChainRecord(baseEvent, null);
    const second = buildAuditChainRecord({ ...baseEvent, id: 'evt_002', createdAt: '2026-06-12T11:00:00.000Z' }, first.eventHash);
    const third = buildAuditChainRecord({ ...baseEvent, id: 'evt_003', createdAt: '2026-06-12T12:00:00.000Z' }, second.eventHash);

    expect(verifyAuditChain([second, third], { expectedPreviousHash: first.eventHash })).toMatchObject({
      ok: true,
      checked: 2,
      expectedPreviousHash: first.eventHash,
      lastHash: third.eventHash,
    });
  });

  it('detects a bounded segment anchor mismatch', () => {
    const first = buildAuditChainRecord(baseEvent, null);
    const second = buildAuditChainRecord({ ...baseEvent, id: 'evt_002' }, first.eventHash);

    expect(verifyAuditChain([second], { expectedPreviousHash: 'wrong-anchor' }).failures).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: 'previous_hash_mismatch' })]),
    );
  });

  it('detects previous hash tampering', () => {
    const first = buildAuditChainRecord(baseEvent, null);
    const second = buildAuditChainRecord({ ...baseEvent, id: 'evt_002' }, first.eventHash);

    expect(verifyAuditChain([first, { ...second, previousHash: 'tampered' }]).failures).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: 'previous_hash_mismatch' })]),
    );
  });

  it('detects event content tampering', () => {
    const first = buildAuditChainRecord(baseEvent, null);
    const tampered = { ...first, action: 'tampered_action' };

    expect(verifyAuditChain([tampered]).failures).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: 'event_hash_mismatch' })]),
    );
  });

  it('signs hashes when an audit chain secret is configured', () => {
    vi.stubEnv('AUDIT_CHAIN_SIGNING_SECRET', 'test-secret');
    const record = buildAuditChainRecord(baseEvent, null);

    expect(record.signature).toBeTruthy();
    expect(verifyAuditChain([record]).ok).toBe(true);

    vi.unstubAllEnvs();
  });
});
