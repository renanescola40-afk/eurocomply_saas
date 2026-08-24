import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  GOVERNED_CHANGE_SET,
  backendOwnedTables,
  buildEvidencePayload,
  customerTenantTables,
  globalReferenceTables,
  requiredBackendWriteDenyOperations,
  requiredCoverageOperations,
  requiredGlobalReferenceOperations,
  requiredSameTenantReadOperations,
  requiredViewerAdminDenyOperations,
  sameTenantWritableTables,
} from '../../scripts/security/supabase-live-rls-evidence.mjs';
import { requiredHorizontalIsolationOperations } from '../../scripts/security/supabase-horizontal-rls-evidence.mjs';
import { buildSupabaseRlsScorecardEvidence } from '../../scripts/security/write-supabase-rls-scorecard-evidence.mjs';
import { validateSupabaseRlsScorecardEvidence } from '../../scripts/security/check-supabase-rls-scorecard-evidence.mjs';

const SHA = 'a'.repeat(40);
type EvidenceCase = { table: string; operation: string; passed: boolean };

type RuntimeEvidence = Record<string, unknown> & {
  commitSha: string;
  testCases: EvidenceCase[];
  githubActions: {
    generatedInGitHubActions: boolean;
    workflow: string;
    runId: string;
    runAttempt: string;
    runUrl: string;
    repository: string;
    commitSha: string;
    refName: string;
    actor: string;
    eventName: string;
    stampedAt: string;
  };
};

beforeEach(() => {
  process.env.PROMOTION_RUN_ID = '987654';
  process.env.PROMOTION_CHANGE_SET = GOVERNED_CHANGE_SET;
  process.env.PROMOTION_SELECTED_MIGRATION_COUNT = '31';
  process.env.PROMOTION_SELECTION_DIGEST = `sha256:${'b'.repeat(64)}`;
  process.env.PROMOTION_REMOTE_TRANSITION_VERIFIED = 'true';
  process.env.PROMOTION_UNAUTHORIZED_MIGRATION_APPLIED = 'false';
  process.env.PROMOTION_PRODUCTION_VERIFIED = 'true';
});

afterEach(() => {
  for (const key of Object.keys(process.env).filter((name) => name.startsWith('PROMOTION_'))) delete process.env[key];
});

function validSourceEvidence(): RuntimeEvidence {
  const testCases: EvidenceCase[] = [];
  const add = (table: string, operation: string) => testCases.push({ table, operation, passed: true });

  for (const table of customerTenantTables) {
    add(table, 'rls_enabled');
    for (const operation of requiredCoverageOperations) add(table, operation);
    add(table, backendOwnedTables.includes(table) ? 'same_tenant_read_backend_only' : requiredSameTenantReadOperations[0]);
  }
  for (const table of sameTenantWritableTables) add(table, 'same_tenant_insert');
  for (const table of backendOwnedTables) {
    for (const operation of requiredBackendWriteDenyOperations) add(table, operation);
  }
  for (const operation of requiredViewerAdminDenyOperations) add('organization_members', operation);
  for (const table of globalReferenceTables) {
    for (const operation of requiredGlobalReferenceOperations) add(table, operation);
  }
  // Release readiness also requires ai_assessments runtime coverage.
  for (const operation of ['rls_enabled', ...requiredCoverageOperations, 'same_tenant_read']) add('ai_assessments', operation);
  for (const [table, operations] of Object.entries(requiredHorizontalIsolationOperations)) {
    for (const operation of operations) add(table, operation);
  }

  const base = buildEvidencePayload({
    status: 'Complete',
    outcome: 'passed',
    supabaseUrl: 'https://synthetic-project.supabase.co',
    command: 'node scripts/security/run-supabase-live-tenant-isolation.mjs',
    commitSha: SHA,
    testCases,
    failures: [],
    serviceRolePaths: [
      { path: 'fixture_setup', purpose: 'synthetic setup' },
      { path: 'rls_inventory', purpose: 'live inventory' },
      { path: 'post_assertion_integrity_checks', purpose: 'integrity' },
      { path: 'fixture_cleanup', purpose: 'cleanup' },
    ],
    extra: {
      horizontalIsolation: {
        status: 'passed',
        sameTenantDistinctUsers: true,
        testedTables: Object.keys(requiredHorizontalIsolationOperations),
        checkedAt: '2026-08-24T12:00:00Z',
      },
      paymentFirstV20: {
        licensedTenantsProved: true,
        unlicensedSameTenantDenied: true,
        regulatoryUpdatesBackendOnly: true,
        providerEventsCreated: false,
        stripeLifecycleSynthesized: false,
      },
    },
  } as any) as RuntimeEvidence;

  return {
    ...base,
    githubActions: {
      generatedInGitHubActions: true,
      workflow: 'Supabase Live RLS Validation',
      runId: '12345',
      runAttempt: '1',
      runUrl: 'https://github.com/renanescola40-afk/eurocomply_saas/actions/runs/12345',
      repository: 'renanescola40-afk/eurocomply_saas',
      commitSha: SHA,
      refName: 'main',
      actor: 'github-actions[bot]',
      eventName: 'workflow_dispatch',
      stampedAt: '2026-08-24T12:00:00Z',
    },
  };
}

