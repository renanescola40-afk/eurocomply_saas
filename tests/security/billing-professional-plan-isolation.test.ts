import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const foundationMigration = read('supabase/migrations/20260906006400_reconcile_paid_governance_runtime_foundations.sql');
const migration = read('supabase/migrations/20260906006500_billing_professional_task_plan_isolation.sql');
const businessMigration = read('supabase/migrations/20260906006600_billing_business_feature_plan_isolation.sql');
const governanceMigration = read('supabase/migrations/20260906006700_billing_governance_workflow_plan_isolation.sql');
const reconciliation = read('config/supabase-forward-reconciliation.json');
const taskActions = read('src/server/actions/compliance-tasks.ts');
const taskQuery = read('src/server/queries/compliance-tasks.ts');
const taskPage = read('src/app/[locale]/dashboard/organizations/tasks/page.tsx');
const taskCsv = read('src/app/api/reports/tasks.csv/route.ts');
const gapAnalysisRoute = read('src/app/api/gap-analysis/route.ts');
const vendorQuery = read('src/server/queries/vendors.ts');
const vendorPage = read('src/app/[locale]/dashboard/organizations/vendors/page.tsx');
const vendorCsv = read('src/app/api/reports/vendors.csv/route.ts');
const riskQuery = read('src/server/queries/risks.ts');
const riskPage = read('src/app/[locale]/dashboard/organizations/risks/page.tsx');
const riskCsv = read('src/app/api/reports/risks.csv/route.ts');
const rbac = read('src/server/security/rbac.ts');
const dashboardSummary = read('src/server/queries/dashboard.ts');
const organizationDashboard = read('src/server/queries/organization-dashboard.ts');
const executiveLayout = read('src/app/[locale]/dashboard/organizations/reports/layout.tsx');
const executiveCsv = read('src/app/api/reports/executive.csv/route.ts');
const reportsGovernanceLayout = read('src/app/[locale]/dashboard/organizations/reports-governance/layout.tsx');
const aiLiteracyLayout = read('src/app/[locale]/dashboard/ai-literacy/layout.tsx');
const aiLiteracyRoute = read('src/app/api/ai-literacy/route.ts');
const qmsRoute = read('src/app/api/ai-governance/qms/route.ts');
const aiSystemsRoute = read('src/app/api/ai-systems/route.ts');
const complianceAlerts = read('src/app/api/internal/compliance-alerts/route.ts');
const entitlements = read('src/server/billing/entitlements.ts');

