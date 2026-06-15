import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 7 readiness follow-up workflow', () => {
  it('keeps the selected workflow documented', () => {
    const scope = read('docs/PHASE7_SCOPE.md');
    const inventory = read('docs/PHASE7_INVENTORY.md');
    const validation = read('docs/PHASE7_VALIDATION_PLAN.md');

    expect(scope).toContain('Readiness review follow-up planning for organization dashboards');
    expect(inventory).toContain('Readiness review follow-up planning for organization dashboards');
    expect(validation).toContain('Readiness review follow-up planning for organization dashboards');
  });

  it('uses the existing readiness summary and action surfaces', () => {
    const summary = read('src/components/dashboard/workflow-readiness-summary.tsx');
    const actions = read('src/components/dashboard/next-best-actions.tsx');
    const overview = read('src/components/dashboard/dashboard-home-overview.tsx');

    expect(summary).toContain('Read-only reporting snapshot');
    expect(summary).toContain('workflowReadiness?.reasons');
    expect(actions).toContain('buildWorkflowReadinessAction');
    expect(actions).toContain('current workflow readiness');
    expect(overview).toContain('WorkflowReadinessSummary');
  });

  it('keeps the workflow safe before additional runtime changes', () => {
    const validation = read('docs/PHASE7_VALIDATION_PLAN.md');

    expect(validation).toContain('workflow remains safe and read-only');
    expect(validation).toContain('No product, email, document, or UI template changes are required');
    expect(validation).toContain('Do not commit local environment files, provider credentials, private keys, service credentials, or customer data');
  });
});
