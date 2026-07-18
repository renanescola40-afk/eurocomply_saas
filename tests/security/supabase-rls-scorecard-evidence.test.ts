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
import { buildSupabaseRlsScorecardEvidence } from '../../scripts/security/write-supabase-rls-scorecard-evidence.mjs';
import { validateSupabaseRlsScorecardEvidence } from '../../scripts/security/check-supabase-rls-scorecard-evidence.mjs';

const SHA = 'a'.repeat(40);

function validSourceEvidence() {
  const testCases: Array<{ table: string; operation: string; passed: boolean }> = [];
  const add = (table: string, operation: string) => testCases.push({ table, operation, passed: true });

  for (const table of customerTenantTables) {
    add(table, 'rls_enabled');
    for (const operation of requiredCoverageOperations) add(table, operation);
    add(table, requiredSameTenantReadOperations[0]);
  }
  for (const table of sameTenantWritableTables) add(table, 'same_tenant_insert');
  for (const table of backendOwnedTables) {
    for (const operation of requiredBackendWriteDenyOperations) add(table, operation);
  }
  for (const operation of requiredViewerAdminDenyOperations) add('organization_members', operation);
  for (const table of globalReferenceTables) {
    for (const operation of requiredGlobalReferenceOperations) add(table, operation);
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
      runId: '12345',
      runAttempt: '1',
      runUrl: 'https://github.com/renanescola40-afk/eurocomply_saas/actions/runs/12345',
      repository: 'renanescola40-afk/eurocomply_saas',
      commitSha: SHA,
      refName: 'main',
      actor: 'github-actions[bot]',
      eventName: 'push',
      stampedAt: '2026-07-18T00:00:00.000Z',
    },
  };
}

describe('Supabase RLS scorecard evidence', () => {
  it('promotes exactly the five live tenant-isolation controls', () => {
    const evidence = buildSupabaseRlsScorecardEvidence(validSourceEvidence(), {
      expectedSha: SHA,
      generatedAt: '2026-07-18T00:05:00.000Z',
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
    expect(validateSupabaseRlsScorecardEvidence(evidence, SHA)).toEqual({
      passed: true,
      failures: [],
    });
  });

  it('fails closed when any required table operation is absent', () => {
    const source = validSourceEvidence();
    const incomplete = {
      ...source,
      testCases: source.testCases.filter(
        (test) => !(test.table === 'documents' && test.operation === 'cross_tenant_update'),
      ),
    };
    const evidence = buildSupabaseRlsScorecardEvidence(incomplete, {
      expectedSha: SHA,
    });

    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('not_verified');
    expect(evidence.checks.every((check) => check.passed !== true)).toBe(true);
    expect(validateSupabaseRlsScorecardEvidence(evidence, SHA).passed).toBe(false);
  });

  it('maps the canonical evidence file to TEN-02 through TEN-06 only', () => {
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
    expect(tenancy.controls[0].evidence.check).toBe('organizationOnboarding');
  });

  it('integrates exact-SHA retrieval into the enterprise scorecard without inferring evidence', () => {
    const workflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');

    expect(workflow).toContain('Supabase Live RLS Validation');
    expect(workflow).toContain('SUPABASE_RLS_RUNTIME_SOURCE_RUN_ID');
    expect(workflow).toContain('node scripts/enterprise/fetch-supabase-rls-evidence.mjs');
    expect(workflow).toContain('node scripts/security/write-supabase-rls-scorecard-evidence.mjs');
    expect(workflow).toContain('node scripts/security/check-supabase-rls-scorecard-evidence.mjs');
    expect(workflow).toContain('rm -f docs/security/evidence/runtime/supabase-rls-validation.json');
  });
});