describe('billing Professional/Business/Enterprise feature isolation', () => {
  it('keeps the paid-governance runtime bridge and tier-isolation migrations ordered before the V39 cross-tenant guard', () => {
    expect(reconciliation).toContain('2026-09-06-cross-tenant-reference-integrity-v39');
    expect(reconciliation).toContain('20260906006400_reconcile_paid_governance_runtime_foundations.sql');
    expect(reconciliation).toContain('20260906006500_billing_professional_task_plan_isolation.sql');
    expect(reconciliation).toContain('20260906006600_billing_business_feature_plan_isolation.sql');
    expect(reconciliation).toContain('20260906006700_billing_governance_workflow_plan_isolation.sql');
    expect(reconciliation).toContain('20260906006800_harden_cross_tenant_reference_integrity.sql');
    expect(reconciliation.indexOf('20260906006400_reconcile_paid_governance_runtime_foundations.sql'))
      .toBeLessThan(reconciliation.indexOf('20260906006500_billing_professional_task_plan_isolation.sql'));
    expect(reconciliation.indexOf('20260906006400_reconcile_paid_governance_runtime_foundations.sql'))
      .toBeLessThan(reconciliation.indexOf('20260906006600_billing_business_feature_plan_isolation.sql'));
    expect(reconciliation.indexOf('20260906006400_reconcile_paid_governance_runtime_foundations.sql'))
      .toBeLessThan(reconciliation.indexOf('20260906006700_billing_governance_workflow_plan_isolation.sql'));
    expect(reconciliation.indexOf('20260906006700_billing_governance_workflow_plan_isolation.sql'))
      .toBeLessThan(reconciliation.indexOf('20260906006800_harden_cross_tenant_reference_integrity.sql'));
    expect(reconciliation).toContain('"productionWriteAuthorizedByConfig": false');
    expect(reconciliation).toContain('"migrationHistoryRepairAllowed": false');
    expect(reconciliation).toContain('"unrestrictedDbPushAllowed": false');
  });

  it('materializes the exact paid QMS and Enterprise runtime prerequisites without history repair', () => {
    for (const table of [
      'enterprise_evidence_packs',
      'enterprise_evidence_pack_items',
      'enterprise_vendor_due_diligence',
      'enterprise_risk_reviews',
      'ai_qms_systems',
      'ai_qms_controls',
      'ai_qms_nonconformities',
      'ai_qms_audits',
      'ai_qms_management_reviews',
      'ai_qms_decisions',
    ]) {
      expect(foundationMigration).toContain(table);
    }
    for (const rpc of [
      'create_enterprise_evidence_pack_atomic',
      'create_qms_system_atomic',
      'configure_qms_system_atomic',
      'complete_qms_control_atomic',
      'accept_qms_audit_atomic',
      'approve_qms_management_review_atomic',
      'close_qms_nonconformity_atomic',
      'approve_qms_system_atomic',
      'rollback_qms_approval_atomic',
    ]) {
      expect(foundationMigration).toContain(rpc);
    }
    expect(foundationMigration).toContain('enterprise_evidence_pack_items_pack_organization_fkey');
    expect(foundationMigration).toContain('Authenticated direct mutation privilege survived');
    expect(foundationMigration).not.toContain('supabase_migrations.schema_migrations');
    expect(foundationMigration).not.toContain('db push --include-all');
    expect(foundationMigration).not.toContain('disable row level security');
  });

  it('enforces Professional downgrade isolation inside authenticated RLS while preserving personal tasks', () => {
    expect(migration).toContain('create or replace function app_private.has_minimum_commercial_plan');
    expect(migration).toContain("when 'essential' then 1");
    expect(migration).toContain("when 'starter' then 1");
    expect(migration).toContain("when 'growth' then 2");
    expect(migration).toContain("when 'business' then 3");
    expect(migration).toContain('revoke all on function app_private.has_minimum_commercial_plan(uuid,text) from public, anon');

    for (const policy of [
      'restrict_compliance_tasks_organization_professional_plan',
      'restrict_risks_professional_plan',
      'restrict_vendors_professional_plan',
      'restrict_vendor_review_history_professional_plan',
    ]) {
      expect(migration).toContain(policy);
    }

    for (const table of ['compliance_tasks', 'risks', 'vendors', 'vendor_review_history']) {
      expect(migration).toContain(`alter table public.${table} force row level security;`);
    }

    expect(migration).toContain('as restrictive');
    expect(migration).toContain("app_private.has_minimum_commercial_plan(organization_id, 'professional')");
    expect(migration).toContain('organization_id is null');
    expect(migration).toMatch(
      /create policy "restrict_risks_professional_plan"[\s\S]*?as restrictive[\s\S]*?for all[\s\S]*?using \(app_private\.has_minimum_commercial_plan\(organization_id, 'professional'\)\)[\s\S]*?with check \(app_private\.has_minimum_commercial_plan\(organization_id, 'professional'\)\)/,
    );
    expect(migration).toContain("cmd = 'ALL'");
    expect(migration).toContain('Risks Professional policy must restrict authenticated reads and mutations');
    expect(migration).not.toContain('disable row level security');
    expect(migration).not.toContain('grant all on public.');
  });

  it('requires Professional for every organization Tasks server boundary and Gap remediation side-door', () => {
    expect(taskActions).toContain("assertPlanAtLeast(organizationId, 'professional')");
    expect((taskActions.match(/await requireProfessionalTaskPlan\(/g) ?? [])).toHaveLength(3);
    expect(taskQuery).toContain("assertPlanAtLeast(organizationId, 'professional')");
    expect(taskPage).toContain("assertPlanAtLeast(organization.id, 'professional')");
    expect(taskPage).toContain('upgrade=professional&feature=tasks');
    expect(taskCsv).toContain("minimumPlan: 'professional'");

    expect(gapAnalysisRoute).toContain("assertPlanAtLeast(organizationId, 'professional')");
    expect(gapAnalysisRoute).toContain("if (view === 'work')");
    expect(gapAnalysisRoute).toContain("if (operation === 'remediation')");
    expect((gapAnalysisRoute.match(/requireProfessionalRemediationPlan\(access\.organization\.id\)/g) ?? [])).toHaveLength(2);
    expect(gapAnalysisRoute).toContain('const findingIds = userFindings.map((finding) => finding.id)');
    expect(gapAnalysisRoute).toContain(".in('finding_id', findingIds)");
    expect(gapAnalysisRoute).toContain('user_id: null');
  });

  it('requires Professional for Vendors and Risks reads, pages, exports and canonical RBAC mutations', () => {
    expect(vendorQuery).toContain("assertPlanAtLeast(organizationId, 'professional')");
    expect(riskQuery).toContain("assertPlanAtLeast(organizationId, 'professional')");
    expect(vendorPage).toContain("assertPlanAtLeast(current.id, 'professional')");
    expect(vendorPage).toContain('upgrade=professional&feature=vendors');
    expect(riskPage).toContain("assertPlanAtLeast(organization.id, 'professional')");
    expect(riskPage).toContain('upgrade=professional&feature=risks');
    expect(vendorCsv).toContain("minimumPlan: 'professional'");
    expect(riskCsv).toContain("minimumPlan: 'professional'");

    for (const marker of [
      "manage_vendors: 'professional'",
      "read_vendors: 'professional'",
      "manage_risks: 'professional'",
      "read_risks: 'professional'",
    ]) {
      expect(rbac).toContain(marker);
    }
  });

  it('redacts Professional-only metrics, history and previews after downgrade even through service-role queries', () => {
    expect(dashboardSummary).toContain("assertPlanAtLeast(organizationId, 'professional')");
    expect(dashboardSummary).toContain("professionalPlan\n      ? supabase.from('compliance_tasks')");
    expect(dashboardSummary).toContain("professionalPlan\n      ? supabase.from('vendors')");
    expect(dashboardSummary).toContain("professionalPlan\n      ? supabase.from('risks')");
    expect(dashboardSummary).toContain('if (!professionalPlan) return [];');

    expect(organizationDashboard).toContain("entitlements.licensed && isPlanAtLeast(entitlements.plan, 'professional')");
    expect(organizationDashboard).toContain("? withDashboardTimeout('tasks', listDashboardTasks(organization.id))");
    expect(organizationDashboard).toContain("? withDashboardTimeout('risks', listDashboardTopRisks(organization.id))");
    expect(organizationDashboard).toContain("? withDashboardTimeout('vendors', listDashboardVendorsRequiringReview(organization.id))");
  });

  it('suppresses customer alerts when commercial authority no longer covers the feature', () => {
    expect(complianceAlerts).toContain('getOrganizationBillingAuthority');
    expect(complianceAlerts).toContain('authority.licensed && isPlanAtLeast(authority.plan, minimumPlan)');
    expect(complianceAlerts).toContain("isCommerciallyEligible(document.organization_id, 'starter')");
    expect(complianceAlerts).toContain("isCommerciallyEligible(vendor.organization_id, 'professional')");
    expect(complianceAlerts).toContain('createCommercialEligibilityResolver()');
  });

  it('keeps Executive Reports Business-only across visual and CSV boundaries', () => {
    const professionalBlock = entitlements.slice(
      entitlements.indexOf('professional: {'),
      entitlements.indexOf('growth: {'),
    );
    const businessBlock = entitlements.slice(
      entitlements.indexOf('business: {'),
      entitlements.indexOf('enterprise: {'),
    );

    expect(professionalBlock).toContain('executiveReports: false');
    expect(businessBlock).toContain('executiveReports: true');
    expect(executiveLayout).toContain("assertPlanAtLeast(organization.id, 'business')");
    expect(executiveLayout).toContain('upgrade=business&feature=executive-reports');
    expect(executiveCsv).toContain("minimumPlan: 'business'");
    expect(executiveCsv).toContain("requiredPlan: 'business'");
  });

  it('requires durable paid authority before entering the Reports/Governance subtree', () => {
    expect(reportsGovernanceLayout).toContain('getOrganizationEntitlements');
    expect(reportsGovernanceLayout).toContain('if (!entitlements.licensed)');
    expect(reportsGovernanceLayout).toContain('upgrade=required&feature=reports-governance');
  });

  it('keeps AI Literacy and QMS Business-only in UI, API and authenticated data plane', () => {
    expect(aiLiteracyLayout).toContain("assertPlanAtLeast(organization.id, 'business')");
    expect(aiLiteracyLayout).toContain('upgrade=business&feature=ai-literacy');
    expect((aiLiteracyRoute.match(/minimumPlan: 'business'/g) ?? [])).toHaveLength(2);
    expect((qmsRoute.match(/minimumPlan:'business'/g) ?? [])).toHaveLength(2);

    for (const table of [
      'ai_literacy_programs',
      'ai_literacy_courses',
      'ai_literacy_assignments',
      'ai_literacy_evidence',
      'ai_qms_systems',
      'ai_qms_controls',
      'ai_qms_nonconformities',
      'ai_qms_audits',
      'ai_qms_management_reviews',
      'ai_qms_decisions',
    ]) {
      expect(businessMigration).toContain(`'${table}'`);
    }
    expect(businessMigration).toContain('as restrictive for all to authenticated');
    expect(businessMigration).toContain("app_private.has_minimum_commercial_plan(organization_id, ''business'')");
    expect(businessMigration).toContain('alter table public.%I force row level security');
    expect(businessMigration).not.toContain('disable row level security');
    expect(businessMigration).not.toContain('grant all on public.');
  });

  it('tiers AI-system governance workflows as Business procurement/review and Enterprise evidence', () => {
    expect(aiSystemsRoute).toContain("if (workflow === 'evidence_pack') return 'enterprise' as const");
    expect(aiSystemsRoute).toContain("if (workflow === 'vendor_due_diligence' || workflow === 'risk_review') return 'business' as const");
    expect(aiSystemsRoute).toContain('minimumPlan: getWorkflowMinimumPlan(workflow)');

    expect(governanceMigration).toContain('restrict_enterprise_vendor_due_diligence_business_plan');
    expect(governanceMigration).toContain('restrict_enterprise_risk_reviews_business_plan');
    expect(governanceMigration).toContain('restrict_enterprise_evidence_packs_enterprise_plan');
    expect(governanceMigration).toContain('restrict_enterprise_evidence_pack_items_enterprise_plan');
    expect(governanceMigration).toContain("app_private.has_minimum_commercial_plan(organization_id, 'business')");
    expect(governanceMigration).toContain("app_private.has_minimum_commercial_plan(organization_id, 'enterprise')");
    expect(governanceMigration).not.toContain('disable row level security');
    expect(governanceMigration).not.toContain('grant all on public.');
  });
});
