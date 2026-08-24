import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dispatcher = readFileSync('scripts/enterprise/dispatch-runtime-closeout-campaign.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/enterprise-runtime-closeout-campaign.yml', 'utf8');

describe('enterprise runtime closeout campaign', () => {
  it('binds TEN-RLS to an exact successful governed promotion', () => {
    expect(workflow).toContain('supabase_promotion_run_id:');
    expect(workflow).toContain('SUPABASE_PROMOTION_RUN_ID: ${{ inputs.supabase_promotion_run_id }}');
    expect(dispatcher).toContain('promotion_run_id: supabasePromotionRunId');
    expect(dispatcher).toContain("confirmation: 'EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF'");
  });

  it('removes every live-RLS migration application switch', () => {
    expect(workflow).not.toContain('apply_rls_migrations');
    expect(workflow).not.toContain('APPLY_MIGRATIONS');
    expect(dispatcher).not.toContain('apply_migrations');
    expect(dispatcher).not.toContain('APPLY_MIGRATIONS');
  });

  it('binds dispatches to exact current main and protected approval', () => {
    expect(dispatcher).toContain('/^[a-f0-9]{40}$/');
    expect(dispatcher).toContain("github('/commits/main')");
    expect(dispatcher).toContain('main.sha !== targetSha');
    expect(workflow).toContain('environment: enterprise-release-approval');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
  });

  it('never treats orchestration as control promotion', () => {
    expect(dispatcher).toContain('A dispatch receipt proves orchestration only');
    expect(workflow).toContain('does not promote controls by itself');
  });
});
