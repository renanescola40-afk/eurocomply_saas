import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 9 readiness export preparation', () => {
  it('keeps the selected export workflow documented', () => {
    const scope = read('docs/PHASE9_SCOPE.md');
    const inventory = read('docs/PHASE9_INVENTORY.md');
    const validation = read('docs/PHASE9_VALIDATION_PLAN.md');

    expect(scope).toContain('Readiness export preparation');
    expect(inventory).toContain('Readiness export preparation');
    expect(validation).toContain('Readiness export preparation');
  });

  it('uses the executive package and readiness supporting surfaces in Reports & Governance', () => {
    const reportingPackage = read('src/components/dashboard/executive-reporting-package.tsx');
    const readiness = read('src/components/dashboard/workflow-readiness-summary.tsx');
    const followUp = read('src/components/dashboard/readiness-follow-up-plan.tsx');
    const workspace = read('src/components/dashboard/reports-governance-workspace.tsx');

    expect(reportingPackage).toContain('Executive reporting package');
    expect(reportingPackage).toContain('Open reports');
    expect(readiness).toContain('Read-only reporting snapshot');
    expect(followUp).toContain('Follow-up planning');
    expect(workspace).toContain('executive-reporting-package');
  });

  it('renders the readiness export preparation surface in the dedicated governance workspace', () => {
    const exportPreparation = read('src/components/dashboard/readiness-export-preparation.tsx');
    const workspace = read('src/components/dashboard/reports-governance-workspace.tsx');

    expect(exportPreparation).toContain('ReadinessExportPreparation');
    expect(exportPreparation).toContain('Export preparation');
    expect(exportPreparation).toContain('Prepare from reports');
    expect(exportPreparation).toContain('workflowReadiness?.reasons.length');
    expect(workspace).toContain('ReadinessExportPreparation');
    expect(workspace).toContain('readiness-export-preparation');
  });

  it('keeps export preparation safe before additional runtime changes', () => {
    const validation = read('docs/PHASE9_VALIDATION_PLAN.md');

    expect(validation).toContain('Export preparation remains read-only');
    expect(validation).toContain('Reports navigation remains the safe export preparation entrypoint');
    expect(validation).toContain('No product, email, document, or UI template changes are required');
  });
});
