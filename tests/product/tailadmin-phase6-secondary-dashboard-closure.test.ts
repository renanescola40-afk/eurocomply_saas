import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const EXECUTIVE = new URL('../../src/app/[locale]/dashboard/executive/page.tsx', import.meta.url);
const AUDIT_PACK = new URL('../../src/app/[locale]/dashboard/audit-pack/page.tsx', import.meta.url);
const BOARD_REPORT = new URL('../../src/app/[locale]/dashboard/board-report/page.tsx', import.meta.url);
const OBSERVABILITY = new URL('../../src/app/[locale]/dashboard/observability/page.tsx', import.meta.url);
const GAP_ANALYSIS = new URL('../../src/app/[locale]/dashboard/gap-analysis/page.tsx', import.meta.url);
const TEMPLATES = new URL('../../src/app/[locale]/dashboard/organizations/templates/page.tsx', import.meta.url);
const REPORTS = new URL('../../src/app/[locale]/dashboard/organizations/reports/page.tsx', import.meta.url);
const ORGANIZATION_ERROR = new URL('../../src/app/[locale]/dashboard/organizations/error.tsx', import.meta.url);

const SECONDARY_SURFACES = [
  EXECUTIVE,
  AUDIT_PACK,
  BOARD_REPORT,
  OBSERVABILITY,
  GAP_ANALYSIS,
  TEMPLATES,
  REPORTS,
  ORGANIZATION_ERROR,
];

describe('TailAdmin phase 6 secondary dashboard closure', () => {
  it('keeps secondary dashboard routes on the shared compact graphite canvas', async () => {
    const sources = await Promise.all(SECONDARY_SURFACES.map((file) => readFile(file, 'utf8')));

    for (const source of sources) {
      expect(source).toContain('rounded-xl');
      expect(source).not.toContain('radial-gradient');
      expect(source).not.toContain('rounded-[2rem]');
      expect(source).not.toContain('rounded-[1.75rem]');
      expect(source).not.toContain('shadow-2xl');
      expect(source).not.toContain('blur-3xl');
      expect(source).not.toContain('Sparkles');
      expect(source).not.toContain('text-7xl');
    }
  });

  it('preserves the real workflow and export authorities behind the redesigned surfaces', async () => {
    const [executive, auditPack, boardReport, observability, gapAnalysis, templates, reports] = await Promise.all([
      readFile(EXECUTIVE, 'utf8'),
      readFile(AUDIT_PACK, 'utf8'),
      readFile(BOARD_REPORT, 'utf8'),
      readFile(OBSERVABILITY, 'utf8'),
      readFile(GAP_ANALYSIS, 'utf8'),
      readFile(TEMPLATES, 'utf8'),
      readFile(REPORTS, 'utf8'),
    ]);

    expect(executive).toContain('ExecutiveComplianceSummary');
    expect(auditPack).toContain('buildAuditPackData');
    expect(auditPack).toContain('auditPackToText');
    expect(boardReport).toContain('buildBoardReportData');
    expect(boardReport).toContain('printCurrentPage');
    expect(observability).toContain("export const fetchCache = 'force-no-store'");
    expect(observability).toContain('POST /api/observability/smoke');
    expect(gapAnalysis).toContain('trySaveGapAssessment');
    expect(gapAnalysis).toContain('tryCreateFindingsAndTasks');
    expect(templates).toContain('createTaskFromTemplate');
    expect(templates).toContain('createDocumentFromTemplate');
    expect(reports).toContain('StepUpCsvExportButton');
    expect(reports).toContain("endpoint: '/api/reports/executive.csv'");
  });

  it('does not present observability thresholds as live production measurements', async () => {
    const source = await readFile(OBSERVABILITY, 'utf8');

    expect(source).toContain('operatingSignals');
    expect(source).toContain("target: '< 1% target'");
    expect(source).toContain("target: '< 800ms target'");
    expect(source).not.toContain("label: 'Error rate',\n    value:");
    expect(source).not.toContain('production-ready');
  });

  it('keeps report narrative bounded to current workspace data instead of readiness overclaims', async () => {
    const source = await readFile(REPORTS, 'utf8');

    expect(source).toContain('current workspace');
    expect(source).toContain('review against source registers before external use');
    expect(source).not.toContain('The program is ready for leadership review');
  });
});
