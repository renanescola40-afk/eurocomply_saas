import crypto from 'node:crypto';
import {
  LIVE_RLS_EVIDENCE_SCHEMA,
  loadForwardManifestContract,
} from './supabase-forward-manifest-contract.mjs';

export const runner = 'scripts/security/run-supabase-live-tenant-isolation.mjs';
export const FORWARD_EVIDENCE_SCHEMA = LIVE_RLS_EVIDENCE_SCHEMA;

export const customerTenantTables = [
  'organizations', 'organization_members', 'ai_systems', 'compliance_tasks',
  'documents', 'risks', 'vendors', 'subscriptions', 'audit_logs', 'invitations',
  'onboarding_activation_runs', 'monitoring_preferences', 'profiles',
];
export const globalReferenceTables = ['regulatory_updates'];
export const criticalTables = [...customerTenantTables, ...globalReferenceTables];
export const optionalTables = ['tasks', 'audit_events', 'notifications', 'ai_incidents', 'organization_invites'];
export const requiredCoverageOperations = ['cross_tenant_read', 'cross_tenant_insert', 'cross_tenant_update', 'cross_tenant_delete'];
export const requiredSameTenantReadOperations = ['same_tenant_read', 'same_tenant_read_backend_only'];
export const requiredBackendWriteDenyOperations = ['same_tenant_insert_denied', 'same_tenant_update_denied', 'same_tenant_delete_denied'];
export const requiredViewerAdminDenyOperations = [
  'viewer_same_tenant_admin_insert_denied',
  'viewer_same_tenant_admin_update_denied',
  'viewer_same_tenant_admin_delete_denied',
];
export const backendOwnedTables = ['subscriptions', 'audit_logs', 'invitations', 'compliance_tasks'];
export const sameTenantWritableTables = ['ai_systems', 'documents', 'risks', 'vendors', 'onboarding_activation_runs', 'monitoring_preferences'];
export const requiredGlobalReferenceOperations = [
  'rls_enabled', 'authenticated_read_denied', 'authenticated_insert_denied',
  'authenticated_update_denied', 'authenticated_delete_denied', 'service_role_read_allowed',
];

