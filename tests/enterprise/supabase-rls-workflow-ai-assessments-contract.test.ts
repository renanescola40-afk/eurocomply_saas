import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-live-rls-validation.yml';

describe('Supabase post-V21 live RLS workflow contract', () => {
  it('executes one integrated tenant/horizontal/ai_assessments proof before provenance stamping', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    const baseCommand = 'run: node scripts/security/run-supabase-live-tenant-isolation.mjs';
    const provenanceCommand = 'run: node scripts/security/stamp-supabase-live-rls-provenance.mjs';
    const baseIndex = workflow.indexOf(baseCommand);
    const provenanceIndex = workflow.indexOf(provenanceCommand);
    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(provenanceIndex).toBeGreaterThan(baseIndex);
    expect(workflow).not.toContain('run-supabase-live-ai-assessments-rls.mjs');
    expect(workflow).not.toContain('append-supabase-live-horizontal-isolation.mjs');

    const v4 = readFileSync('scripts/security/run-supabase-live-tenant-isolation-v4.mjs', 'utf8');
    expect(v4).toContain("table: 'ai_assessments'");
    expect(v4).toContain('member_same_tenant_insert_denied');
    expect(v4).toContain('viewer_same_tenant_insert_denied');
    expect(v4).toContain('horizontal_other_user_read_denied');
  });

  it('binds the proof to exact successful V21/31 Production promotion evidence', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    expect(workflow).toContain('promotion_run_id:');
    expect(workflow).toContain('EXECUTE_POST_V21_RUNTIME_PROOF');
    expect(workflow).toContain('.github/workflows/supabase-forward-reconciliation-production-promotion.yml');
    expect(workflow).toContain('supabase-forward-production-promotion-${TARGET_SHA}');
    expect(workflow).toContain('.selectedMigrationCount == 31');
    expect(workflow).toContain('.changeSet == "2026-08-24-enterprise-data-plane-payment-first-trusted-access-closure-v21"');
    expect(workflow).toContain('20260824185900_prepare_enterprise_trusted_access_legacy_compatibility.sql');
    expect(workflow).toContain('20260824190200_harden_enterprise_trusted_access_runtime_contract.sql');
    expect(workflow).toContain('PROMOTION_PRODUCTION_VERIFIED=true');
  });

  it('uses only protected Supabase API credentials and retains strict fixture cleanup', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    expect(workflow).toContain('environment: supabase-live-rls-validation');
    expect(workflow).toContain('NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}');
    expect(workflow).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}');
    expect(workflow).toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(workflow).toContain("RLS_LIVE_KEEP_FIXTURES: '0'");
    const v4 = readFileSync('scripts/security/run-supabase-live-tenant-isolation-v4.mjs', 'utf8');
    expect(v4).toContain('cleanupV20SyntheticFixture');
    expect(v4).toContain('grantBoundedV20CommercialAuthority');
  });

  it('contains no migration or direct database execution path', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    expect(workflow).toContain('permissions:\n  actions: read\n  contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('apply_migrations');
    expect(workflow).not.toContain('SUPABASE_DB_URL');
    expect(workflow).not.toContain('SUPABASE_DB_POOLER_URL');
    expect(workflow).not.toMatch(/\bpsql\b/);
    expect(workflow).not.toContain('db push');
    expect(workflow).not.toContain('--include-all');
    expect(workflow).not.toContain('migration repair');
    expect(workflow).not.toContain('git push');
    expect(workflow).not.toContain('gh pr create');
    expect(workflow).not.toContain('pull_request_target');
  });
});
