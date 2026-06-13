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

const baseInput = {
  organizationId: 'org_123',
  actorUserId: 'user_123',
  action: 'document_uploaded',
  entityType: 'document',
  entityId: 'doc_123',
  metadata: { source: 'test' },
};

function createQueryBuilder(previousHashes: Array<string | null>) {
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

describe('audit event persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    tryCreateAdminClient.mockReset();
  });

  it('persists through the transactional audit-chain RPC when available', async () => {
    const queryBuilder = createQueryBuilder(['hash-a']);
    const rpc = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn(() => queryBuilder),
      rpc,
    };

    tryCreateAdminClient.mockReturnValue(supabase);

    const { createAuditEvent } = await import('./audit-events');
    const result = await createAuditEvent(baseInput);

    expect(result).toMatchObject({
      persisted: true,
      previousHash: 'hash-a',
      eventHash: 'event-hash-after-hash-a',
      transactional: true,
    });
    expect(rpc).toHaveBeenCalledWith(
      'append_audit_event_chained',
      expect.objectContaining({
        p_organization_id: 'org_123',
        p_actor_user_id: 'user_123',
        p_previous_hash: 'hash-a',
        p_event_hash: 'event-hash-after-hash-a',
        p_hash_signature: 'signature-after-hash-a',
        p_hash_algorithm: 'sha256',
      }),
    );
    expect(queryBuilder.insert).not.toHaveBeenCalled();
  });

  it('retries the transactional RPC when Supabase reports a previous hash mismatch', async () => {
    const queryBuilder = createQueryBuilder(['hash-a', 'hash-b']);
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ error: { code: '40001', message: 'audit chain previous hash mismatch' } })
      .mockResolvedValueOnce({ error: null });
    const supabase = {
      from: vi.fn(() => queryBuilder),
      rpc,
    };

    tryCreateAdminClient.mockReturnValue(supabase);

    const { createAuditEvent } = await import('./audit-events');
    const result = await createAuditEvent(baseInput);

    expect(result).toMatchObject({
      persisted: true,
      previousHash: 'hash-b',
      eventHash: 'event-hash-after-hash-b',
      transactional: true,
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      'append_audit_event_chained',
      expect.objectContaining({ p_previous_hash: 'hash-a', p_event_hash: 'event-hash-after-hash-a' }),
    );
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      'append_audit_event_chained',
      expect.objectContaining({ p_previous_hash: 'hash-b', p_event_hash: 'event-hash-after-hash-b' }),
    );
    expect(queryBuilder.insert).not.toHaveBeenCalled();
  });

  it('falls back to direct chained insert only when the transactional RPC is unavailable', async () => {
    const queryBuilder = createQueryBuilder(['hash-a', 'hash-a']);
    const rpc = vi.fn(async () => ({ error: { code: '42883', message: 'function append_audit_event_chained does not exist' } }));
    const supabase = {
      from: vi.fn(() => queryBuilder),
      rpc,
    };

    tryCreateAdminClient.mockReturnValue(supabase);

    const { createAuditEvent } = await import('./audit-events');
    const result = await createAuditEvent(baseInput);

    expect(result).toMatchObject({
      persisted: true,
      previousHash: 'hash-a',
      eventHash: 'event-hash-after-hash-a',
      transactional: false,
      rpcUnavailable: true,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(queryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org_123',
        actor_user_id: 'user_123',
        previous_hash: 'hash-a',
        event_hash: 'event-hash-after-hash-a',
        hash_signature: 'signature-after-hash-a',
      }),
    );
  });
});