export function commandUsed(argv = process.argv.slice(2)) {
  return `node ${runner}${argv.length ? ` ${argv.join(' ')}` : ''}`;
}
export function githubActionsProvenanceFromEnv(env = process.env) {
  const required = ['GITHUB_SERVER_URL', 'GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'GITHUB_SHA'];
  if (env.GITHUB_ACTIONS !== 'true' || required.some((name) => !env[name])) return null;
  return {
    generatedInGitHubActions: true,
    workflow: env.GITHUB_WORKFLOW || 'unknown',
    runId: env.GITHUB_RUN_ID,
    runAttempt: env.GITHUB_RUN_ATTEMPT || 'unknown',
    runUrl: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`,
    repository: env.GITHUB_REPOSITORY,
    commitSha: env.GITHUB_SHA,
    refName: env.GITHUB_REF_NAME || 'unknown',
    actor: env.GITHUB_ACTOR || 'unknown',
    eventName: env.GITHUB_EVENT_NAME || 'unknown',
    stampedAt: new Date().toISOString(),
  };
}
export function projectReferenceFromUrl(url) {
  return String(url ?? '').match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? null;
}
export function redactProjectReferenceFromUrl(url) {
  const ref = projectReferenceFromUrl(url);
  if (!ref) return 'redacted:unknown';
  return `redacted:sha256:${crypto.createHash('sha256').update(ref).digest('hex').slice(0, 16)}`;
}
export function parseEvidenceJson(source) {
  try { return { evidence: JSON.parse(source), errors: [] }; }
  catch (error) { return { evidence: null, errors: [`invalid JSON: ${error instanceof Error ? error.message : error}`] }; }
}
function hasPassed(tests, table, operation) {
  return tests.some((test) => test?.table === table && test?.operation === operation && test?.passed === true);
}
function hasAnyPassed(tests, table, operations) {
  return operations.some((operation) => hasPassed(tests, table, operation));
}
export function tableCoverageFrom(testCases = []) {
  const tables = testCases.map((test) => test?.table).filter((value, index, list) => value && list.indexOf(value) === index);
  return tables.map((table) => {
    const tests = testCases.filter((test) => test?.table === table);
    const byOperation = new Map(tests.map((test) => [test.operation, test.passed === true]));
    return {
      table,
      status: tests.every((test) => test.passed === true) ? 'passed' : 'failed',
      rlsEnabled: byOperation.get('rls_enabled') === true,
      operations: {
        rlsEnabled: byOperation.get('rls_enabled') === true,
        crossTenantReadDenied: byOperation.get('cross_tenant_read') === true,
        crossTenantInsertDenied: byOperation.get('cross_tenant_insert') === true,
        crossTenantUpdateDenied: byOperation.get('cross_tenant_update') === true,
        crossTenantDeleteDenied: byOperation.get('cross_tenant_delete') === true,
        sameTenantReadAllowed: hasAnyPassed(testCases, table, requiredSameTenantReadOperations),
        sameTenantInsertAllowed: byOperation.get('same_tenant_insert') === true || !sameTenantWritableTables.includes(table),
        backendWritesDenied: !backendOwnedTables.includes(table) || requiredBackendWriteDenyOperations.every((operation) => byOperation.get(operation) === true),
        globalProductBackendOnly: !globalReferenceTables.includes(table) || requiredGlobalReferenceOperations.every((operation) => byOperation.get(operation) === true),
      },
    };
  });
}
function requirePassed(tests, table, operation, errors) {
  if (!hasPassed(tests, table, operation)) errors.push(`missing live RLS operation coverage: ${table}:${operation}`);
}
function validatePromotionLineage(evidence, errors) {
  const contract = loadForwardManifestContract();
  if (evidence?.schema !== LIVE_RLS_EVIDENCE_SCHEMA) errors.push(`schema must be ${LIVE_RLS_EVIDENCE_SCHEMA}`);
  const lineage = evidence?.promotionLineage;
  if (!lineage || typeof lineage !== 'object' || Array.isArray(lineage)) {
    errors.push('promotionLineage is required');
    return;
  }
  if (!/^\d+$/.test(String(lineage.promotionRunId ?? ''))) errors.push('promotionLineage.promotionRunId must be numeric');
  if (lineage.changeSet !== contract.changeSet) errors.push('promotionLineage.changeSet must match current governed manifest');
  if (Number(lineage.selectedMigrationCount) !== contract.count) errors.push('promotionLineage.selectedMigrationCount must match current governed manifest');
  if (!/^sha256:[a-f0-9]{64}$/.test(String(lineage.selectionDigest ?? ''))) errors.push('promotionLineage.selectionDigest is invalid');
  if (lineage.manifestMatchVerified !== true) errors.push('promotionLineage.manifestMatchVerified must be true');
  if (lineage.remoteAfterEqualsBeforePlusSelected !== true) errors.push('promotionLineage exact remote transition is not proven');
  if (lineage.unauthorizedMigrationApplied !== false) errors.push('promotionLineage reports an unauthorized migration');
  if (lineage.productionPromotionVerified !== true) errors.push('promotionLineage.productionPromotionVerified must be true');
}
export function validatePassingEvidence(evidence) {
  const errors = [];
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return { valid: false, errors: ['evidence must be an object'] };
  validatePromotionLineage(evidence, errors);
  if (evidence.evidenceItem !== 'supabase-live-rls-validation') errors.push('unexpected evidence item');
  if (evidence.status !== 'Complete') errors.push('status must be Complete');
  if (evidence.outcome !== 'passed') errors.push('outcome must be passed');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(String(evidence.timestamp ?? ''))) errors.push('timestamp must be UTC ISO-8601 seconds');
  if (!String(evidence.reviewer ?? '').trim()) errors.push('reviewer is required');
  if (!String(evidence.commandUsed ?? '').includes(runner)) errors.push('commandUsed must include the live tenant-isolation runner');
  if (!/^[a-f0-9]{40}$/i.test(String(evidence.commitSha ?? ''))) errors.push('commitSha must be a full 40-character SHA');
  if (evidence.supabaseProjectReferenceRedacted !== true) errors.push('supabaseProjectReferenceRedacted must be true');
  if (!String(evidence.supabaseProjectReference ?? '').startsWith('redacted:')) errors.push('supabaseProjectReference must be redacted');
  if (!Array.isArray(evidence.failures)) errors.push('failures must be an array');
  else if (evidence.failures.length) errors.push('passing evidence must not contain failures');
  if (!Array.isArray(evidence.serviceRolePaths) || evidence.serviceRolePaths.length < 4) errors.push('serviceRolePaths must document privileged paths');
  const tests = Array.isArray(evidence.testCases) ? evidence.testCases : [];
  if (!tests.length) errors.push('testCases must include live validation cases');
  if (tests.some((test) => test?.passed !== true)) errors.push('all testCases must pass');
  for (const table of customerTenantTables) {
    requirePassed(tests, table, 'rls_enabled', errors);
    for (const operation of requiredCoverageOperations) requirePassed(tests, table, operation, errors);
    if (!hasAnyPassed(tests, table, requiredSameTenantReadOperations)) errors.push(`missing live RLS operation coverage: ${table}:same_tenant_read`);
  }
  for (const table of sameTenantWritableTables) requirePassed(tests, table, 'same_tenant_insert', errors);
  for (const table of backendOwnedTables) for (const operation of requiredBackendWriteDenyOperations) requirePassed(tests, table, operation, errors);
  for (const operation of requiredViewerAdminDenyOperations) requirePassed(tests, 'organization_members', operation, errors);
  for (const operation of requiredGlobalReferenceOperations) requirePassed(tests, 'regulatory_updates', operation, errors);
  if (!Array.isArray(evidence.testsRun) || evidence.testsRun.length !== tests.length) errors.push('testsRun must list every executed test case');
  if (!Array.isArray(evidence.testsPassed)) errors.push('testsPassed must be an array');
  if (!Array.isArray(evidence.testsFailed)) errors.push('testsFailed must be an array');
  else if (evidence.testsFailed.length) errors.push('passing evidence must not contain failed tests');
  return { valid: errors.length === 0, errors };
}
export function buildEvidencePayload({
  status, outcome, supabaseUrl, testCases = [], failures = [],
  tablesReviewed = tableCoverageFrom(testCases), registerUpdated = false,
  reviewer = process.env.RLS_LIVE_REVIEWER || process.env.GITHUB_ACTOR || 'security-automation',
  command = commandUsed(), commitSha = 'unknown',
  timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), serviceRolePaths = [], extra = {},
}) {
  const githubActions = githubActionsProvenanceFromEnv();
  const contract = loadForwardManifestContract();
  const passing = status === 'Complete' && outcome === 'passed';
  return {
    schema: LIVE_RLS_EVIDENCE_SCHEMA,
    evidenceItem: 'supabase-live-rls-validation', status, outcome, timestamp, generatedAt: timestamp,
    runner, reviewer, reviewedAt: timestamp, commandUsed: command, commitSha,
    promotionLineage: {
      promotionRunId: String(process.env.PROMOTION_RUN_ID ?? '').trim(),
      changeSet: String(process.env.PROMOTION_CHANGE_SET ?? '').trim(),
      selectedMigrationCount: Number(process.env.PROMOTION_SELECTED_MIGRATION_COUNT ?? 0),
      selectionDigest: String(process.env.PROMOTION_SELECTION_DIGEST ?? '').trim(),
      manifestMatchVerified: process.env.PROMOTION_MANIFEST_MATCH_VERIFIED === 'true',
      remoteAfterEqualsBeforePlusSelected: process.env.PROMOTION_REMOTE_TRANSITION_VERIFIED === 'true',
      unauthorizedMigrationApplied: process.env.PROMOTION_UNAUTHORIZED_MIGRATION_APPLIED === 'true',
      productionPromotionVerified: process.env.PROMOTION_PRODUCTION_VERIFIED === 'true',
    },
    supabaseProjectReference: redactProjectReferenceFromUrl(supabaseUrl), supabaseProjectReferenceRedacted: true,
    summary: passing ? `Live Supabase RLS proof passed and is bound to governed forward promotion ${contract.changeSet} (${contract.count} migrations).` : 'Live Supabase RLS validation did not pass.',
    redactionConfirmation: 'Supabase project reference, credentials, tokens, secrets, connection strings and access-granting values are redacted.',
    evidenceLocations: ['docs/security/evidence/runtime/supabase-live-rls-validation.json'],
    productionGate: passing ? 'eligible only if every other P0 runtime gate passes' : 'blocked',
    controlsVerified: passing ? [
      'RLS enabled on canonical customer tenant tables', 'Tenant A cannot read or mutate Tenant B rows',
      'Licensed same-tenant product access is preserved', 'Unlicensed and anonymous paid-product access is denied',
      'Organization compliance task mutations remain backend-owned', 'Regulatory updates are backend-only',
      'Live inventory helper remains service-role-only', 'Evidence Vault browser and Storage bypass boundaries are fail-closed',
      'Evidence is bound to the exact current governed Production promotion manifest',
    ] : [],
    customerTenantTables, globalReferenceTables, criticalTables, optionalTables, tablesReviewed,
    testsRun: testCases.map((test) => `${test.table}:${test.operation}`),
    testsPassed: testCases.filter((test) => test.passed === true).map((test) => `${test.table}:${test.operation}`),
    testsFailed: testCases.filter((test) => test.passed !== true).map((test) => `${test.table}:${test.operation}`),
    testCases, failures, serviceRolePaths, registerUpdated,
    completionRule: `Only ${runner} may mark this evidence Complete after a successful promotion-bound live run.`,
    nextReviewDue: null,
    ...(githubActions ? { githubActions } : {}),
    ...extra,
  };
}
