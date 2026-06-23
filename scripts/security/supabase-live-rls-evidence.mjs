import crypto from 'node:crypto';

export const runner = 'scripts/security/run-supabase-live-tenant-isolation.mjs';
export const criticalTables = ['organizations', 'organization_members', 'documents', 'audit_events', 'risks', 'vendors', 'tasks', 'subscriptions', 'notifications'];
export const optionalTables = ['profiles', 'compliance_tasks', 'audit_logs', 'ai_systems', 'ai_incidents'];
export const requiredCoverageOperations = ['cross_tenant_read', 'cross_tenant_insert', 'cross_tenant_update', 'cross_tenant_delete'];
export const requiredBackendWriteDenyOperations = ['same_tenant_insert_denied', 'same_tenant_update_denied', 'same_tenant_delete_denied'];
export const requiredViewerAdminDenyOperations = ['viewer_same_tenant_admin_insert_denied', 'viewer_same_tenant_admin_update_denied', 'viewer_same_tenant_admin_delete_denied'];

const backendOwnedTables = new Set(['audit_events', 'audit_logs', 'subscriptions']);
const sameTenantWritableTables = new Set(['documents', 'risks', 'vendors', 'tasks', 'compliance_tasks', 'ai_systems', 'ai_incidents']);

export function commandUsed(argv = process.argv.slice(2)) {
  return `node ${runner}${argv.length > 0 ? ` ${argv.join(' ')}` : ''}`;
}

export function projectReferenceFromUrl(url) {
  return String(url ?? '').match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? null;
}

export function redactProjectReferenceFromUrl(url) {
  const projectRef = projectReferenceFromUrl(url);
  if (!projectRef) return 'redacted:unknown';
  const digest = crypto.createHash('sha256').update(projectRef).digest('hex').slice(0, 16);
  return `redacted:sha256:${digest}`;
}

export function tableCoverageFrom(testCases) {
  const tables = testCases.map((test) => test.table).filter((value, index, list) => value && list.indexOf(value) === index);
  return tables.map((table) => {
    const tableTests = testCases.filter((test) => test.table === table);
    const byOperation = new Map(tableTests.map((test) => [test.operation, test.passed === true]));
    return {
      table,
      status: tableTests.every((test) => test.passed === true) ? 'passed' : 'failed',
      rlsEnabled: byOperation.get('rls_enabled') === true,
      operations: {
        rlsEnabled: byOperation.get('rls_enabled') === true,
        crossTenantReadDenied: byOperation.get('cross_tenant_read') === true,
        crossTenantInsertDenied: byOperation.get('cross_tenant_insert') === true,
        crossTenantUpdateDenied: byOperation.get('cross_tenant_update') === true,
        crossTenantDeleteDenied: byOperation.get('cross_tenant_delete') === true,
        sameTenantReadAllowed: byOperation.get('same_tenant_read') === true || byOperation.get('same_tenant_read_backend_only') === true,
        sameTenantInsertAllowed: byOperation.get('same_tenant_insert') === true || !sameTenantWritableTables.has(table),
        sameTenantBackendWritesDenied: !backendOwnedTables.has(table) || requiredBackendWriteDenyOperations.every((operation) => byOperation.get(operation) === true),
        viewerAdminDenied: table !== 'organization_members' || requiredViewerAdminDenyOperations.every((operation) => byOperation.get(operation) === true),
      },
    };
  });
}

export function parseEvidenceJson(source) {
  try {
    return { evidence: JSON.parse(source), errors: [] };
  } catch (error) {
    return { evidence: null, errors: [`invalid JSON: ${error instanceof Error ? error.message : error}`] };
  }
}

function requirePassedTest(tests, table, operation, errors, message = `missing live RLS operation coverage: ${table}:${operation}`) {
  if (!tests.some((test) => test?.table === table && test?.operation === operation && test?.passed === true)) errors.push(message);
}

