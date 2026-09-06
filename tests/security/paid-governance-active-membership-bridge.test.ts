import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const reconciliation = read('config/supabase-forward-reconciliation.json');
const foundation = read('supabase/migrations/20260906006400_reconcile_paid_governance_runtime_foundations.sql');
const professionalIsolation = read('supabase/migrations/20260906006500_billing_professional_task_plan_isolation.sql');

describe('paid governance forward bridge active-membership authority', () => {
  it('hardens every membership helper before Business and Enterprise plan isolation', () => {
    expect(reconciliation.indexOf('20260906006400_reconcile_paid_governance_runtime_foundations.sql'))
      .toBeLessThan(reconciliation.indexOf('20260906006500_billing_professional_task_plan_isolation.sql'));
    expect(reconciliation.indexOf('20260906006500_billing_professional_task_plan_isolation.sql'))
      .toBeLessThan(reconciliation.indexOf('20260906006600_billing_business_feature_plan_isolation.sql'));
    expect(reconciliation.indexOf('20260906006500_billing_professional_task_plan_isolation.sql'))
      .toBeLessThan(reconciliation.indexOf('20260906006700_billing_governance_workflow_plan_isolation.sql'));

    for (const helper of [
      'public.enterprise_member_can_read',
      'public.enterprise_member_can_manage',
      'public.ai_qms_actor_is_member',
    ]) {
      expect(foundation).toContain(`create or replace function ${helper}`);
      expect(professionalIsolation).toContain(`create or replace function ${helper}`);
    }

    expect((professionalIsolation.match(/lower\(coalesce\([^\n]*\.status, ''\)\) = 'active'/g) ?? []).length)
      .toBeGreaterThanOrEqual(3);
    expect(professionalIsolation).toContain("column_name = 'status'");
    expect(professionalIsolation).toContain("is_nullable = 'NO'");
    expect(professionalIsolation).toContain("not ilike '%status%active%'");
    expect(professionalIsolation).toContain('Paid governance membership helper is not active-membership aware');
  });

  it('keeps QMS actor authority backend-only while enterprise read helpers remain boolean-only', () => {
    expect(professionalIsolation).toContain(
      'revoke all on function public.ai_qms_actor_is_member(uuid,uuid) from public, anon, authenticated;',
    );
    expect(professionalIsolation).toContain(
      'grant execute on function public.ai_qms_actor_is_member(uuid,uuid) to service_role;',
    );
    expect(professionalIsolation).toContain(
      'revoke all on function public.enterprise_member_can_read(uuid) from public, anon;',
    );
    expect(professionalIsolation).toContain(
      'revoke all on function public.enterprise_member_can_manage(uuid) from public, anon;',
    );
    expect(professionalIsolation).not.toContain('grant all on public.');
    expect(professionalIsolation).not.toContain('disable row level security');
  });

  it('binds Enterprise governance AI-system references to the same organization', () => {
    expect(professionalIsolation).toContain('create or replace function public.enforce_enterprise_ai_system_tenant_scope()');
    expect(professionalIsolation).toContain('scoped_system.id = new.ai_system_id');
    expect(professionalIsolation).toContain('scoped_system.organization_id = new.organization_id');
    expect(professionalIsolation).toContain('enterprise_ai_system_not_in_organization');
    expect(professionalIsolation).toContain('enforce_enterprise_vendor_diligence_ai_system_scope');
    expect(professionalIsolation).toContain('enforce_enterprise_risk_review_ai_system_scope');
    expect(professionalIsolation).toContain(
      'revoke all on function public.enforce_enterprise_ai_system_tenant_scope() from public, anon, authenticated;',
    );
    expect(professionalIsolation).toContain('Enterprise AI-system same-organization triggers are missing');
    expect(reconciliation).not.toContain('20260906006410_harden_paid_governance_ai_system_tenant_scope.sql');
  });
});
