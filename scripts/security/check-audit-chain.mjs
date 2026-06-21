import { existsSync, readFileSync } from 'node:fs';

const helperPath = 'src/server/security/audit-chain.ts';
const testPath = 'src/server/security/audit-chain.test.ts';
const auditEventsPath = 'src/server/queries/audit-events.ts';
const auditEventsTestPath = 'src/server/queries/audit-events.test.ts';
const migrationPath = 'supabase/migrations/20260612_audit_event_hash_chain.sql';
const chainedRpcMigrationPath = 'supabase/migrations/20260613_audit_event_chained_rpc.sql';
const enterpriseRpcMigrationPath = 'supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql';
const concurrencyRunbookPath = 'docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md';
const auditChainModelPath = 'docs/security/AUDIT_CHAIN_MODEL.md';
const verifierRoutePath = 'src/app/api/audit/chain/verify/route.ts';
const evidencePackRoutePath = 'src/app/api/audit/evidence-pack/route.ts';
const verifierCliPath = 'scripts/security/verify-audit-chain.mjs';
const verifierRouteTestPath = 'src/app/api/audit/chain/verify/route.test.ts';
const evidencePackRouteTestPath = 'src/app/api/audit/evidence-pack/route.test.ts';
const runtimeEvidencePath = 'docs/security/evidence/runtime/audit-chain-live-validation.json';
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
  'sanitizeAuditMetadata',
  'requestContext',
  'buildAuditRequestContextFromRequest',
  'getPreviousAuditHash',
  'buildChainedPayload',
  'append_audit_event_chained',
  'p_id',
  'p_created_at',
  'p_previous_hash',
  'p_event_hash',
  'p_hash_signature',
  'isAuditChainPreviousHashMismatch',
  'isMissingAuditChainRpc',
  'previous_hash',
  'event_hash',
  'hash_algorithm',
  'hash_signature',
  'sha256',
  'transactional_append_unavailable',
  'AUDIT_CHAIN_ALLOW_NON_TRANSACTIONAL_FALLBACK',
  'AUDIT_CHAIN_ALLOW_LEGACY_FALLBACK',
  'actor_id',
  'actor_user_id',
  'isMissingAuditChainColumns',
];