describe('Supabase RLS scorecard evidence after V21/31 promotion', () => {
  it('promotes exactly the five live tenant-isolation controls', () => {
    const evidence = buildSupabaseRlsScorecardEvidence(validSourceEvidence(), {
      expectedSha: SHA,
      generatedAt: '2026-08-24T12:05:00Z',
    });
    expect(evidence.status).toBe('Complete');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.controlsVerified).toEqual([
      'membershipIsolation',
      'crossTenantReadDenied',
      'crossTenantInsertDenied',
      'crossTenantUpdateDenied',
      'crossTenantDeleteDenied',
    ]);
    expect(validateSupabaseRlsScorecardEvidence(evidence, SHA)).toEqual({ passed: true, failures: [] });
  });

  it('fails closed when any required table operation is absent', () => {
    const source = validSourceEvidence();
    const incomplete = {
      ...source,
      testCases: source.testCases.filter((test) => !(test.table === 'documents' && test.operation === 'cross_tenant_update')),
    };
    const evidence = buildSupabaseRlsScorecardEvidence(incomplete, { expectedSha: SHA });
    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('not_verified');
    expect(evidence.checks.every((check) => check.passed !== true)).toBe(true);
  });

  it('maps canonical tenancy evidence to TEN-02 through TEN-06 only', () => {
    const controls = JSON.parse(readFileSync('docs/enterprise/controls.json', 'utf8'));
    const tenancy = controls.domains.find((domain: { id: string }) => domain.id === 'tenancy');
    const mapped = tenancy.controls.slice(1, 6);
    expect(mapped.map((control: { evidence: { path: string; check: string } }) => control.evidence)).toEqual([
      { path: 'docs/security/evidence/runtime/supabase-rls-validation.json', check: 'membershipIsolation' },
      { path: 'docs/security/evidence/runtime/supabase-rls-validation.json', check: 'crossTenantReadDenied' },
      { path: 'docs/security/evidence/runtime/supabase-rls-validation.json', check: 'crossTenantInsertDenied' },
      { path: 'docs/security/evidence/runtime/supabase-rls-validation.json', check: 'crossTenantUpdateDenied' },
      { path: 'docs/security/evidence/runtime/supabase-rls-validation.json', check: 'crossTenantDeleteDenied' },
    ]);
  });

  it('keeps exact-SHA retrieval in the terminal scorecard', () => {
    const scorecardWorkflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');
    expect(scorecardWorkflow).toContain('node scripts/enterprise/fetch-supabase-rls-evidence.mjs');
    expect(scorecardWorkflow).toContain('node scripts/security/write-supabase-rls-scorecard-evidence.mjs');
    expect(scorecardWorkflow).toContain('node scripts/security/check-supabase-rls-scorecard-evidence.mjs');
  });
});
