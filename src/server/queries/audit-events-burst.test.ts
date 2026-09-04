import { beforeEach, describe, expect, it, vi } from 'vitest';

const tryCreateAdminClient = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateAdminClient,
}));

vi.mock('@/server/security/audit-chain', () => ({
  buildAuditChainRecord: vi.fn((event: { id: string; createdAt: string }, previousHash: string | null) => ({
    previousHash,
    eventHash: previousHash ? `event-hash-after-${previousHash}` : 'event-hash-root',
    signature: previousHash ? `signature-after-${previousHash}` : 'signature-root',
    event,
  })),
}));

function createQueryBuilder(previousHashes: string[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => {
      const eventHash = previousHashes.shift() ?? null;
      return { data: eventHash ? { event_hash: eventHash } : null, error: null };
    }),
    insert: vi.fn(async () => ({ error: null })),
  };
}

describe('audit event burst contention', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    tryCreateAdminClient.mockReset();
  });

  it('persists after ten consecutive previous-hash conflicts without falling back', async () => {
    const hashes = Array.from({ length: 11 }, (_, index) => `hash-${index + 1}`);
    const queryBuilder = createQueryBuilder([...hashes]);
    let attempts = 0;
    const rpc = vi.fn(async () => {
      attempts += 1;
      return attempts <= 10
        ? { error: { code: '40001', message: 'audit chain previous hash mismatch' } }
        : { error: null };
    });
    const supabase = {
      from: vi.fn(() => queryBuilder),
      rpc,
    };

    tryCreateAdminClient.mockReturnValue(supabase);

    const { createAuditEvent } = await import('./audit-events');
    const result = await createAuditEvent({
      organizationId: 'org_burst',
      actorUserId: 'user_burst',
      action: 'security.audit_burst_test',
      entityType: 'audit_chain',
      entityId: 'burst-1',
      metadata: { synthetic: true },
    });

    expect(result).toMatchObject({
      persisted: true,
      transactional: true,
      previousHash: 'hash-11',
      eventHash: 'event-hash-after-hash-11',
    });
    expect(rpc).toHaveBeenCalledTimes(11);
    expect(queryBuilder.insert).not.toHaveBeenCalled();
  }, 10_000);
});
