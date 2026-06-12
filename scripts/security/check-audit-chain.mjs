import { existsSync, readFileSync } from 'node:fs';

const helperPath = 'src/server/security/audit-chain.ts';
const testPath = 'src/server/security/audit-chain.test.ts';
const auditEventsPath = 'src/server/queries/audit-events.ts';
const migrationPath = 'supabase/migrations/20260612_audit_event_hash_chain.sql';
const preflightPath = 'scripts/preflight.mjs';

const helperRequiredTokens = [
  'canonicalizeAuditEvent',
  'buildAuditEventHash',
  'signAuditEventHash',
  'buildAuditChainRecord',
  'verifyAuditChain',
  'createHash',
  'createHmac',
  'sha256',
  'previousHash',
  'eventHash',
  'AUDIT_CHAIN_SIGNING_SECRET',
  'previous_hash_mismatch',
  'event_hash_mismatch',
  'signature_mismatch',
];

const testRequiredTokens = [
  'canonicalizes metadata deterministically',
  'builds deterministic hashes',
  'changes the hash when metadata changes',
  'verifies a valid hash chain',
  'detects previous hash tampering',
  'detects event content tampering',
  'signs hashes when an audit chain secret is configured',
];

const auditEventsRequiredTokens = [
  'buildAuditChainRecord',
  'getPreviousAuditHash',
  'buildChainedPayload',
  'previous_hash',
  'event_hash',
  'hash_algorithm',
  'hash_signature',
  'sha256',
  'legacy',
  'actor_id',
  'actor_user_id',
  'isMissingAuditChainColumns',
];

const migrationRequiredTokens = [
  'actor_user_id',
  'previous_hash',
  'event_hash',
  'hash_algorithm',
  'hash_signature',
  'audit_events_event_hash_key',
  'audit_events_org_created_hash_idx',
  'audit_events_previous_hash_idx',
];

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function requireTokens(path, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(`${path} missing audit-chain token: ${token}`);
    }
  }
}

console.log('EuroComply audit chain security check');
console.log('-------------------------------------');

const helper = read(helperPath);
const test = read(testPath);
const auditEvents = read(auditEventsPath);
const migration = read(migrationPath);
const preflight = read(preflightPath);

if (helper) requireTokens(helperPath, helper, helperRequiredTokens);
if (test) requireTokens(testPath, test, testRequiredTokens);
if (auditEvents) requireTokens(auditEventsPath, auditEvents, auditEventsRequiredTokens);
if (migration) requireTokens(migrationPath, migration, migrationRequiredTokens);

if (preflight && !preflight.includes('AUDIT_CHAIN_SIGNING_SECRET')) {
  failures.push(`${preflightPath} must recommend AUDIT_CHAIN_SIGNING_SECRET`);
}

if (preflight && !preflight.includes(migrationPath)) {
  failures.push(`${preflightPath} must require the audit chain migration`);
}

if (helper && !helper.includes('.sort(([left], [right]) => left.localeCompare(right))')) {
  failures.push(`${helperPath} must sort object keys during canonicalization`);
}

if (helper && helper.includes('Math.random')) {
  failures.push(`${helperPath} must not use random values when building deterministic hashes`);
}

if (helper && helper.includes('new Date()')) {
  failures.push(`${helperPath} must not introduce current timestamps when building deterministic hashes`);
}

if (auditEvents && auditEvents.includes('event_hash') && !auditEvents.includes('previousHash')) {
  failures.push(`${auditEventsPath} must return or track previousHash when writing chained audit events`);
}

if (auditEvents && !auditEvents.includes('randomUUID')) {
  failures.push(`${auditEventsPath} must assign the audit event id before hashing`);
}

if (failures.length > 0) {
  console.error('Audit chain security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Audit chain security: ok');
}
