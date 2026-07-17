import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const reportRoutes = [
  'src/app/api/reports/risks.csv/route.ts',
  'src/app/api/reports/tasks.csv/route.ts',
  'src/app/api/reports/vendors.csv/route.ts',
];

describe('CSV export audit row-count integrity', () => {
  for (const route of reportRoutes) {
    it(`${route} records exported data rows without counting the CSV header`, () => {
      const source = readFileSync(route, 'utf8');

      expect(source).toContain('const exportedRowCount = data?.length ?? 0;');
      expect(source).toContain('rows: exportedRowCount');
      expect(source).not.toMatch(/metadata:\s*\{[^}]*rows:\s*rows\.length/s);
    });
  }
});
