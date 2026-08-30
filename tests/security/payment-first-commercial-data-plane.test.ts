import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20260823123000_payment_first_commercial_data_plane.sql');
const gapMigration = read('supabase/migrations/20260823131500_payment_first_gap_analysis_and_storage.sql');
const reconciliation = JSON.parse(read('config/supabase-forward-reconciliation.json')) as {
  changeSet: string;
  migrations: Array<{ filename: string }>;
};
const billingRuntimeValidator = read('scripts/security/validate-enterprise-billing-runtime.sql');
const gapApi = read('src/app/api/gap-analysis/route.ts');
const gapStorage = read('src/lib/gap-analysis/storage.ts');
const remediationStorage = read('src/lib/compliance/remediation.ts');
const paymentRuntime = read('tests/e2e/payment-first-runtime-global-setup.ts');
const onboardingAction = read('src/server/actions/onboarding.ts');
const onboardingPage = read('src/app/[locale]/onboarding/page.tsx');
const permissionBridge = read('src/server/auth/permissions.ts');
const subscriptionAuthority = read('src/server/queries/subscription.ts');
const dashboardAccess = read('src/server/queries/organization-dashboard-access.ts');
const checkoutActivation = read('src/app/api/billing/checkout/activation/route.ts');
const billingContext = read('src/server/queries/billing.ts');
const addOns = read('src/server/billing/addons.ts');
const legacyInventory = [
  'src/app/[locale]/dashboard/inventario/page.tsx',
  'src/app/[locale]/dashboard/inventario/novo/page.tsx',
  'src/app/[locale]/dashboard/inventario/[id]/page.tsx',
].map(read);