export function validatePassingEvidence(evidence) {
  const errors = [];
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return { valid: false, errors: ['evidence must be an object'] };
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
  else if (evidence.failures.length > 0) errors.push('passing evidence must not contain failures');
  if (!Array.isArray(evidence.testsPassed)) errors.push('testsPassed must be an array');
  if (!Array.isArray(evidence.testsFailed)) errors.push('testsFailed must be an array');
  else if (evidence.testsFailed.length > 0) errors.push('passing evidence must not contain failed tests');
  if (!Array.isArray(evidence.serviceRolePaths) || evidence.serviceRolePaths.length < 4) errors.push('serviceRolePaths must document privileged setup, inventory, integrity, and cleanup paths');

  const tests = Array.isArray(evidence.testCases) ? evidence.testCases : [];
  if (tests.length === 0) errors.push('testCases must include live validation cases');
  if (tests.some((test) => test?.passed !== true)) errors.push('all testCases must pass');

  for (const table of criticalTables) {
    if (!tests.some((test) => test?.table === table)) errors.push(`missing live RLS table coverage: ${table}`);
    requirePassedTest(tests, table, 'rls_enabled', errors);
    for (const operation of requiredCoverageOperations) requirePassedTest(tests, table, operation, errors);
    if (!tests.some((test) => test?.table === table && ['same_tenant_read', 'same_tenant_read_backend_only'].includes(test?.operation) && test?.passed === true)) {
      errors.push(`missing same-tenant read coverage: ${table}`);
    }
  }

  for (const table of ['documents', 'risks', 'vendors', 'tasks']) requirePassedTest(tests, table, 'same_tenant_insert', errors, `missing same-tenant insert coverage: ${table}`);
  for (const table of ['audit_events', 'subscriptions']) for (const operation of requiredBackendWriteDenyOperations) requirePassedTest(tests, table, operation, errors);
  for (const operation of requiredViewerAdminDenyOperations) requirePassedTest(tests, 'organization_members', operation, errors);

  if (!Array.isArray(evidence.testsRun) || evidence.testsRun.length !== tests.length) errors.push('testsRun must list every executed test case');
  else {
    const expected = tests.map((test) => `${test.table}:${test.operation}`);
    if (expected.some((name, index) => evidence.testsRun[index] !== name)) errors.push('testsRun must match every executed test case in order');
  }
  return { valid: errors.length === 0, errors };
}

export function buildEvidencePayload({ status, outcome, supabaseUrl, testCases = [], failures = [], tablesReviewed = tableCoverageFrom(testCases), registerUpdated = false, reviewer = process.env.RLS_LIVE_REVIEWER || process.env.GITHUB_ACTOR || 'security-automation', command = commandUsed(), commitSha = 'unknown', timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), serviceRolePaths = [], extra = {} }) {
  return {
    evidenceItem: 'supabase-live-rls-validation',
    status,
    outcome,
    timestamp,
    generatedAt: timestamp,
    runner,
    reviewer,
    reviewedAt: timestamp,
    commandUsed: command,
    commitSha,
    supabaseProjectReference: redactProjectReferenceFromUrl(supabaseUrl),
    supabaseProjectReferenceRedacted: true,
    summary: status === 'Complete' && outcome === 'passed' ? 'Live Supabase tenant-isolation validation passed.' : 'Live Supabase tenant-isolation validation did not pass.',
    redactionConfirmation: 'Supabase project reference, credentials, tokens, secrets, connection strings, and access-granting values are redacted.',
    evidenceLocations: ['docs/security/evidence/runtime/supabase-live-rls-validation.json'],
    productionGate: status === 'Complete' && outcome === 'passed' ? 'Enterprise release may proceed only if all other P0 runtime evidence is satisfied.' : 'Enterprise release remains blocked.',
    controlsVerified: status === 'Complete' && outcome === 'passed' ? ['RLS enabled on critical tenant tables', 'Cross-tenant access denied', 'Viewer admin actions denied'] : [],
    criticalTables,
    optionalTables,
    tablesReviewed,
    testsRun: testCases.map((test) => `${test.table}:${test.operation}`),
    testsPassed: testCases.filter((test) => test.passed === true).map((test) => `${test.table}:${test.operation}`),
    testsFailed: testCases.filter((test) => test.passed !== true).map((test) => `${test.table}:${test.operation}`),
    testCases,
    failures,
    serviceRolePaths,
    registerUpdated,
    completionRule: `Only ${runner} may mark this evidence Complete after a successful live run against the target Supabase project with current migrations applied.`,
    nextReviewDue: null,
    ...extra,
  };
}
