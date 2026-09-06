import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const finalIsolation = readFileSync(
  'supabase/migrations/20260906006700_billing_governance_workflow_plan_isolation.sql',
  'utf8',
);
const gapRoute = readFileSync('src/app/api/gap-analysis/route.ts', 'utf8');
const onboardingAction = readFileSync('src/server/actions/onboarding.ts', 'utf8');

describe('final server-only commercial Data API boundary', () => {
  it('keeps Gap Analysis mutations behind the reviewed API', () => {
    for (const table of ['gap_assessments', 'gap_answers', 'compliance_findings']) {
      expect(finalIsolation).toContain(`'${table}'`);
    }
    expect(finalIsolation).toContain(
      "execute format('revoke insert, update, delete on table public.%I from anon, authenticated', target_table)",
    );
    expect(gapRoute).toContain('assertTrustedOrigin(request)');
    expect(gapRoute).toContain('requireGapOrganizationPermission');
    expect(gapRoute).toContain('checkDistributedRateLimit');
    expect(gapRoute).toContain('parseJsonBodyWithZod');
    expect(gapRoute).toContain('createAdminClient');
    expect(gapRoute).toContain('createAuditEvent');
  });

  it('keeps onboarding activation mutations on the hardened atomic server path', () => {
    expect(finalIsolation).toContain("'onboarding_activation_runs'");
    expect(onboardingAction).toContain("const ATOMIC_ONBOARDING_ACTIVATION_RPC = 'complete_onboarding_activation_atomic'");
    expect(onboardingAction).toContain('createAdminClient');
    expect(onboardingAction).toContain('supabase.rpc(ATOMIC_ONBOARDING_ACTIVATION_RPC');
  });

  it('restores personal compliance-task access without weakening paid organization tasks', () => {
    expect(finalIsolation).toContain('drop policy if exists payment_first_commercial_authority on public.compliance_tasks');
    expect(finalIsolation).toContain('create policy payment_first_commercial_authority');
    expect(finalIsolation).toContain('organization_id is null');
    expect(finalIsolation).toContain('app_private.has_commercial_authority(organization_id)');
    expect(finalIsolation).toContain("policyname='restrict_authenticated_compliance_task_insert_to_personal'");
    expect(finalIsolation).toContain("policyname='rls_compliance_tasks_insert_personal'");
  });
});
