import crypto from 'node:crypto';

export const runner = 'scripts/security/run-supabase-live-tenant-isolation.mjs';
export const V20_CHANGE_SET = '2026-08-23-enterprise-data-plane-payment-first-closure-v20';
export const V20_EVIDENCE_SCHEMA = 'risck-comply.supabase-live-rls-validation.v20';

export const customerTenantTables = [
  'organizations',
  'organization_members',
  'ai_systems',
  'compliance_tasks',
  'documents',
  'risks',
  'vendors',
  'subscriptions',
  'audit_logs',
  'invitations',
  'onboarding_activation_runs',
  'monitoring_preferences',
  'profiles',
];

export const globalReferenceTables = ['regulatory_updates'];

export const criticalTables = [...customerTenantTables, ...globalReferenceTables];

export const optionalTables = [
  'tasks',
  'audit_events',
  'notifications',
  'ai_incidents',
  'organization_invites',
];

export const requiredCoverageOperations = [
  'cross_tenant_read',
  'cross_tenant_insert',
  'cross_tenant_update',
  'cross_tenant_delete',
];

export const requiredSameTenantReadOperations = [
  'same_tenant_read',
  'same_tenant_read_backend_only',
];

export const requiredBackendWriteDenyOperations = [
  'same_tenant_insert_denied',
  'same_tenant_update_denied',
  'same_tenant_delete_denied',
];

export const requiredViewerAdminDenyOperations = [
  'viewer_same_tenant_admin_insert_denied',
  'viewer_same_tenant_admin_update_denied',
  'viewer_same_tenant_admin_delete_denied',
];

export const backendOwnedTables = [
  'subscriptions',
  'audit_logs',
  'invitations',
];

export const sameTenantWritableTables = [
  'ai_systems',
  'compliance_tasks',
  'documents',
  'risks',
  'vendors',
  'onboarding_activation_runs',
  'monitoring_preferences',
];

// V20 payment-first intentionally retires authenticated direct reads from the
// global regulatory feed. The table is a paid product surface with no tenant key,
// so browser/PostgREST access must remain backend-owned.
export const requiredGlobalReferenceOperations = [
  'rls_enabled',
  'authenticated_read_denied',
  'authenticated_insert_denied',
  'authenticated_update_denied',
  'authenticated_delete_denied',
  'service_role_read_allowed',
];

export function commandUsed(argv = process.argv.slice(2)) {
  return `node ${runner}${argv.length > 0 ? ` ${argv.join(' ')}` : ''}`;
}

export function githubActionsProvenanceFromEnv(env = process.env) {
  const requiredEnv = [
    'GITHUB_SERVER_URL',
    'GITHUB_REPOSITORY',
    'GITHUB_RUN_ID',
    'GITHUB_SHA',
  ];

  if (env.GITHUB_ACTIONS !== 'true') return null;

  const missing = requiredEnv.filter((name) => !env[name]);
  if (missing.length > 0) return null;

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
  const projectRef = projectReferenceFromUrl(url);

  if (!projectRef) return 'redacted:unknown';

  const digest = crypto
    .createHash('sha256')
    .update(projectRef)
    .digest('hex')
    .slice(0, 16);

  return `redacted:sha256:${digest}`;
}

function hasAnyPassedOperation(testMap, operations) {
  return operations.some((operation) => testMap.get(operation) === true);
}

export function tableCoverageFrom(testCases) {
  const tables = testCases
    .map((test) => test.table)
    .filter((value, index, list) => value && list.indexOf(value) === index);

  return tables.map((table) => {
    const tableTests = testCases.filter((test) => test.table === table);
    const byOperation = new Map(
      tableTests.map((test) => [test.operation, test.passed === true]),
    );

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
        sameTenantReadAllowed: hasAnyPassedOperation(byOperation, requiredSameTenantReadOperations),
        sameTenantInsertAllowed:
          byOperation.get('same_tenant_insert') === true ||
          !sameTenantWritableTables.includes(table),
        backendWritesDenied:
          !backendOwnedTables.includes(table) ||
          requiredBackendWriteDenyOperations.every((operation) => byOperation.get(operation) === true),
        globalProductBackendOnly:
          !globalReferenceTables.includes(table) ||
          requiredGlobalReferenceOperations.every((operation) => byOperation.get(operation) === true),
      },
    };
  });
}

export function parseEvidenceJson(source) {
  try {
    return {
      evidence: JSON.parse(source),
      errors: [],
    };
  } catch (error) {
    return {
      evidence: null,
      errors: [`invalid JSON: ${error instanceof Error ? error.message : error}`],
    };
  }
}

