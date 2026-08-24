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
  requiredViewerAdminDenyOperations,
  sameTenantWritableTables,
} from '../../scripts/security/supabase-live-rls-evidence.mjs';
import { requiredHorizontalIsolationOperations } from '../../scripts/security/supabase-horizontal-rls-evidence.mjs';
import {
  normalizeSupabaseRlsEvidenceForRelease,
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-supabase-rls-evidence.mjs';
import { validateSupabaseRlsRuntimeEvidence as validateReleaseSupabaseRlsRuntimeEvidence } from '../../scripts/release/validate-supabase-rls-runtime-evidence.mjs';
import { p0EvidenceCatalog } from '../../scripts/security/p0-runtime-evidence-catalog.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = 12345;
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const WORKFLOW_PATH = '.github/workflows/supabase-live-rls-validation.yml';
type EvidenceCase = { table: string; operation: string; passed: boolean };

beforeEach(() => {
  process.env.PROMOTION_RUN_ID = '777777';
  process.env.PROMOTION_CHANGE_SET = GOVERNED_CHANGE_SET;
  process.env.PROMOTION_SELECTED_MIGRATION_COUNT = '31';
  process.env.PROMOTION_SELECTION_DIGEST = `sha256:${'c'.repeat(64)}`;
  process.env.PROMOTION_REMOTE_TRANSITION_VERIFIED = 'true';
  process.env.PROMOTION_UNAUTHORIZED_MIGRATION_APPLIED = 'false';
  process.env.PROMOTION_PRODUCTION_VERIFIED = 'true';
});

afterEach(() => {
  for (const key of Object.keys(process.env).filter((name) => name.startsWith('PROMOTION_'))) delete process.env[key];
});

function add(testCases: EvidenceCase[], table: string, operation: string) {
  testCases.push({ table, operation, passed: true });
}

function validSourceEvidence() {
  const testCases: EvidenceCase[] = [];
  for (const table of customerTenantTables) {
    add(testCases, table, 'rls_enabled');
    for (const operation of requiredCoverageOperations) add(testCases, table, operation);
    add(testCases, table, backendOwnedTables.includes(table) ? 'same_tenant_read_backend_only' : 'same_tenant_read');
  }
  for (const table of sameTenantWritableTables) add(testCases, table, 'same_tenant_insert');
  for (const table of backendOwnedTables) {
    for (const operation of requiredBackendWriteDenyOperations) add(testCases, table, operation);
  }
  for (const operation of requiredViewerAdminDenyOperations) add(testCases, 'organization_members', operation);
  for (const table of globalReferenceTables) {
    for (const operation of requiredGlobalReferenceOperations) add(testCases, table, operation);
  }
  for (const operation of ['rls_enabled', ...requiredCoverageOperations, 'same_tenant_read']) add(testCases, 'ai_assessments', operation);
  for (const [table, operations] of Object.entries(requiredHorizontalIsolationOperations)) {
    for (const operation of operations) add(testCases, table, operation);
  }

  const base = buildEvidencePayload({
    status: 'Complete',
    outcome: 'passed',
    supabaseUrl: 'https://synthetic-project.supabase.co',
    command: 'node scripts/security/run-supabase-live-tenant-isolation.mjs',
    commitSha: SHA,
    timestamp: '2026-08-24T13:00:00Z',
    testCases,
    failures: [],
    serviceRolePaths: [
      { path: 'fixture_setup', purpose: 'synthetic setup' },
      { path: 'rls_inventory', purpose: 'live inventory' },
      { path: 'post_assertion_integrity_checks', purpose: 'integrity' },
      { path: 'fixture_cleanup', purpose: 'cleanup' },
    ],
    extra: {
      horizontalIsolation: { status: 'passed', sameTenantDistinctUsers: true, testedTables: Object.keys(requiredHorizontalIsolationOperations), checkedAt: '2026-08-24T13:00:00Z' },
      paymentFirstV20: { licensedTenantsProved: true, unlicensedSameTenantDenied: true, regulatoryUpdatesBackendOnly: true, providerEventsCreated: false, stripeLifecycleSynthesized: false },
      evidenceVaultV20: { unlicensedMetadataInsertDenied: true, privateBucketProved: true, orphanStorageInsertDenied: true },
    },
  } as any);

  return {
    ...base,
    githubActions: {
      generatedInGitHubActions: true,
      workflow: 'Supabase Live RLS Validation',
      runId: String(RUN_ID),
      runAttempt: '1',
      runUrl: `https://github.com/${REPOSITORY}/actions/runs/${RUN_ID}`,
      repository: REPOSITORY,
      commitSha: SHA,
      refName: 'main',
      actor: 'github-actions[bot]',
      eventName: 'workflow_dispatch',
      stampedAt: '2026-08-24T13:00:00Z',
    },
  };
}

describe('Supabase V21 exact-SHA runtime evidence fetch', () => {
  it('selects only a successful exact-main-SHA canonical workflow run', () => {
    const selected = selectExactShaRun([
      { id: 1, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'failure', updated_at: '2026-08-24T12:00:00Z' },
      { id: 2, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'feature', status: 'completed', conclusion: 'success', updated_at: '2026-08-24T12:10:00Z' },
      { id: RUN_ID, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-08-24T13:00:00Z' },
    ], SHA);
    expect(selected?.id).toBe(RUN_ID);
    expect(selectExactShaRun([selected], SHA, '999')).toBeNull();
  });

  it('accepts promotion-bound source evidence and normalizes it for release', () => {
    const source = validSourceEvidence();
    expect(validateDownloadedEvidence(source, { targetSha: SHA, repository: REPOSITORY, runId: RUN_ID })).toEqual({ passed: true, failures: [] });
    const normalized = normalizeSupabaseRlsEvidenceForRelease(source, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
      now: new Date('2026-08-25T13:00:00Z'),
    });
    expect(normalized.runtimeContext).toMatchObject({ generatedByGithubActions: true, repository: REPOSITORY, branch: 'main', githubRunId: String(RUN_ID), commitSha: SHA });
    expect(normalized.evidenceIntegrity).toMatchObject({ containsSensitiveValues: false, credentialsStored: false, exactShaBound: true, sourceRunBound: true });
    expect(validateReleaseSupabaseRlsRuntimeEvidence(normalized, { now: new Date('2026-08-25T13:00:00Z'), expectedRepository: REPOSITORY, expectedBranch: 'main' })).toEqual([]);
  });

  it('rejects stale or lineage-invalid evidence', () => {
    expect(() => normalizeSupabaseRlsEvidenceForRelease(validSourceEvidence(), {
      targetSha: SHA, repository: REPOSITORY, runId: RUN_ID, now: new Date('2026-09-10T13:00:00Z'),
    })).toThrow('release_runtime_evidence_invalid');
    const invalid = validSourceEvidence();
    invalid.promotionLineage.selectedMigrationCount = 30;
    expect(validateDownloadedEvidence(invalid, { targetSha: SHA, repository: REPOSITORY, runId: RUN_ID }).passed).toBe(false);
  });

  it('keeps the authoritative P0 catalog validator compatible', () => {
    const entry = p0EvidenceCatalog.find((candidate) => candidate.item === 'Supabase live RLS validation completed');
    expect(entry?.validator).toBeDefined();
    expect(entry?.validator?.(validSourceEvidence(), { expectedRepository: REPOSITORY, expectedBranch: 'main', expectedCommitSha: SHA })).toEqual([]);
  });

  it('uses a dispatch-only V21/31 promotion-bound workflow with no migration path', () => {
    const workflow = readFileSync('.github/workflows/supabase-live-rls-validation.yml', 'utf8');
    const fetcher = readFileSync('scripts/enterprise/fetch-supabase-rls-evidence.mjs', 'utf8');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\s{2}push:/m);
    expect(workflow).toContain('promotion_run_id:');
    expect(workflow).toContain('EXECUTE_POST_V21_RUNTIME_PROOF');
    expect(workflow).toContain('supabase-forward-production-promotion-${TARGET_SHA}');
    expect(workflow).toContain('selectedMigrationCount == 31');
    expect(workflow).toContain('environment: supabase-live-rls-validation');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('apply_migrations');
    expect(workflow).not.toContain('SUPABASE_DB_URL');
    expect(workflow).not.toMatch(/\bpsql\b/);
    expect(workflow).not.toContain('db push');
    expect(workflow).not.toContain('git push');
    expect(fetcher).toContain("const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`");
    expect(fetcher).toContain('run?.path === WORKFLOW_PATH');
  });
});