const auditEventsTestRequiredTokens = [
  'persists through the transactional audit-chain RPC when available',
  'retries the transactional RPC when Supabase reports a previous hash mismatch',
  'fails closed instead of using non-transactional append when the RPC is unavailable by default',
  'allows direct chained insert only through an explicit non-enterprise fallback flag',
  'sanitizes audit metadata before hashing and persistence',
  'request context',
  'append_audit_event_chained',
  'audit chain previous hash mismatch',
  '40001',
  'p_id',
  'p_created_at',
  'p_previous_hash',
  'p_event_hash',
  'transactional: true',
  'transactional: false',
  'rpcUnavailable: true',
  'transactional_append_unavailable',
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

const chainedRpcMigrationRequiredTokens = [
  'append_audit_event_chained',
  'pg_advisory_xact_lock',
  'hashtext(p_organization_id::text)',
  'p_previous_hash',
  'audit chain previous hash mismatch',
  'previous_hash',
  'event_hash',
  'hash_algorithm',
  'hash_signature',
  'order by ae.created_at desc',
  'limit 1',
  'security definer',
];

const enterpriseRpcMigrationRequiredTokens = [
  'drop function if exists public.append_audit_event_chained',
  'p_id uuid',
  'p_created_at timestamptz',
  'id,',
  'created_at,',
  'p_id,',
  'p_created_at,',
  'pg_advisory_xact_lock',
  'hashtext(p_organization_id::text)',
  'audit chain previous hash mismatch',
  'security definer',
  'service_role',
];

const concurrencyRunbookRequiredTokens = [
  'Audit Chain Concurrency Runbook',
  'pg_advisory_xact_lock',
  'append_audit_event_chained',
  'same organization',
  'previous_hash',
  'event_hash',
  'concurrent event ingestion',
  'Release Rule',
];

const auditChainModelRequiredTokens = [
  'Enterprise Audit Chain Model',
  'Required Event Payload',
  'organizationId',
  'actorUserId',
  'requestContext',
  'Critical Event Coverage',
  'Transactional Append',
  'Verification',
  'Evidence Pack Export',
  'Release Gate',
  'scripts/security/verify-audit-chain.mjs',
  'docs/security/evidence/runtime/audit-chain-live-validation.json',
];

const verifierRequiredTokens = [
  'getCurrentUser',
  'getCurrentOrganizationForUser',
  'assertOrganizationPermission',
  'read_audit',
  'assertPlanAtLeast',
  'business',
  'requireStepUpForRequest',
  'audit_chain_verify',
  'checkDistributedRateLimit',
  'listAuditEvents',
  'verifyAuditChain',
  'createAuditEvent',
  'audit_chain.verified',
  'buildAuditRequestContextFromRequest',
  'requestContext',
  'noStoreJson',
  'legacyEvents',
  'chainedEventsChecked',
  'parseAuditChainVerifyLimit',
  'DEFAULT_AUDIT_CHAIN_VERIFY_LIMIT',
  'MAX_AUDIT_CHAIN_VERIFY_LIMIT',
  'invalid_limit',
];

const evidencePackRouteRequiredTokens = [
  'assertOrganizationPermission',
  'export_data',
  'requireStepUpForRequest',
  'audit_chain_export',
  'buildEvidencePackIntegrity',
  '!integrity.signed',
  'audit_evidence_pack_signing_unavailable',
  'audit_chain.evidence_exported',
  'security.failure',
  'signatureAlgorithm',
  'buildAuditRequestContextFromRequest',
  'requestContext',
];

const verifierCliRequiredTokens = [
  'eurocomply.audit-chain.cli',
  '--input',
  '--expected-previous-hash',
  'AUDIT_CHAIN_SIGNING_SECRET',
  'canonicalizeAuditEvent',
  'buildAuditEventHash',
  'missing_previous_hash',
  'previous_hash_mismatch',
  'event_hash_mismatch',
  'signature_mismatch',
  'process.exit(result.ok ? 0 : 1)',
];

const verifierRouteTestRequiredTokens = [
  'rejects verification before step-up when RBAC is missing',
  'verifies the chain only after RBAC and signed step-up',
  'rejects verification without a valid step-up token',
  'audit_chain.verified',
  'verificationAuditEvent',
  'buildAuditRequestContextFromRequest',
];

const evidencePackRouteTestRequiredTokens = [
  'returns a signed export only after RBAC and step-up',
  'rejects export when RBAC is missing',
  'fails closed when the evidence export cannot be signed',
  'audit_chain.evidence_exported',
  'audit_evidence_pack_signing_unavailable',
  'buildAuditRequestContextFromRequest',
];

const runtimeEvidenceRequiredTokens = [
  'audit-chain-live-validation',
  'appendNormal',
  'appendConcurrent',
  'tamperDetection',
  'missingPreviousHash',
  'signedExport',
  'exportWithoutPermission',
  'verifyWithoutPermission',
  'verifyWithoutStepUp',
  'verifyWithStepUp',
  'criticalEventCoverage',
  'cliVerifier',
  'docs/security/AUDIT_CHAIN_MODEL.md',
  'scripts/security/verify-audit-chain.mjs',
  'docs/security/evidence/runtime/audit-chain-live-validation.json',
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
const auditEventsTest = read(auditEventsTestPath);
const migration = read(migrationPath);
const chainedRpcMigration = read(chainedRpcMigrationPath);
const enterpriseRpcMigration = read(enterpriseRpcMigrationPath);
const concurrencyRunbook = read(concurrencyRunbookPath);
const auditChainModel = read(auditChainModelPath);
const verifierRoute = read(verifierRoutePath);
const evidencePackRoute = read(evidencePackRoutePath);
const verifierCli = read(verifierCliPath);
const verifierRouteTest = read(verifierRouteTestPath);
const evidencePackRouteTest = read(evidencePackRouteTestPath);
const runtimeEvidence = read(runtimeEvidencePath);
const preflight = read(preflightPath);

if (helper) requireTokens(helperPath, helper, helperRequiredTokens);
if (test) requireTokens(testPath, test, testRequiredTokens);
if (auditEvents) requireTokens(auditEventsPath, auditEvents, auditEventsRequiredTokens);
if (auditEventsTest) requireTokens(auditEventsTestPath, auditEventsTest, auditEventsTestRequiredTokens);
if (migration) requireTokens(migrationPath, migration, migrationRequiredTokens);
if (chainedRpcMigration) requireTokens(chainedRpcMigrationPath, chainedRpcMigration, chainedRpcMigrationRequiredTokens);
if (enterpriseRpcMigration) requireTokens(enterpriseRpcMigrationPath, enterpriseRpcMigration, enterpriseRpcMigrationRequiredTokens);
if (concurrencyRunbook) requireTokens(concurrencyRunbookPath, concurrencyRunbook, concurrencyRunbookRequiredTokens);
if (auditChainModel) requireTokens(auditChainModelPath, auditChainModel, auditChainModelRequiredTokens);
if (verifierRoute) requireTokens(verifierRoutePath, verifierRoute, verifierRequiredTokens);
if (evidencePackRoute) requireTokens(evidencePackRoutePath, evidencePackRoute, evidencePackRouteRequiredTokens);
if (verifierCli) requireTokens(verifierCliPath, verifierCli, verifierCliRequiredTokens);
if (verifierRouteTest) requireTokens(verifierRouteTestPath, verifierRouteTest, verifierRouteTestRequiredTokens);
if (evidencePackRouteTest) requireTokens(evidencePackRouteTestPath, evidencePackRouteTest, evidencePackRouteTestRequiredTokens);
if (runtimeEvidence) requireTokens(runtimeEvidencePath, runtimeEvidence, runtimeEvidenceRequiredTokens);

if (preflight && !(preflight.includes('AUDIT_CHAIN_SIGNING_SECRET') || preflight.includes('auditSigningEnv'))) {
  failures.push(`${preflightPath} must recommend audit-chain signing material`);
}

for (const requiredPath of [
  migrationPath,
  chainedRpcMigrationPath,
  enterpriseRpcMigrationPath,
  concurrencyRunbookPath,
  auditChainModelPath,
  verifierCliPath,
  runtimeEvidencePath,
]) {
  if (preflight && !preflight.includes(requiredPath)) {
    failures.push(`${preflightPath} must require ${requiredPath}`);
  }
}

if (preflight && !preflight.includes('audit-chain runtime evidence')) {
  failures.push(`${preflightPath} must block enterprise release without audit-chain runtime evidence`);
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

if (auditEvents && !auditEvents.includes('MAX_CHAIN_APPEND_ATTEMPTS = 4')) {
  failures.push(`${auditEventsPath} must retry concurrent previous-hash conflicts more than once`);
}

const routeSilentlyClampsLimit = verifierRoute.includes('Math.min(Math.max');

if (verifierRoute && routeSilentlyClampsLimit) {
  failures.push(`${verifierRoutePath} must reject invalid verification limits instead of silently clamping them`);
}

if (verifierRoute && !verifierRoute.includes('Number.isSafeInteger(limit)')) {
  failures.push(`${verifierRoutePath} must validate verification limits as safe integers`);
}

if (verifierRoute && !verifierRoute.includes('limit < 1 || limit > MAX_AUDIT_CHAIN_VERIFY_LIMIT')) {
  failures.push(`${verifierRoutePath} must enforce explicit lower and upper limit bounds`);
}

if (failures.length > 0) {
  console.error('Audit chain security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Audit chain security: ok');
}
