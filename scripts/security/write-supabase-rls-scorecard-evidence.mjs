#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  customerTenantTables,
  requiredSameTenantReadOperations,
  requiredViewerAdminDenyOperations,
} from './supabase-live-rls-evidence.mjs';
import {
  CANONICAL_REPOSITORY,
  validateSupabaseRlsRuntimeEvidence,
} from './check-supabase-rls-runtime-evidence.mjs';

const DEFAULT_SOURCE = 'docs/security/evidence/runtime/supabase-live-rls-validation.json';
const DEFAULT_OUTPUT = 'docs/security/evidence/runtime/supabase-rls-validation.json';
const SCORECARD_CHECKS = [
  'membershipIsolation',
  'crossTenantReadDenied',
  'crossTenantInsertDenied',
  'crossTenantUpdateDenied',
  'crossTenantDeleteDenied',
];

function hasPassed(testCases, table, operation) {
  return testCases.some(
    (test) => test?.table === table && test?.operation === operation && test?.passed === true,
  );
}

function hasAnyPassed(testCases, table, operations) {
  return operations.some((operation) => hasPassed(testCases, table, operation));
}

function pass(name, passed, reason) {
  return passed
    ? { name, passed: true }
    : { name, status: 'NOT_VERIFIED', reason };
}

function allTenantTablesPass(testCases, operation) {
  return customerTenantTables.every((table) => hasPassed(testCases, table, operation));
}

export function buildSupabaseRlsScorecardEvidence(
  source,
  {
    generatedAt = new Date().toISOString(),
    sourcePath = DEFAULT_SOURCE,
    expectedSha = source?.commitSha || '',
  } = {},
) {
  const runId = String(source?.githubActions?.runId || '');
  const validation = validateSupabaseRlsRuntimeEvidence(source, {
    expectedSha,
    repository: CANONICAL_REPOSITORY,
    runId,
  });
  const trusted = validation.passed;
  const testCases = Array.isArray(source?.testCases) ? source.testCases : [];

  const membershipIsolation = trusted
    && hasPassed(testCases, 'organization_members', 'rls_enabled')
    && hasPassed(testCases, 'organization_members', 'cross_tenant_read')
    && hasPassed(testCases, 'organization_members', 'cross_tenant_insert')
    && hasPassed(testCases, 'organization_members', 'cross_tenant_update')
    && hasPassed(testCases, 'organization_members', 'cross_tenant_delete')
    && hasAnyPassed(testCases, 'organization_members', requiredSameTenantReadOperations)
    && requiredViewerAdminDenyOperations.every((operation) =>
      hasPassed(testCases, 'organization_members', operation));

  const canonicalChecks = [
    pass('membershipIsolation', membershipIsolation, 'Trusted organization-membership isolation proof is unavailable.'),
    pass('crossTenantReadDenied', trusted && allTenantTablesPass(testCases, 'cross_tenant_read'), 'Trusted cross-tenant read denial proof is unavailable for every customer tenant table.'),
    pass('crossTenantInsertDenied', trusted && allTenantTablesPass(testCases, 'cross_tenant_insert'), 'Trusted cross-tenant insert denial proof is unavailable for every customer tenant table.'),
    pass('crossTenantUpdateDenied', trusted && allTenantTablesPass(testCases, 'cross_tenant_update'), 'Trusted cross-tenant update denial proof is unavailable for every customer tenant table.'),
    pass('crossTenantDeleteDenied', trusted && allTenantTablesPass(testCases, 'cross_tenant_delete'), 'Trusted cross-tenant delete denial proof is unavailable for every customer tenant table.'),
  ];

  const verified = canonicalChecks
    .filter((check) => check.passed === true)
    .map((check) => check.name);
  const allPassed = verified.length === SCORECARD_CHECKS.length;
  const anyPassed = verified.length > 0;

  return {
    schema: 'risck-comply.supabase-rls-scorecard-evidence.v1',
    evidenceItem: 'supabase-rls-validation',
    status: allPassed ? 'Complete' : 'Open',
    outcome: allPassed ? 'passed' : anyPassed ? 'partial' : 'not_verified',
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected runtime automation',
    repository: trusted ? source.githubActions.repository : CANONICAL_REPOSITORY,
    branch: trusted ? source.githubActions.refName : null,
    targetSha: trusted ? source.commitSha : null,
    checkedOutSha: trusted ? source.githubActions.commitSha : null,
    sourceEvidence: {
      path: sourcePath,
      trusted,
      validationFailures: trusted ? [] : validation.failures,
      schema: source?.evidenceItem ?? null,
      generatedAt: source?.generatedAt ?? source?.timestamp ?? null,
      githubRunId: trusted ? runId : null,
      projectReferenceRedacted: source?.supabaseProjectReferenceRedacted === true,
    },
    checks: canonicalChecks,
    controlsVerified: verified,
    remainingControls: SCORECARD_CHECKS.filter((name) => !verified.includes(name)),
    failures: trusted ? [] : validation.failures,
    tableScope: {
      customerTenantTables,
      count: customerTenantTables.length,
    },
    summary: allPassed
      ? 'Live exact-SHA Supabase proof validated organization membership isolation and cross-tenant read, insert, update, and delete denial across every customer tenant table.'
      : anyPassed
        ? `Trusted live RLS evidence validates ${verified.join(', ')}. Remaining tenancy controls stay NOT_VERIFIED.`
        : 'No trusted exact-SHA Supabase RLS evidence is available. Enterprise tenancy controls remain blocked.',
    productionGate: allPassed ? 'eligible for downstream enterprise gates' : 'blocked',
    evidenceLocations: [
      sourcePath,
      'scripts/security/run-supabase-live-tenant-isolation.mjs',
      'scripts/security/write-supabase-rls-scorecard-evidence.mjs',
      '.github/workflows/supabase-live-rls-validation.yml',
    ],
    evidenceBoundary: 'This artifact promotes only tenant-isolation operations executed against the configured Supabase project with synthetic fixtures on the exact current main SHA. It does not prove backup restoration, storage isolation, export isolation, audit-chain isolation, or every future table.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      runtimeProofInvented: false,
      rawCredentialsStored: false,
      accessTokensStored: false,
      cookiesStored: false,
      userIdentifiersStored: false,
      organizationIdentifiersStored: false,
      rawProviderResponsesStored: false,
      projectReferenceRedacted: source?.supabaseProjectReferenceRedacted === true,
      exactShaBound: trusted,
    },
  };
}

export function writeSupabaseRlsScorecardEvidence({
  sourcePath = process.env.SUPABASE_RLS_SOURCE_EVIDENCE_PATH || DEFAULT_SOURCE,
  outputPath = process.env.SUPABASE_RLS_SCORECARD_EVIDENCE_PATH || DEFAULT_OUTPUT,
  expectedSha = process.env.ENTERPRISE_EXPECTED_SHA || process.env.TARGET_SHA || process.env.GITHUB_SHA || '',
  generatedAt = new Date().toISOString(),
} = {}) {
  const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
  const evidence = buildSupabaseRlsScorecardEvidence(source, {
    generatedAt,
    sourcePath,
    expectedSha,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Supabase RLS scorecard evidence: ${evidence.status}/${evidence.outcome}`);
  return evidence;
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  writeSupabaseRlsScorecardEvidence();
}
