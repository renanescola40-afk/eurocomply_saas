import { existsSync, readFileSync } from 'node:fs';
import { validateAuditChainLiveEvidence } from './validate-audit-chain-live-evidence.mjs';

const auditSigningEnv = 'AUDIT_CHAIN_SIGNING_SECRET';

const files = {
  helper: 'src/server/security/audit-chain.ts',
  helperTest: 'src/server/security/audit-chain.test.ts',
  auditEvents: 'src/server/queries/audit-events.ts',
  auditEventsTest: 'src/server/queries/audit-events.test.ts',
  migration: 'supabase/migrations/20260612_audit_event_hash_chain.sql',
  rpcMigration: 'supabase/migrations/20260613_audit_event_chained_rpc.sql',
  enterpriseMigration: 'supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql',
  concurrencyRunbook: 'docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md',
  model: 'docs/security/AUDIT_CHAIN_MODEL.md',
  verifyRoute: 'src/app/api/audit/chain/verify/route.ts',
  evidencePackRoute: 'src/app/api/audit/evidence-pack/route.ts',
  cli: 'scripts/security/verify-audit-chain.mjs',
  liveValidation: 'scripts/security/run-audit-chain-live-validation.mjs',
  verifyRouteTest: 'src/app/api/audit/chain/verify/route.test.ts',
  evidencePackRouteTest: 'src/app/api/audit/evidence-pack/route.test.ts',
  runtimeEvidence: 'docs/security/evidence/runtime/audit-chain-live-validation.json',
  preflight: 'scripts/preflight.mjs',
};

const requiredTokens = {
  helper: ['canonicalizeAuditEvent', 'buildAuditEventHash', 'signAuditEventHash', 'buildAuditChainRecord', 'verifyAuditChain', 'createHash', 'createHmac', auditSigningEnv, 'previous_hash_mismatch', 'event_hash_mismatch', 'signature_mismatch'],
  helperTest: ['canonicalizes metadata deterministically', 'builds deterministic hashes', 'detects previous hash tampering', 'detects event content tampering', 'signs hashes when an audit chain secret is configured'],
  auditEvents: ['buildAuditChainRecord', 'sanitizeAuditMetadata', 'requestContext', 'append_audit_event_chained', 'p_previous_hash', 'p_event_hash', 'p_hash_signature', 'transactional_append_unavailable', 'AUDIT_CHAIN_ALLOW_NON_TRANSACTIONAL_FALLBACK', 'AUDIT_CHAIN_ALLOW_LEGACY_FALLBACK'],
  auditEventsTest: ['persists through the transactional audit-chain RPC when available', 'retries the transactional RPC when Supabase reports a previous hash mismatch', 'fails closed instead of using non-transactional append when the RPC is unavailable by default', 'sanitizes audit metadata before hashing and persistence'],
  migration: ['previous_hash', 'event_hash', 'hash_algorithm', 'hash_signature'],
  rpcMigration: ['append_audit_event_chained', 'pg_advisory_xact_lock', 'p_previous_hash', 'security definer'],
  enterpriseMigration: ['drop function if exists public.append_audit_event_chained', 'p_id uuid', 'p_created_at timestamptz', 'pg_advisory_xact_lock', 'security definer'],
  concurrencyRunbook: ['Audit Chain Concurrency Runbook', 'append_audit_event_chained', 'concurrent event ingestion', 'Release Rule'],
  model: ['Enterprise Audit Chain Model', 'Required Event Payload', 'Critical Event Coverage', 'Evidence Pack Export', 'Release Gate'],
  verifyRoute: ['getCurrentUser', 'assertOrganizationPermission', 'read_audit', 'requireStepUpForRequest', 'audit_chain_verify', 'checkDistributedRateLimit', 'createAuditEvent', 'audit_chain.verified'],
  evidencePackRoute: ['assertOrganizationPermission', 'export_data', 'requireStepUpForRequest', 'audit_chain_export', 'buildEvidencePackIntegrity', '!integrity.signed', 'audit_evidence_pack_signing_unavailable', 'audit_chain.evidence_exported'],
  cli: ['eurocomply.audit-chain.cli', '--input', '--expected-previous-hash', 'SIGNING_ENV', 'canonicalizeAuditEvent', 'buildAuditEventHash', 'missing_previous_hash', 'previous_hash_mismatch', 'event_hash_mismatch', 'signature_mismatch', 'payload.evidence?.auditEvents', 'evidence?.auditEvents', 'process.exit(result.ok ? 0 : 1)'],
  liveValidation: ['run-audit-chain-live-validation', 'append_audit_event_chained', 'organizationEnv', 'proofEnv', 'appendConcurrent', 'tamperDetection', 'missingPreviousHash', 'criticalEventCoverage', 'enterpriseRelease', 'audit_chain_target_live_validation_incomplete'],
  verifyRouteTest: ['rejects verification before step-up when RBAC is missing', 'verifies the chain only after RBAC and signed step-up', 'rejects verification without a valid step-up token', 'audit_chain.verified'],
  evidencePackRouteTest: ['returns a signed export only after RBAC and step-up', 'rejects export when RBAC is missing', 'fails closed when the evidence export cannot be signed', 'audit_chain.evidence_exported'],
  runtimeEvidence: ['audit-chain-live-validation', 'appendNormal', 'appendConcurrent', 'tamperDetection', 'missingPreviousHash', 'signedExport', 'verifyWithStepUp', 'criticalEventCoverage', 'cliVerifier', 'targetLiveValidation', 'AUDIT_CHAIN_LIVE_PROOF'],
};

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
    if (!source.includes(token)) failures.push(`${path} missing audit-chain token: ${token}`);
  }
}

