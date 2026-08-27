import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 6 readiness reporting surface', () => {
  it('keeps the phase 6 scope read-only', () => {
    const content = read('docs/PHASE6_SCOPE.md');

    expect(content).toContain('Read-only organization workflow readiness reporting');
    expect(content).toContain('Add tests or static checkers before runtime changes');
    expect(content).toContain('Product template changes');
  });

  it('maps the reporting surface to the existing readiness signal', () => {
    const content = read('docs/PHASE6_INVENTORY.md');

    expect(content).toContain('src/server/queries/organization-dashboard.ts');
    expect(content).toContain('OrganizationWorkflowReadiness');
    expect(content).toContain('workflowReadiness');
    expect(content).toContain('getOrganizationWorkflowReadiness');
  });

  it('keeps validation focused on read-only readiness reporting', () => {
    const content = read('docs/PHASE6_VALIDATION_PLAN.md');

    expect(content).toContain('reporting surface remains read-only');
    expect(content).toContain('Existing dashboard consumers continue to receive the readiness signal');
    expect(content).toContain('npm run phase6:check');
  });

  it('keeps the readiness signal wired into the dashboard consumer chain', () => {
    const page = read('src/app/[locale]/dashboard/organizations/page.tsx');
    const overview = read('src/components/dashboard/dashboard-home-overview.tsx');
    const actions = read('src/components/dashboard/next-best-actions.tsx');

    expect(page).toContain('workflowReadiness={data.workflowReadiness}');
    expect(overview).toContain('workflowReadiness={workflowReadiness}');
    expect(actions).toContain('buildWorkflowReadinessAction');
    expect(actions).toContain('current workflow readiness');
  });

  it('renders the dedicated read-only readiness summary in Reports & Governance', () => {
    const workspace = read('src/components/dashboard/reports-governance-workspace.tsx');
    const reportsPage = read('src/app/[locale]/dashboard/organizations/reports-governance/page.tsx');
    const summary = read('src/components/dashboard/workflow-readiness-summary.tsx');

    expect(reportsPage).toContain('ReportsGovernanceWorkspace');
    expect(reportsPage).toContain('workflowReadiness={data.workflowReadiness}');
    expect(workspace).toContain('WorkflowReadinessSummary');
    expect(workspace).toContain('workflow-readiness');
    expect(summary).toContain('Read-only reporting snapshot');
    expect(summary).toContain('workflowReadiness?.reasons');
    expect(summary).toContain('Current workflow signals are healthy for the read-only reporting flow.');
  });
});
