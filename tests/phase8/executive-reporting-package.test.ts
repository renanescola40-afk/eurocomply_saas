import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 8 executive reporting package', () => {
  it('keeps the selected reporting workflow documented', () => {
    const scope = read('docs/PHASE8_SCOPE.md');
    const inventory = read('docs/PHASE8_INVENTORY.md');
    const validation = read('docs/PHASE8_VALIDATION_PLAN.md');

    expect(scope).toContain('Executive readiness reporting package preparation');
    expect(inventory).toContain('Executive readiness reporting package preparation');
    expect(validation).toContain('Executive readiness reporting package preparation');
  });

  it('uses the executive summary, readiness summary, and follow-up surfaces in Reports & Governance', () => {
    const hero = read('src/components/dashboard/executive-dashboard-hero.tsx');
    const readiness = read('src/components/dashboard/workflow-readiness-summary.tsx');
    const followUp = read('src/components/dashboard/readiness-follow-up-plan.tsx');
    const workspace = read('src/components/dashboard/reports-governance-workspace.tsx');

    expect(hero).toContain('ExecutiveDashboardHero');
    expect(readiness).toContain('Read-only reporting snapshot');
    expect(followUp).toContain('Follow-up planning');
    expect(workspace).toContain('ExecutiveDashboardHero');
    expect(workspace).toContain('WorkflowReadinessSummary');
    expect(workspace).toContain('ReadinessFollowUpPlan');
  });

  it('renders the executive reporting package surface in the dedicated governance workspace', () => {
    const reportingPackage = read('src/components/dashboard/executive-reporting-package.tsx');
    const workspace = read('src/components/dashboard/reports-governance-workspace.tsx');

    expect(reportingPackage).toContain('ExecutiveReportingPackage');
    expect(reportingPackage).toContain('Executive reporting package');
    expect(reportingPackage).toContain('Open reports');
    expect(reportingPackage).toContain('workflowReadiness?.reasons.length');
    expect(workspace).toContain('ExecutiveReportingPackage');
    expect(workspace).toContain('executive-reporting-package');
  });

  it('keeps the package safe before additional runtime changes', () => {
    const validation = read('docs/PHASE8_VALIDATION_PLAN.md');

    expect(validation).toContain('reporting package remains read-only');
    expect(validation).toContain('No product, email, document, or UI template changes are required');
    expect(validation).toContain('Do not commit local environment files, provider credentials, private keys, service credentials, or customer data');
  });
});
