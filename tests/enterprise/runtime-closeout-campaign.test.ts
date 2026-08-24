import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dispatcher = readFileSync('scripts/enterprise/dispatch-runtime-closeout-campaign.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/enterprise-runtime-closeout-campaign.yml', 'utf8');

describe('enterprise runtime closeout campaign after V21/31 promotion', () => {
  it('dispatches the critical protected proof workflows', () => {
    for (const file of [
      'auth-rbac-runtime-proof.yml',
      'supabase-live-rls-validation.yml',
      'distributed-rate-limit-runtime-proof.yml',
      'production-runtime-proof.yml',
      'p0-branch-protection-evidence.yml',
    ]) expect(dispatcher).toContain(file);
  });

  it('binds every dispatch to a full exact current main SHA', () => {
    expect(dispatcher).toContain('/^[a-f0-9]{40}$/');
    expect(dispatcher).toContain("github('/commits/main')");
    expect(dispatcher).toContain('main.sha !== targetSha');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$TARGET_SHA"');
  });

  it('requires the exact successful V21/31 promotion run before TEN-RLS dispatch', () => {
    expect(workflow).toContain('supabase_promotion_run_id:');
    expect(workflow).toContain('SUPABASE_PROMOTION_RUN_ID: ${{ inputs.supabase_promotion_run_id }}');
    expect(workflow).toContain('[[ "$SUPABASE_PROMOTION_RUN_ID" =~ ^[0-9]+$ ]]');
    expect(dispatcher).toContain('SUPABASE_PROMOTION_RUN_ID');
    expect(dispatcher).toContain('promotion_run_id: supabasePromotionRunId');
    expect(dispatcher).toContain("confirmation: 'EXECUTE_POST_V21_RUNTIME_PROOF'");
  });

  it('removes every live-RLS migration application switch', () => {
    expect(workflow).not.toContain('apply_rls_migrations');
    expect(workflow).not.toContain('APPLY_MIGRATIONS');
    expect(dispatcher).not.toContain('apply_migrations');
    expect(dispatcher).not.toContain('APPLY_MIGRATIONS');
    expect(workflow).toContain('TEN-RLS is promotion-bound and this workflow cannot apply migrations.');
  });

  it('uses a protected approval environment and bounded permissions', () => {
    expect(workflow).toContain('environment: enterprise-release-approval');
    expect(workflow).toContain('actions: write');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
  });

  it('does not claim dispatching promotes controls', () => {
    expect(dispatcher).toContain('A dispatch receipt proves orchestration only');
    expect(workflow).toContain('does not promote controls by itself');
  });

  it('targets a consolidated critical control wave', () => {
    for (const control of ['IAM-01', 'TEN-02', 'PLT-09', 'SEC-05', 'REL-08']) expect(dispatcher).toContain(control);
    expect(dispatcher).toContain('controlCount');
  });
});
