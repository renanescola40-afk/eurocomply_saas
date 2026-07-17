import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/reports/tasks.csv/route.ts';

describe('tasks CSV export audit persistence', () => {
  it('does not return a downloadable CSV when the audit event is not persisted', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const auditResult = await writeAuditLog({');
    expect(source).toContain('if (!auditResult.persisted)');
    expect(source).toContain("area: 'tasks_csv_export_audit'");
    expect(source).toContain("return noStoreJson({ error: 'Tasks export is temporarily unavailable' }, { status: 503 });");

    const auditGuardIndex = source.indexOf('if (!auditResult.persisted)');
    const downloadIndex = source.indexOf("return csvDownloadResponse(rows, 'tasks-report.csv');");

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(downloadIndex).toBeGreaterThan(auditGuardIndex);
  });
});
