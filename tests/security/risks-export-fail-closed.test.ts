import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  new URL('../../src/app/api/reports/risks.csv/route.ts', import.meta.url),
  'utf8',
);

describe('risks CSV export backend failure handling', () => {
  it('does not present an empty CSV as a successful export when the admin client is unavailable', () => {
    const unavailableBranch = routeSource.match(
      /if \(!supabase\) \{([\s\S]*?)\n  \}/,
    )?.[1];

    expect(unavailableBranch).toBeDefined();
    expect(unavailableBranch).toContain("area: 'risks_csv_export_configuration'");
    expect(unavailableBranch).toContain('{ status: 503 }');
    expect(unavailableBranch).not.toContain('csvDownloadResponse');
    expect(unavailableBranch).not.toContain("action: 'report.export'");
    expect(unavailableBranch).not.toContain('fallback: true');
  });
});
