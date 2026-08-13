import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
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

type EvidenceCase = {
  table: string;
  operation: string;
  passed: boolean;
};

type ServiceRolePath = {
  path: string;
  purpose: string;
};

type EvidencePayloadInput = {
  status: string;
  outcome: string;
  supabaseUrl: string;
  command: string;
  commitSha: string;
  testCases: EvidenceCase[];
  failures: string[];
  serviceRolePaths: ServiceRolePath[];
};

type GithubActionsProvenance = {
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

type RuntimeEvidence = Record<string, unknown> & {
  commitSha: string;
  testCases: EvidenceCase[];
  githubActions: GithubActionsProvenance;
  supabaseProjectReference: string;
  supabaseProjectReferenceRedacted: boolean;
};

const buildTypedEvidencePayload = buildEvidencePayload as unknown as (
  input: EvidencePayloadInput,
) => Record<string, unknown> & {
  commitSha: string;
  testCases: EvidenceCase[];
  supabaseProjectReference: string;
  supabaseProjectReferenceRedacted: boolean;
};

function passingCase(table: string, operation: string): EvidenceCase {
  return { table, operation, passed: true };
}

function appendHorizontalPassingCases(testCases: EvidenceCase[]) {
  for (const [table, operations] of Object.entries(requiredHorizontalIsolationOperations)) {
    for (const operation of operations) testCases.push(passingCase(table, operation));
  }
}

function validSourceEvidence(): RuntimeEvidence {
  const testCases: EvidenceCase[] = [];

  for (const table of customerTenantTables) {
    testCases.push(passingCase(table, 'rls_enabled'));
    for (const operation of requiredCoverageOperations) {
      testCases.push(passingCase(table, operation));
    }
    testCases.push(passingCase(table, requiredSameTenantReadOperations[0]));
  }
  for (const table of sameTenantWritableTables) {
    testCases.push(passingCase(table, 'same_tenant_insert'));
  }
  for (const table of backendOwnedTables) {
    for (const operation of requiredBackendWriteDenyOperations) {
      testCases.push(passingCase(table, operation));
    }
  }
  for (const operation of requiredViewerAdminDenyOperations) {
    testCases.push(passingCase('organization_members', operation));
  }
  for (const table of globalReferenceTables) {
    for (const operation of requiredGlobalReferenceOperations) {
      testCases.push(passingCase(table, operation));
    }
  }

  // The dedicated workflow appends the same-tenant proof before provenance is stamped.
  appendHorizontalPassingCases(testCases);

  // The dedicated workflow appends the ai_assessments proof in
  // run-supabase-live-ai-assessments-rls.mjs before provenance is stamped.
  // Keep the synthetic source fixture faithful to that final artifact shape.
  for (const operation of [
    'rls_enabled',
    'cross_tenant_read',
    'cross_tenant_insert',
    'cross_tenant_update',
    'cross_tenant_delete',
    'same_tenant_read',
  ]) {
    testCases.push(passingCase('ai_assessments', operation));
  }

  const base = buildTypedEvidencePayload({
    status: 'Complete',
    outcome: 'passed',
    supabaseUrl: 'https://synthetic-project.supabase.co',
    command: 'node scripts/security/run-supabase-live-tenant-isolation.mjs',
    commitSha: SHA,
    testCases,
    failures: [],
    serviceRolePaths: [
      { path: 'fixture_setup', purpose: 'synthetic fixture setup' },
      { path: 'rls_inventory', purpose: 'live inventory' },
      { path: 'post_assertion_integrity_checks', purpose: 'integrity checks' },
      { path: 'fixture_cleanup', purpose: 'synthetic fixture cleanup' },
    ],
  });

  return {
    ...base,
    generatedAt: '2026-08-09T13:00:00Z',
    reviewedAt: '2026-08-09T13:00:00Z',
    timestamp: '2026-08-09T13:00:00Z',
    horizontalIsolation: {
      status: 'passed',
      sameTenantDistinctUsers: true,
      testedTables: Object.keys(requiredHorizontalIsolationOperations),
      checkedAt: '2026-08-09T13:00:00Z',
    },
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
      eventName: 'push',
      stampedAt: '2026-08-09T13:00:00.000Z',
    },
  };
}