function requirePassedTest(
  tests,
  table,
  operation,
  errors,
  message = `missing live RLS operation coverage: ${table}:${operation}`,
) {
  if (
    !tests.some(
      (test) =>
        test?.table === table &&
        test?.operation === operation &&
        test?.passed === true,
    )
  ) {
    errors.push(message);
  }
}

function requireAnyPassedTest(tests, table, operations, errors) {
  if (
    !operations.some((operation) =>
      tests.some(
        (test) =>
          test?.table === table &&
          test?.operation === operation &&
          test?.passed === true,
      ),
    )
  ) {
    errors.push(`missing live RLS operation coverage: ${table}:${operations.join('|')}`);
  }
}

function validateV20PromotionLineage(evidence, errors) {
  if (evidence?.schema !== V20_EVIDENCE_SCHEMA) {
    errors.push('V20 live RLS evidence schema is invalid');
  }
  const lineage = evidence?.promotionLineage;
  if (!lineage || typeof lineage !== 'object' || Array.isArray(lineage)) {
    errors.push('promotionLineage is required');
    return;
  }
  if (!/^\d+$/.test(String(lineage.promotionRunId ?? ''))) {
    errors.push('promotionLineage.promotionRunId must be numeric');
  }
  if (lineage.changeSet !== V20_CHANGE_SET) {
    errors.push('promotionLineage.changeSet must be the governed V20 change set');
  }
  if (Number(lineage.selectedMigrationCount) !== 27) {
    errors.push('promotionLineage.selectedMigrationCount must be 27');
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(String(lineage.selectionDigest ?? ''))) {
    errors.push('promotionLineage.selectionDigest must be a SHA-256 selection digest');
  }
  if (lineage.remoteAfterEqualsBeforePlusSelected !== true) {
    errors.push('promotionLineage must prove the exact remote ledger transition');
  }
  if (lineage.unauthorizedMigrationApplied !== false) {
    errors.push('promotionLineage must prove no unauthorized migration was applied');
  }
  if (lineage.productionPromotionVerified !== true) {
    errors.push('promotionLineage.productionPromotionVerified must be true');
  }
}