console.log('EuroComply audit chain security check');
console.log('-------------------------------------');

const sources = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, read(path)]));

for (const [key, tokens] of Object.entries(requiredTokens)) {
  if (sources[key]) requireTokens(files[key], sources[key], tokens);
}

if (sources.runtimeEvidence) {
  try {
    const evidence = JSON.parse(sources.runtimeEvidence);
    for (const failure of validateAuditChainLiveEvidence(evidence)) {
      failures.push(`${files.runtimeEvidence} ${failure}`);
    }
  } catch (error) {
    failures.push(`${files.runtimeEvidence} must contain valid JSON: ${error instanceof Error ? error.message : error}`);
  }
}

if (sources.preflight && !(sources.preflight.includes(auditSigningEnv) || sources.preflight.includes('auditSigningEnv'))) {
  failures.push(`${files.preflight} must recommend audit-chain signing material`);
}

for (const requiredPath of [files.migration, files.rpcMigration, files.enterpriseMigration, files.concurrencyRunbook, files.model, files.cli, files.liveValidation, files.runtimeEvidence]) {
  if (sources.preflight && !sources.preflight.includes(requiredPath)) failures.push(`${files.preflight} must require ${requiredPath}`);
}

if (sources.preflight && !sources.preflight.includes('audit-chain runtime evidence')) {
  failures.push(`${files.preflight} must block enterprise release without audit-chain runtime evidence`);
}

if (sources.helper && !sources.helper.includes('.sort(([left], [right]) => left.localeCompare(right))')) {
  failures.push(`${files.helper} must sort object keys during canonicalization`);
}

if (sources.helper && sources.helper.includes('Math.random')) failures.push(`${files.helper} must not use random values when building deterministic hashes`);
if (sources.helper && sources.helper.includes('new Date()')) failures.push(`${files.helper} must not introduce current timestamps when building deterministic hashes`);
if (sources.auditEvents && sources.auditEvents.includes('event_hash') && !sources.auditEvents.includes('previousHash')) failures.push(`${files.auditEvents} must return or track previousHash when writing chained audit events`);
if (sources.auditEvents && !sources.auditEvents.includes('randomUUID')) failures.push(`${files.auditEvents} must assign the audit event id before hashing`);
if (sources.auditEvents && !sources.auditEvents.includes('MAX_CHAIN_APPEND_ATTEMPTS = 4')) failures.push(`${files.auditEvents} must retry concurrent previous-hash conflicts more than once`);

const routeSilentlyClampsLimit = sources.verifyRoute.includes('Math.min(Math.max');
if (sources.verifyRoute && routeSilentlyClampsLimit) failures.push(`${files.verifyRoute} must reject invalid verification limits instead of silently clamping them`);
if (sources.verifyRoute && !sources.verifyRoute.includes('Number.isSafeInteger(limit)')) failures.push(`${files.verifyRoute} must validate verification limits as safe integers`);
if (sources.verifyRoute && !sources.verifyRoute.includes('limit < 1 || limit > MAX_AUDIT_CHAIN_VERIFY_LIMIT')) failures.push(`${files.verifyRoute} must enforce explicit lower and upper limit bounds`);

if (failures.length > 0) {
  console.error('Audit chain security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Audit chain security: ok');
}
