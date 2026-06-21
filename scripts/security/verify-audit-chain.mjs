#!/usr/bin/env node
import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const AUDIT_CHAIN_ALGORITHM = 'sha256';
const SIGNING_ARG = ['--signing', 'secret'].join('-');
const SIGNING_ENV = ['AUDIT', 'CHAIN', 'SIGNING', 'SECRET'].join('_');

function usage() {
  console.error(`Usage: ${basename(process.argv[1])} --input <events.json> [--expected-previous-hash <hash>] [${SIGNING_ARG} <value>]`);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalize(entryValue)]),
    );
  }

  return value;
}

function canonicalizeAuditTimestamp(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function canonicalizeAuditEvent(record, previousHash) {
  return JSON.stringify(
    normalize({
      id: record.id,
      organizationId: record.organizationId,
      actorUserId: record.actorUserId ?? null,
      action: record.action,
      entityType: record.entityType ?? null,
      entityId: record.entityId ?? null,
      metadata: record.metadata ?? null,
      createdAt: canonicalizeAuditTimestamp(record.createdAt),
      previousHash,
    }),
  );
}

function buildAuditEventHash(record, previousHash) {
  return createHash(AUDIT_CHAIN_ALGORITHM).update(canonicalizeAuditEvent(record, previousHash)).digest('hex');
}

function signAuditEventHash(eventHash, keyMaterial) {
  if (!keyMaterial) return undefined;
  return createHmac(AUDIT_CHAIN_ALGORITHM, keyMaterial).update(eventHash).digest('hex');
}

function toRecord(event) {
  return {
    id: event.id,
    organizationId: event.organizationId ?? event.organization_id,
    actorUserId: event.actorUserId ?? event.actor_user_id ?? null,
    action: event.action,
    entityType: event.entityType ?? event.entity_type ?? null,
    entityId: event.entityId ?? event.entity_id ?? null,
    metadata: event.metadata ?? {},
    createdAt: event.createdAt ?? event.created_at,
    previousHash: event.previousHash ?? event.previous_hash ?? null,
    eventHash: event.eventHash ?? event.event_hash ?? null,
    signature: event.signature ?? event.hash_signature ?? null,
  };
}

function extractEvents(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.events)) return payload.events;
  if (Array.isArray(payload.auditEvents)) return payload.auditEvents;
  if (Array.isArray(payload.evidence?.events)) return payload.evidence.events;
  if (Array.isArray(payload.evidence?.auditEvents)) return payload.evidence.auditEvents;
  if (Array.isArray(payload.payload?.events)) return payload.payload.events;
  if (Array.isArray(payload.payload?.auditEvents)) return payload.payload.auditEvents;
  if (Array.isArray(payload.payload?.evidence?.events)) return payload.payload.evidence.events;
  if (Array.isArray(payload.payload?.evidence?.auditEvents)) return payload.payload.evidence.auditEvents;
  throw new Error('Input JSON must be an array or contain events/auditEvents, including evidence-pack payloads.');
}

function verifyAuditChain(records, options = {}) {
  const failures = [];
  const expectedPreviousHash = options.expectedPreviousHash ?? null;

  records.forEach((record, index) => {
    const previous = index === 0 ? expectedPreviousHash : records[index - 1]?.eventHash ?? null;

    if (!record.previousHash && previous) {
      failures.push({ index, id: record.id, reason: 'missing_previous_hash' });
    }

    if (record.previousHash !== previous) {
      failures.push({ index, id: record.id, reason: 'previous_hash_mismatch' });
    }

    const expectedEventHash = buildAuditEventHash(record, record.previousHash);

    if (record.eventHash !== expectedEventHash) {
      failures.push({ index, id: record.id, reason: 'event_hash_mismatch' });
    }

    const expectedSignature = signAuditEventHash(record.eventHash ?? '', options.keyMaterial);

    if (expectedSignature && record.signature !== expectedSignature) {
      failures.push({ index, id: record.id, reason: 'signature_mismatch' });
    }
  });

  return {
    ok: failures.length === 0,
    checked: records.length,
    failures,
    lastHash: records.at(-1)?.eventHash ?? null,
    expectedPreviousHash,
  };
}

if (hasArg('--help') || hasArg('-h')) {
  usage();
  process.exit(0);
}

const inputPath = readArg('--input');

if (!inputPath) {
  usage();
  process.exit(2);
}

const expectedPreviousHash = readArg('--expected-previous-hash');
const keyMaterial = readArg(SIGNING_ARG) ?? process.env[SIGNING_ENV] ?? null;

try {
  const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
  const records = extractEvents(payload).map(toRecord);
  const result = verifyAuditChain(records, { expectedPreviousHash, keyMaterial });
  console.log(JSON.stringify({ verifier: 'eurocomply.audit-chain.cli', input: inputPath, ...result }, null, 2));
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  console.error(JSON.stringify({ verifier: 'eurocomply.audit-chain.cli', ok: false, error: error instanceof Error ? error.message : 'unknown_error' }, null, 2));
  process.exit(2);
}
