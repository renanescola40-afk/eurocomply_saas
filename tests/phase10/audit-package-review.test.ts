import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 10 audit package review', () => {
  it('keeps the selected audit review workflow documented', () => {
    const scope = read('docs/PHASE10_SCOPE.md');
    const inventory = read('docs/PHASE10_INVENTORY.md');
    const validation = read('docs/PHASE10_VALIDATION_PLAN.md');

    expect(scope).toContain('Audit package review');
    expect(inventory).toContain('Audit package review');
    expect(validation).toContain('Audit package review');
  });

  it('uses readiness export and package supporting surfaces in Reports & Governance', () => {
    const exportPreparation = read('src/components/dashboard/readiness-export-preparation.tsx');
    const reportingPackage = read('src/components/dashboard/executive-reporting-package.tsx');
    const readiness = read('src/components/dashboard/workflow-readiness-summary.tsx');
    const followUp = read('src/components/dashboard/readiness-follow-up-plan.tsx');
    const workspace = read('src/components/dashboard/reports-governance-workspace.tsx');

    expect(exportPreparation).toContain('Export preparation');
    expect(exportPreparation).toContain('Prepare from reports');
    expect(reportingPackage).toContain('Executive reporting package');
    expect(readiness).toContain('Read-only reporting snapshot');
    expect(followUp).toContain('Follow-up planning');
    expect(workspace).toContain('readiness-export-preparation');
    expect(workspace).toContain('AuditPackageReview');
    expect(workspace).toContain('audit-package-review');
  });

  it('keeps audit package review safe before additional runtime changes', () => {
    const validation = read('docs/PHASE10_VALIDATION_PLAN.md');

    expect(validation).toContain('Audit package review remains read-only');
    expect(validation).toContain('Reports navigation remains the safe review entrypoint');
    expect(validation).toContain('No product, email, document, or UI template changes are required');
  });
});
