import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const RISKS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/risks/page.tsx', import.meta.url);

describe('enterprise risk register V2', () => {
  it('keeps governed mutations and plan enforcement while presenting risks as a table', async () => {
    const source = await readFile(RISKS_PAGE, 'utf8');

    expect(source).toContain("import { PlanGate } from '@/components/billing/plan-gate'");
    expect(source).toContain('createRiskAction');
    expect(source).toContain('deleteRiskAction');
    expect(source).toContain('<StepUpCsvExportButton');
    expect(source).toContain('<CreateRiskForm onSubmit={createRiskAction} />');
    expect(source).toContain('<DeleteRecordButton');
    expect(source).toContain('<table');
    expect(source).toContain('Live organization records ordered by risk score.');
  });

  it('derives executive risk metrics from loaded organization data', async () => {
    const source = await readFile(RISKS_PAGE, 'utf8');

    expect(source).toContain('const scoredRisks = risks.map');
    expect(source).toContain('const openRisks = scoredRisks.filter');
    expect(source).toContain('const criticalRisks = scoredRisks.filter');
    expect(source).toContain('const averageScore = scoredRisks.length > 0');
    expect(source).not.toContain("['24'");
    expect(source).not.toContain("'87%'");
  });
});