describe('payment-first commercial closure', () => {
  it('keeps both payment-first migrations inside the only governed V23 Production promotion set', () => {
    const selected = reconciliation.migrations.map((item) => item.filename);
    expect(reconciliation.changeSet).toBe('2026-08-25-enterprise-data-plane-active-membership-rls-closure-v23');
    expect(selected).toHaveLength(33);
    expect(selected.slice(25, 27)).toEqual([
      '20260823123000_payment_first_commercial_data_plane.sql',
      '20260823131500_payment_first_gap_analysis_and_storage.sql',
    ]);
    expect(selected.slice(27, 31)).toEqual([
      '20260824185900_prepare_enterprise_trusted_access_legacy_compatibility.sql',
      '20260824190000_reconcile_enterprise_trusted_access_runtime.sql',
      '20260824190100_finalize_enterprise_trusted_access_operation_contract.sql',
      '20260824190200_harden_enterprise_trusted_access_runtime_contract.sql',
    ]);
    expect(selected.at(-2)).toBe('20260825092500_atomic_document_commercial_quota.sql');
    expect(selected.at(-1)).toBe('20260825171500_harden_active_membership_rls_authority.sql');
    expect(selected.indexOf('20260822123626_v19_reconcile_enterprise_evidence_vault.sql')).toBeLessThan(
      selected.indexOf('20260823123000_payment_first_commercial_data_plane.sql'),
    );
  });

  it('makes canonical rehearsal/live/recovery billing postconditions fail closed without payment-first authority', () => {
    expect(billingRuntimeValidator).toContain("to_regprocedure('app_private.has_commercial_authority(uuid)')");
    expect(billingRuntimeValidator).toContain("policy.policyname='payment_first_commercial_authority'");
    expect(billingRuntimeValidator).toContain("'payment_first_gap_assessments_authority'");
    expect(billingRuntimeValidator).toContain("'payment_first_gap_answers_authority'");
    expect(billingRuntimeValidator).toContain("'payment_first_compliance_findings_authority'");
    expect(billingRuntimeValidator).toContain("table_name in ('ai_tools','compliance_documents','regulatory_updates','compliance_evidence')");
    expect(billingRuntimeValidator).toContain("not like '%has_commercial_authority%'");
  });

  it('mirrors the canonical durable commercial sources in a private fail-closed RLS helper', () => {
    expect(migration).toContain('app_private.has_commercial_authority');
    expect(migration).toContain('with selected_contract_source as (');
    expect(migration).toContain("source.source_kind = 'signed_contract'");
    expect(migration).toContain('order by source.priority desc');
    expect(migration).toContain('join selected_contract_source source');
    expect(migration).toContain('on source.id = snapshot.source_id');
    expect(migration).toContain("snapshot.status = 'applied'");
    expect(migration).toContain("event.livemode = true");
    expect(migration).toContain("event.status = 'processed'");
    expect(migration).toContain("'customer.subscription.created', 'customer.subscription.updated'");
    expect(migration).toContain("event.payload #>> '{data,object,id}' = subscription.stripe_subscription_id");
    expect(migration).toContain('end = subscription.stripe_customer_id');
    expect(migration).not.toContain("source_kind = 'manual_override'");
  });

  it('requires active paid Stripe state everywhere and never promotes trialing to a product key', () => {
    expect(subscriptionAuthority).toContain(".eq('status', 'active')");
    expect(subscriptionAuthority).not.toContain(".in('status', ['active', 'trialing'])");
    expect(migration).toContain("lower(coalesce(subscription.status, '')) = 'active'");
    expect(migration).not.toContain("in ('active','trialing')");
    expect(checkoutActivation).toContain("const ACTIVATED_SUBSCRIPTION_STATUSES = new Set(['active']);");
    expect(billingContext).toContain("const ACTIVE_BILLING_STATUSES = ['active'] as const;");
    expect(addOns).toContain("const ACTIVE_ADD_ON_STATUSES = ['active'] as const;");
  });

  it('removes status-only dashboard authority and uses the canonical licensed decision', () => {
    expect(dashboardAccess).toContain('getOrganizationBillingAuthority(currentOrganization.id)');
    expect(dashboardAccess).toContain('if (!authority.licensed)');
    expect(dashboardAccess).not.toContain('PAID_ACCESS_STATUSES');
    expect(dashboardAccess).not.toContain('getOrganizationBillingContext');
    expect(dashboardAccess.indexOf('if (!authority.licensed)')).toBeLessThan(
      dashboardAccess.indexOf('if (!currentOrganization.is_onboarding_completed)'),
    );
  });

  it('adds one restrictive paid-authority policy to every organization-scoped product table', () => {
    expect(migration).toContain('as restrictive for all to authenticated');
    expect(migration).toContain('using (app_private.has_commercial_authority(organization_id))');
    expect(migration).toContain('with check (app_private.has_commercial_authority(organization_id))');

    for (const table of [
      'ai_systems',
      'ai_assessments',
      'ai_incidents',
      'documents',
      'risks',
      'vendors',
      'tasks',
      'compliance_tasks',
      'evidence_items',
      'onboarding_activation_runs',
      'monitoring_preferences',
      'notifications',
      'audit_events',
      'audit_logs',
      'invitations',
    ]) {
      expect(migration).toContain(`'${table}'`);
    }
  });

  it('promotes historical Gap/Findings rows into organization authority and adds restrictive paid RLS', () => {
    expect(gapMigration).toContain('add column if not exists organization_id uuid');
    expect(gapMigration).toContain('payment_first_gap_assessments_authority');
    expect(gapMigration).toContain('payment_first_gap_answers_authority');
    expect(gapMigration).toContain('payment_first_compliance_findings_authority');
    expect(gapMigration).toContain('as restrictive');
    expect(gapMigration).toContain('app_private.has_commercial_authority(organization_id)');
    expect(gapMigration).toContain('app_private.has_commercial_authority(ga.organization_id)');
  });

  it('requires paid authority for Evidence Vault Storage bytes and removes legacy personal evidence grants', () => {
    expect(gapMigration).toContain('rls_compliance_evidence_objects_select_organization');
    expect(gapMigration).toContain('rls_compliance_evidence_objects_insert_organization');
    expect(gapMigration).toContain('app_private.has_commercial_authority(e.organization_id)');
    expect(gapMigration).toContain('revoke all on table public.compliance_evidence from public, anon, authenticated');
    expect(gapMigration).toContain('Evidence Vault Storage policies are not payment-first');
  });

  it('routes Gap Analysis and remediation writes through a commercial server boundary', () => {
    expect(gapApi).toContain("requireGapOrganizationPermission(user.id, 'manage_ai_governance')");
    expect(gapApi).toContain("requireGapOrganizationPermission(user.id, 'read_ai_governance')");
    expect(gapApi).toContain('organization_id: organizationId');
    expect(gapApi).toContain("action: 'gap_analysis.saved'");
    expect(gapApi).toContain("action: 'gap_analysis.remediation_created'");
    expect(gapApi).toContain("failureMode: 'fail-closed'");

    expect(gapStorage).toContain('/api/gap-analysis?operation=assessment');
    expect(remediationStorage).toContain('/api/gap-analysis?operation=remediation');
    expect(gapStorage).not.toContain('integrations/supabase/client');
    expect(remediationStorage).not.toContain('integrations/supabase/client');
    expect(gapStorage).not.toContain(".from('gap_assessments')");
    expect(remediationStorage).not.toContain(".from('compliance_findings')");
  });

  it('proves unlicensed direct and API Gap writes are denied in disposable runtime QA', () => {
    expect(paymentRuntime).toContain("/api/gap-analysis?operation=assessment");
    expect(paymentRuntime).toContain('/rest/v1/gap_assessments');
    expect(paymentRuntime).toContain('payment_first_supabase_gap_write');
    expect(paymentRuntime).toContain('payment_first_supabase_gap_write_survived_denial');
  });

  it('removes billing-unaware legacy/global direct product grants', () => {
    expect(migration).toContain("array['ai_tools', 'compliance_documents']");
    expect(migration).toContain('revoke all on table public.%I from public, anon, authenticated');
    expect(migration).toContain('revoke all on table public.regulatory_updates from public, anon, authenticated');
    expect(migration).toContain("raise exception 'legacy/global paid-product client grants survived: %'");
  });

  it('blocks operational onboarding before AI/docs/tasks/invites are prepared or persisted', () => {
    const activation = onboardingAction.slice(onboardingAction.indexOf('export async function completeOnboardingActivation'));
    const authority = activation.indexOf('await requireLicensedOnboardingAuthority(organizationId)');

    expect(authority).toBeGreaterThanOrEqual(0);
    for (const laterOperation of [
      'const classification = classifyAiSystem',
      'getRecommendedDocuments({',
      'getSuggestedTasks({',
      'supabase.rpc(ATOMIC_ONBOARDING_ACTIVATION_RPC',
      'await deliverOnboardingInvitations',
    ]) {
      expect(activation.indexOf(laterOperation), laterOperation).toBeGreaterThan(authority);
    }

    expect(onboardingPage).toContain('requireLicensedOnboardingPageAccess');
    expect(onboardingPage).toContain("onboarding: 'payment_required'");
  });

  it('requires licensed Starter authority for team Server Actions while preserving the billing purchase lane', () => {
    expect(permissionBridge).toContain("manage_team: 'starter'");
    expect(permissionBridge).toContain('minimumPlan: SERVER_ACTION_MINIMUM_PLAN_BY_PERMISSION[requiredPermission]');
    expect(permissionBridge).not.toContain("manage_billing: 'starter'");
    expect(permissionBridge).not.toContain("manage_settings: 'starter'");
  });

  it('removes browser Supabase CRUD from localized legacy inventory routes', () => {
    for (const source of legacyInventory) {
      expect(source).toContain("redirect(`/${locale}/ai-systems`)");
      expect(source).not.toContain('integrations/supabase/client');
      expect(source).not.toContain(".from('ai_tools')");
    }
  });
});