export function validatePassingEvidence(evidence) {
  const errors = [];

  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return {
      valid: false,
      errors: ['evidence must be an object'],
    };
  }

  validateV20PromotionLineage(evidence, errors);

  if (evidence.evidenceItem !== 'supabase-live-rls-validation') {
    errors.push('unexpected evidence item');
  }

  if (evidence.status !== 'Complete') {
    errors.push('status must be Complete');
  }

  if (evidence.outcome !== 'passed') {
    errors.push('outcome must be passed');
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(String(evidence.timestamp ?? ''))) {
    errors.push('timestamp must be UTC ISO-8601 seconds');
  }

  if (!String(evidence.reviewer ?? '').trim()) {
    errors.push('reviewer is required');
  }

  if (!String(evidence.commandUsed ?? '').includes(runner)) {
    errors.push('commandUsed must include the live tenant-isolation runner');
  }

  if (!/^[a-f0-9]{40}$/i.test(String(evidence.commitSha ?? ''))) {
    errors.push('commitSha must be a full 40-character SHA');
  }

  if (evidence.supabaseProjectReferenceRedacted !== true) {
    errors.push('supabaseProjectReferenceRedacted must be true');
  }

  if (!String(evidence.supabaseProjectReference ?? '').startsWith('redacted:')) {
    errors.push('supabaseProjectReference must be redacted');
  }

  if (!Array.isArray(evidence.failures)) {
    errors.push('failures must be an array');
  } else if (evidence.failures.length > 0) {
    errors.push('passing evidence must not contain failures');
  }

  if (!Array.isArray(evidence.testsPassed)) {
    errors.push('testsPassed must be an array');
  }

  if (!Array.isArray(evidence.testsFailed)) {
    errors.push('testsFailed must be an array');
  } else if (evidence.testsFailed.length > 0) {
    errors.push('passing evidence must not contain failed tests');
  }

  if (!Array.isArray(evidence.serviceRolePaths) || evidence.serviceRolePaths.length < 4) {
    errors.push('serviceRolePaths must document privileged setup, inventory, integrity, and cleanup paths');
  }

  const tests = Array.isArray(evidence.testCases) ? evidence.testCases : [];

  if (tests.length === 0) {
    errors.push('testCases must include live validation cases');
  }

  if (tests.some((test) => test?.passed !== true)) {
    errors.push('all testCases must pass');
  }

  for (const table of customerTenantTables) {
    requirePassedTest(tests, table, 'rls_enabled', errors);
    for (const operation of requiredCoverageOperations) {
      requirePassedTest(tests, table, operation, errors);
    }
    requireAnyPassedTest(tests, table, requiredSameTenantReadOperations, errors);
  }

  for (const table of sameTenantWritableTables) {
    requirePassedTest(tests, table, 'same_tenant_insert', errors);
  }

  for (const table of backendOwnedTables) {
    for (const operation of requiredBackendWriteDenyOperations) {
      requirePassedTest(tests, table, operation, errors);
    }
  }

  for (const operation of requiredViewerAdminDenyOperations) {
    requirePassedTest(tests, 'organization_members', operation, errors);
  }

  for (const table of globalReferenceTables) {
    for (const operation of requiredGlobalReferenceOperations) {
      requirePassedTest(tests, table, operation, errors);
    }
  }

  if (!Array.isArray(evidence.testsRun) || evidence.testsRun.length !== tests.length) {
    errors.push('testsRun must list every executed test case');
  } else {
    const expected = tests.map((test) => `${test.table}:${test.operation}`);

    if (expected.some((name, index) => evidence.testsRun[index] !== name)) {
      errors.push('testsRun must match every executed test case in order');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildEvidencePayload({
  status,
  outcome,
  supabaseUrl,
  testCases = [],
  failures = [],
  tablesReviewed = tableCoverageFrom(testCases),
  registerUpdated = false,
  reviewer = process.env.RLS_LIVE_REVIEWER || process.env.GITHUB_ACTOR || 'security-automation',
  command = commandUsed(),
  commitSha = 'unknown',
  timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  serviceRolePaths = [],
  extra = {},
}) {
  const githubActions = githubActionsProvenanceFromEnv();
  const promotionRunId = String(process.env.PROMOTION_RUN_ID ?? '').trim();
  const selectionDigest = String(process.env.PROMOTION_SELECTION_DIGEST ?? '').trim();
  const changeSet = String(process.env.PROMOTION_CHANGE_SET ?? V20_CHANGE_SET).trim();
  const selectedMigrationCount = Number(process.env.PROMOTION_SELECTED_MIGRATION_COUNT ?? 0);

  return {
    schema: V20_EVIDENCE_SCHEMA,
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
    promotionLineage: {
      promotionRunId,
      changeSet,
      selectedMigrationCount,
      selectionDigest,
      remoteAfterEqualsBeforePlusSelected: process.env.PROMOTION_REMOTE_TRANSITION_VERIFIED === 'true',
      unauthorizedMigrationApplied: process.env.PROMOTION_UNAUTHORIZED_MIGRATION_APPLIED === 'true',
      productionPromotionVerified: process.env.PROMOTION_PRODUCTION_VERIFIED === 'true',
    },
    supabaseProjectReference: redactProjectReferenceFromUrl(supabaseUrl),
    supabaseProjectReferenceRedacted: true,
    summary:
      status === 'Complete' && outcome === 'passed'
        ? 'Live Supabase post-V20 RLS validation passed for tenant tables, profiles, payment-first boundaries, and the backend-owned regulatory feed.'
        : 'Live Supabase post-V20 tenant-isolation RLS validation did not pass.',
    redactionConfirmation:
      'Supabase project reference, credentials, tokens, secrets, connection strings, and access-granting values are redacted.',
    evidenceLocations: [
      'docs/security/evidence/runtime/supabase-live-rls-validation.json',
    ],
    productionGate:
      status === 'Complete' && outcome === 'passed'
        ? 'P0 production release may proceed only if all other P0 runtime evidence is satisfied.'
        : 'P0 production release remains blocked.',
    controlsVerified:
      status === 'Complete' && outcome === 'passed'
        ? [
            'RLS enabled on customer, profiles, and product tables',
            'Tenant A cannot read Tenant B rows',
            'Tenant A cannot insert Tenant B scoped rows',
            'Tenant A cannot update Tenant B rows',
            'Tenant A cannot delete Tenant B rows',
            'Owner/admin/member behavior verified',
            'Backend-owned tables are not client-writable',
            'Regulatory updates are backend-only after payment-first V20',
            'Evidence is bound to the successful exact-SHA 27/27 Production promotion',
          ]
        : [],
    customerTenantTables,
    globalReferenceTables,
    criticalTables,
    optionalTables,
    tablesReviewed,
    testsRun: testCases.map((test) => `${test.table}:${test.operation}`),
    testsPassed: testCases
      .filter((test) => test.passed === true)
      .map((test) => `${test.table}:${test.operation}`),
    testsFailed: testCases
      .filter((test) => test.passed !== true)
      .map((test) => `${test.table}:${test.operation}`),
    testCases,
    failures,
    serviceRolePaths,
    registerUpdated,
    completionRule: `Only ${runner} may mark this evidence Complete after a successful promotion-bound live tenant-isolation RLS run against the target Supabase project.`,
    nextReviewDue: null,
    ...(githubActions ? { githubActions } : {}),
    ...extra,
  };
}
