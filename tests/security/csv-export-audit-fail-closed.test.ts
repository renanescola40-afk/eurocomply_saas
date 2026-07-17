import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const exportsUnderAudit = [
  {
    name: 'tasks',
    path: 'src/app/api/reports/tasks.csv/route.ts',
    auditArea: "area: 'tasks_csv_export_audit'",
    unavailableResponse: "return noStoreJson({ error: 'Tasks export is temporarily unavailable' }, { status: 503 });",
    download: "return csvDownloadResponse(rows, 'tasks-report.csv');",
  },
  {
    name: 'risks',
    path: 'src/app/api/reports/risks.csv/route.ts',
    auditArea: "area: 'risks_csv_export_audit'",
    unavailableResponse: "return noStoreJson({ error: 'Risks export is temporarily unavailable' }, { status: 503 });",
    download: "return csvDownloadResponse(rows, 'risks-report.csv');",
  },
  {
    name: 'vendors',
    path: 'src/app/api/reports/vendors.csv/route.ts',
    auditArea: "area: 'vendors_csv_export_audit'",
    unavailableResponse: "return noStoreJson({ error: 'Vendors export is temporarily unavailable' }, { status: 503 });",
    download: "return csvDownloadResponse(rows, 'vendors-report.csv');",
  },
  {
    name: 'documents',
    path: 'src/app/api/reports/documents.csv/route.ts',
    auditArea: "area: 'documents_csv_export_audit'",
    unavailableResponse: "return noStoreJson({ error: 'Documents export is temporarily unavailable' }, { status: 503 });",
    download: "return csvDownloadResponse(rows, 'documents-report.csv');",
  },
  {
    name: 'executive',
    path: 'src/app/api/reports/executive.csv/route.ts',
    auditArea: "area: 'executive_csv_export_audit'",
    unavailableResponse: "return noStoreJson({ error: 'Executive export is temporarily unavailable' }, { status: 503 });",
    download: "return csvDownloadResponse(rows, 'executive-report.csv');",
  },
] as const;

describe('CSV export audit persistence', () => {
  for (const exportRoute of exportsUnderAudit) {
    it(`does not return the ${exportRoute.name} CSV when its audit event is not persisted`, () => {
      const source = readFileSync(exportRoute.path, 'utf8');

      expect(source).toContain('const auditResult = await writeAuditLog({');
      expect(source).toContain('if (!auditResult.persisted)');
      expect(source).toContain(exportRoute.auditArea);
      expect(source).toContain(exportRoute.unavailableResponse);

      const auditGuardIndex = source.indexOf('if (!auditResult.persisted)');
      const downloadIndex = source.indexOf(exportRoute.download);

      expect(auditGuardIndex).toBeGreaterThan(-1);
      expect(downloadIndex).toBeGreaterThan(auditGuardIndex);
    });
  }

  it('records business rows rather than CSV header rows', () => {
    const documents = readFileSync('src/app/api/reports/documents.csv/route.ts', 'utf8');
    const executive = readFileSync('src/app/api/reports/executive.csv/route.ts', 'utf8');

    expect(documents).toContain('const exportedRowCount = data?.length ?? 0;');
    expect(documents).toContain("metadata: { format: 'csv', report: 'documents', rows: exportedRowCount }");
    expect(documents).not.toContain("metadata: { format: 'csv', report: 'documents', rows: rows.length }");

    expect(executive).toContain('const exportedRowCount = rows.length - 1;');
    expect(executive).toContain("metadata: { format: 'csv', report: 'executive', rows: exportedRowCount }");
  });
});
