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

  it('keeps AI assessments backend-only while preserving authenticated reads', () => {
    expect(finalIsolation).toContain("'ai_assessments'");
    expect(finalIsolation).toContain('`public.ai_assessments` already has a reviewed historical backend-only decision');
    expect(finalIsolation).toContain('restrict_authenticated_ai_assessments_insert_backend_only');
    expect(finalIsolation).toContain('restrict_authenticated_ai_assessments_update_backend_only');
    expect(finalIsolation).toContain('restrict_authenticated_ai_assessments_delete_backend_only');
    expect(finalIsolation).toContain('as restrictive\n  for insert\n  to authenticated\n  with check (false)');
    expect(finalIsolation).toContain('AI assessment backend-only restrictive policy boundary is missing');
  });

  it('keeps the unused legacy tasks table read-only to authenticated clients', () => {
    expect(finalIsolation).toContain("'tasks'");
    expect(finalIsolation).toContain('`public.tasks` is the preserved legacy task table');
    expect(finalIsolation).toContain(
      "execute format('revoke insert, update, delete on table public.%I from anon, authenticated', target_table)",
    );
    expect(finalIsolation).toContain(
      "execute format('grant select on table public.%I to authenticated', target_table)",
    );
    expect(finalIsolation).toContain(
      "has_table_privilege('service_role', format('public.%I', target_table), 'INSERT')",
    );
    expect(finalIsolation).toContain(
      "has_table_privilege('authenticated', format('public.%I', target_table), 'INSERT')",
    );
  });

  it('forces the remaining client-facing RLS tables and minimizes profile grants', () => {
    for (const table of [
      'email_notification_events',
      'intelligence_calendar_suggestions',
      'intelligence_items',
      'profiles',
      'vendor_review_history',
    ]) {
      expect(finalIsolation).toContain(`'${table}'`);
    }
    expect(finalIsolation).toContain(
      "execute format('alter table public.%I force row level security', target_table)",
    );
    expect(finalIsolation).toContain(
      'revoke insert, update, delete on table public.profiles from anon;',
    );
    expect(finalIsolation).toContain(
      'revoke insert, delete on table public.profiles from authenticated;',
    );
    expect(finalIsolation).toContain(
      'grant select, update on table public.profiles to authenticated;',
    );
    expect(finalIsolation).toContain('profiles client privileges are not least-privilege canonical');
  });

  it('fails the release if a client table or anonymous definer escapes the global boundary', () => {
    expect(finalIsolation).toContain('do $global_client_security_postconditions$');
    expect(finalIsolation).toContain('client-granted public table escaped RLS/FORCE RLS');
    expect(finalIsolation).toContain('client-granted public table has no RLS policy');
    expect(finalIsolation).toContain("has_table_privilege('anon', c.oid, 'SELECT')");
    expect(finalIsolation).toContain("has_table_privilege('authenticated', c.oid, 'DELETE')");
    expect(finalIsolation).not.toContain("has_table_privilege('anon', format('public.%I', c.relname), 'SELECT')");
    expect(finalIsolation).toContain(
      "and has_function_privilege('anon', p.oid, 'EXECUTE')",
    );
    expect(finalIsolation).toContain(
      'anonymous role can execute an application SECURITY DEFINER function',
    );
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
