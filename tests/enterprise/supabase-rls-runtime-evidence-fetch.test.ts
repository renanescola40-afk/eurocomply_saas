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
import {
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-supabase-rls-evidence.mjs';

const SHA = 'a'.repeat(40);
const RUN_ID = 12345;

function passingCase(table: string, operation: string) {
  return { table, operation, passed: true };
}

function validSourceEvidence() {
  const testCases: Array<{ table: string; operation: string; passed: boolean }> = [];

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

  return {
    ...buildEvidencePayload({
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
    }),
    githubActions: {
      generatedInGitHubActions: true,
      workflow: 'Supabase Live RLS Validation',
      runId: String(RUN_ID),
      runAttempt: '1',
      runUrl: `https://github.com/renanescola40-afk/eurocomply_saas/actions/runs/${RUN_ID}`,
      repository: 'renanescola40-afk/eurocomply_saas',
      commitSha: SHA,
      refName: 'main',
      actor: 'github-actions[bot]',
      eventName: 'push',
      stampedAt: '2026-07-18T00:00:00.000Z',
    },
  };
}

describe('Supabase RLS exact-SHA runtime evidence', () => {
  it('selects only a successful exact-main-SHA run', () => {
    const selected = selectExactShaRun([
      { id: 1, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'failure', updated_at: '2026-07-18T00:00:00Z' },
      { id: 2, head_sha: SHA, head_branch: 'feature', status: 'completed', conclusion: 'success', updated_at: '2026-07-18T01:00:00Z' },
      { id: RUN_ID, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-07-18T02:00:00Z' },
    ], SHA);

    expect(selected?.id).toBe(RUN_ID);
    expect(selectExactShaRun([selected], SHA, '999')).toBeNull();
  });

  it('accepts complete redacted exact-SHA source evidence', () => {
    expect(validateDownloadedEvidence(validSourceEvidence(), {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: RUN_ID,
    })).toEqual({ passed: true, failures: [] });
  });

  it('rejects stale, branch-mismatched, partial, or unredacted evidence', () => {
    const source = validSourceEvidence();
    expect(validateDownloadedEvidence({ ...source, commitSha: 'b'.repeat(40) }, {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: RUN_ID,
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({
      ...source,
      githubActions: { ...source.githubActions, refName: 'feature' },
    }, {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: RUN_ID,
    }).passed).toBe(false);

    const failedTests = source.testCases.map((test, index) => index === 0 ? { ...test, passed: false } : test);
    expect(validateDownloadedEvidence({ ...source, testCases: failedTests }, {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: RUN_ID,
    }).passed).toBe(false);

    expect(validateDownloadedEvidence({
      ...source,
      supabaseProjectReference: 'synthetic-project',
      supabaseProjectReferenceRedacted: false,
    }, {
      targetSha: SHA,
      repository: 'renanescola40-afk/eurocomply_saas',
      runId: RUN_ID,
    }).passed).toBe(false);
  });

  it('uses a read-only protected workflow and never commits runtime evidence', () => {
    const workflow = readFileSync('.github/workflows/supabase-live-rls-validation.yml', 'utf8');

    expect(workflow).toContain('push:\n    branches: [main]');
    expect(workflow).toContain('environment: supabase-live-rls-validation');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain("RLS_LIVE_UPDATE_REGISTER: '0'");
    expect(workflow).toContain('supabase-live-rls-runtime-proof-${{ env.TARGET_SHA }}');
    expect(workflow).not.toContain('git push');
    expect(workflow).not.toContain('gh pr create');
    expect(workflow).not.toContain('pull_request_target');
  });
});
