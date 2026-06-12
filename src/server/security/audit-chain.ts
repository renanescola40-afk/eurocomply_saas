import { createHash, createHmac } from 'crypto';

export type AuditChainInput = {
  id: string;
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  createdAt: string;
};

export type AuditChainRecord = AuditChainInput & {
  previousHash: string | null;
  eventHash: string;
  signature?: string;
};

const AUDIT_CHAIN_ALGORITHM = 'sha256';

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalize(entryValue)]),
    );
  }

  return value;
}

export function canonicalizeAuditEvent(input: AuditChainInput, previousHash: string | null) {
  return JSON.stringify(
    normalize({
      id: input.id,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
      createdAt: input.createdAt,
      previousHash,
    }),
  );
}

export function buildAuditEventHash(input: AuditChainInput, previousHash: string | null) {
  return createHash(AUDIT_CHAIN_ALGORITHM)
    .update(canonicalizeAuditEvent(input, previousHash))
    .digest('hex');
}

export function signAuditEventHash(eventHash: string, secret = process.env.AUDIT_CHAIN_SIGNING_SECRET) {
  if (!secret) return undefined;

  return createHmac(AUDIT_CHAIN_ALGORITHM, secret).update(eventHash).digest('hex');
}

export function buildAuditChainRecord(input: AuditChainInput, previousHash: string | null): AuditChainRecord {
  const eventHash = buildAuditEventHash(input, previousHash);
  const signature = signAuditEventHash(eventHash);

  return {
    ...input,
    previousHash,
    eventHash,
    ...(signature ? { signature } : {}),
  };
}

export function verifyAuditChain(records: AuditChainRecord[]) {
  const failures: Array<{ index: number; id: string; reason: 'previous_hash_mismatch' | 'event_hash_mismatch' | 'signature_mismatch' }> = [];

  records.forEach((record, index) => {
    const expectedPreviousHash = index === 0 ? null : records[index - 1]?.eventHash ?? null;

    if (record.previousHash !== expectedPreviousHash) {
      failures.push({ index, id: record.id, reason: 'previous_hash_mismatch' });
    }

    const expectedEventHash = buildAuditEventHash(record, record.previousHash);

    if (record.eventHash !== expectedEventHash) {
      failures.push({ index, id: record.id, reason: 'event_hash_mismatch' });
    }

    const expectedSignature = signAuditEventHash(record.eventHash);

    if (expectedSignature && record.signature !== expectedSignature) {
      failures.push({ index, id: record.id, reason: 'signature_mismatch' });
    }
  });

  return {
    ok: failures.length === 0,
    failures,
    checked: records.length,
    lastHash: records.at(-1)?.eventHash ?? null,
  };
}
