import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dispatcher = readFileSync('scripts/enterprise/dispatch-runtime-closeout-campaign.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/enterprise-runtime-closeout-campaign.yml', 'utf8');

describe('enterprise runtime closeout campaign', () => {
  it('keeps TEN-RLS authority optional for non-Supabase closure and exclusive when supplied', () => {
    expect(workflow).toContain('supabase_promotion_run_id:');
    expect(workflow).toContain('supabase_reattestation_run_id:');
    expect(workflow).toContain('supabase_current_state_run_id:');
    expect(workflow).toContain("SUPABASE_PROMOTION_RUN_ID: ${{ inputs.supabase_promotion_run_id || '' }}");
    expect(workflow).toContain("SUPABASE_REATTESTATION_RUN_ID: ${{ inputs.supabase_reattestation_run_id || '' }}");
    expect(workflow).toContain("SUPABASE_CURRENT_STATE_RUN_ID: ${{ inputs.supabase_current_state_run_id || '' }}");
    expect(workflow).toContain('test $((promotion_set + reattestation_set + current_state_set)) -le 1');
    expect(dispatcher).toContain("'.github/workflows/supabase-forward-reconciliation-production-promotion.yml'");
    expect(dispatcher).toContain("'.github/workflows/supabase-forward-production-reattestation.yml'");
    expect(dispatcher).toContain("'.github/workflows/supabase-current-production-state-read-only.yml'");
    expect(dispatcher).toContain('hasSupabaseAuthority');
    expect(dispatcher).toContain('dispatched_non_supabase_only');
    expect(dispatcher).toContain("file: 'audit-chain-runtime-proof.yml'");
    expect(dispatcher).toContain("file: 'step-up-runtime-proof.yml'");
    expect(dispatcher).toContain("file: 'supabase-production-rls-reconciliation.yml'");
    expect(dispatcher).toContain("mode: 'verify_only'");
    expect(dispatcher).toContain("promotion_run_id: promotionSet ? supabasePromotionRunId : ''");
    expect(dispatcher).toContain("reattestation_run_id: reattestationSet ? supabaseReattestationRunId : ''");
    expect(dispatcher).toContain("current_state_run_id: currentStateSet ? supabaseCurrentStateRunId : ''");
    expect(dispatcher).toContain("'EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF'");
    expect(dispatcher).toContain("'EXECUTE_POST_REATTESTATION_RUNTIME_PROOF'");
    expect(dispatcher).toContain("'EXECUTE_CURRENT_PRODUCTION_STATE_RUNTIME_PROOF'");
  });

  it('removes every live-RLS migration application switch', () => {
    expect(workflow).not.toContain('apply_rls_migrations');
    expect(workflow).not.toContain('APPLY_MIGRATIONS');
    expect(dispatcher).not.toContain('apply_migrations');
    expect(dispatcher).not.toContain('APPLY_MIGRATIONS');
  });

  it('binds manual and automatic dispatches to exact current main and protected approval', () => {
    expect(dispatcher).toContain('/^[a-f0-9]{40}$/');
    expect(dispatcher).toContain("github('/commits/main')");
    expect(dispatcher).toContain('main.sha !== targetSha');
    expect(dispatcher).toContain('if (hasSupabaseAuthority)');
    expect(dispatcher).toContain('authorityRun.head_sha !== targetSha');
    expect(dispatcher).toContain("authorityRun.event !== 'workflow_dispatch'");
    expect(dispatcher).toContain("authorityRun.conclusion !== 'success'");
    expect(workflow).toContain('environment: enterprise-release-approval');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('group: enterprise-runtime-closeout-${{ inputs.release_sha || github.sha }}');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
  });

  it('never treats orchestration as control promotion', () => {
    expect(dispatcher).toContain('A dispatch receipt proves orchestration only');
    expect(workflow).toContain('does not promote controls by itself');
  });
});