describe('Supabase RLS exact-SHA runtime evidence', () => {
  it('selects only a successful exact-main-SHA run from the canonical workflow path', () => {
    const selected = selectExactShaRun([
      { id: 1, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'failure', updated_at: '2026-08-09T12:00:00Z' },
      { id: 2, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'feature', status: 'completed', conclusion: 'success', updated_at: '2026-08-09T12:10:00Z' },
      { id: 3, path: '.github/workflows/other.yml', head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-08-09T12:20:00Z' },
      { id: RUN_ID, name: `Supabase live RLS proof for ${SHA}`, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-08-09T13:00:00Z' },
    ], SHA);

    expect(selected?.id).toBe(RUN_ID);
    expect(selectExactShaRun([selected], SHA, '999')).toBeNull();
  });

  it('accepts complete redacted exact-SHA source evidence', () => {
    expect(validateDownloadedEvidence(validSourceEvidence(), {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
    })).toEqual({ passed: true, failures: [] });
  });

  it('adapts trusted producer provenance into the release validator contract without promoting new facts', () => {
    const normalized = normalizeSupabaseRlsEvidenceForRelease(validSourceEvidence(), {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
      now: new Date('2026-08-11T13:00:00Z'),
    });

    expect(normalized.githubActions).toMatchObject({
      workflow: 'Supabase Live RLS Validation',
      runId: String(RUN_ID),
      repository: REPOSITORY,
      commitSha: SHA,
      refName: 'main',
      eventName: 'push',
    });
    expect(normalized.runtimeContext).toEqual({
      generatedByGithubActions: true,
      repository: REPOSITORY,
      branch: 'main',
      githubRunId: String(RUN_ID),
      githubRunAttempt: '1',
      commitSha: SHA,
    });
    expect(normalized.evidenceIntegrity).toMatchObject({
      containsSensitiveValues: false,
      credentialsStored: false,
      exactShaBound: true,
      sourceRunBound: true,
    });
    expect(validateReleaseSupabaseRlsRuntimeEvidence(normalized, {
      now: new Date('2026-08-11T13:00:00Z'),
      expectedRepository: REPOSITORY,
      expectedBranch: 'main',
    })).toEqual([]);
  });

  it('refuses release normalization when the source proof is stale', () => {
    expect(() => normalizeSupabaseRlsEvidenceForRelease(validSourceEvidence(), {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
      now: new Date('2026-08-20T13:00:00Z'),
    })).toThrow('release_runtime_evidence_invalid');
  });

  it('closes the authoritative P0 Supabase entry with the producer provenance shape', () => {
    const entry = p0EvidenceCatalog.find((candidate) => candidate.item === 'Supabase live RLS validation completed');
    const validator = entry?.validator;
    expect(validator).toBeDefined();
    if (!validator) throw new Error('Supabase P0 validator missing');
    expect(validator(validSourceEvidence(), {
      expectedRepository: REPOSITORY,
      expectedBranch: 'main',
      expectedCommitSha: SHA,
    })).toEqual([]);
  });

  it('rejects stale, branch-mismatched, partial, or unredacted evidence', () => {
    const source = validSourceEvidence();
    expect(validateDownloadedEvidence({ ...source, commitSha: 'b'.repeat(40) }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({
      ...source,
      githubActions: { ...source.githubActions, refName: 'feature' },
    }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
    }).passed).toBe(false);

    const failedTests = source.testCases.map((test, index) => index === 0 ? { ...test, passed: false } : test);
    expect(validateDownloadedEvidence({ ...source, testCases: failedTests }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({
      ...source,
      supabaseProjectReference: 'synthetic-project',
      supabaseProjectReferenceRedacted: false,
    }, {
      targetSha: SHA,
      repository: REPOSITORY,
      runId: RUN_ID,
    }).passed).toBe(false);
  });

  it('uses a read-only protected workflow and never commits runtime evidence', () => {
    const workflow = readFileSync('.github/workflows/supabase-live-rls-validation.yml', 'utf8');
    const fetcher = readFileSync('scripts/enterprise/fetch-supabase-rls-evidence.mjs', 'utf8');
    const catalog = readFileSync('scripts/security/p0-runtime-evidence-catalog.mjs', 'utf8');

    expect(workflow).toContain('push:\n    branches: [main]');
    expect(workflow).toContain('environment: supabase-live-rls-validation');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain("RLS_LIVE_UPDATE_REGISTER: '0'");
    expect(workflow).toContain('supabase-live-rls-runtime-proof-${{ env.TARGET_SHA }}');
    expect(workflow).toContain('Append same-tenant horizontal isolation proof');
    expect(workflow).not.toContain('git push');
    expect(workflow).not.toContain('gh pr create');
    expect(workflow).not.toContain('pull_request_target');
    expect(fetcher).toContain("const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`");
    expect(fetcher).toContain('run?.path === WORKFLOW_PATH');
    expect(fetcher).toContain('normalizeSupabaseRlsEvidenceForRelease');
    expect(catalog).toContain('validateSupabaseProducerEvidence');
    expect(catalog).not.toContain("validateSupabaseRlsRuntimeEvidence } from '../release/validate-supabase-rls-runtime-evidence.mjs'");
  });
});
