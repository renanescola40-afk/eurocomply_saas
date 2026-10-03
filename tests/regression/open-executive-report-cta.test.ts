import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Reports & Governance executive report CTA regression', () => {
  it('routes the executive report CTA to the reports page for the current locale base path', () => {
    const workspace = read('src/components/dashboard/reports-governance-workspace.tsx');
    const hero = read('src/components/dashboard/executive-dashboard-hero.tsx');

    expect(workspace).toContain("const reportsHref = `${basePath}/reports`;");
    expect(workspace).not.toContain("const reportsHref = `${basePath}/reports-governance`;");
    expect(hero).toContain('<Link href={reportsHref}');
    expect(hero).toContain('Open executive report');
  });

  it('keeps the related open-actions CTA deriving the tasks route from the corrected reports target', () => {
    const hero = read('src/components/dashboard/executive-dashboard-hero.tsx');

    expect(hero).toContain("reportsHref.replace('/reports', '/tasks')");
    expect(hero).toContain('Review open actions');
  });
});
