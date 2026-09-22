import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SHELL = resolve(ROOT, 'src/components/dashboard/enterprise-dashboard-shell.tsx');
const MIDDLEWARE = resolve(ROOT, 'src/middleware.ts');
const AI_DETAIL = resolve(ROOT, 'src/app/[locale]/ai-systems/[id]/page.tsx');

describe('buyer-ready UX publication closure', () => {
  it('keeps a responsive content frame in the enterprise shell', async () => {
    const source = await readFile(SHELL, 'utf8');

    expect(source).toContain('px-4 py-5 md:px-6 md:py-6 xl:px-8 xl:py-8 2xl:px-10 print:p-0');
  });

  it('uses English as the deterministic default unless the user explicitly selected another locale', async () => {
    const source = await readFile(MIDDLEWARE, 'utf8');

    expect(source).toContain('return defaultLocale;');
    expect(source).not.toContain("req.headers.get('CF-IPCountry')");
    expect(source).not.toContain("req.headers.get('Accept-Language')");
  });

  it('keeps AI system detail inside the canonical authenticated shell with breadcrumbs', async () => {
    const source = await readFile(AI_DETAIL, 'utf8');

    expect(source).toContain("import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell'");
    expect(source).toContain('<EnterpriseDashboardShell');
    expect(source).toContain('aria-label="Breadcrumb"');
    expect(source).toContain('selectedPlan={entitlements.plan}');
    expect(source).not.toContain('min-h-screen bg-[#050505] px-5 py-8');
  });

  it('keeps migrated authenticated product surfaces inside the canonical shell without nested main landmarks', async () => {
    const migratedPages = [
      'src/app/[locale]/raci/page.tsx',
      'src/app/[locale]/auditoria/page.tsx',
      'src/app/[locale]/ai-incidents/page.tsx',
      'src/app/[locale]/audit-pack/page.tsx',
      'src/app/[locale]/audit-pack/verify/page.tsx',
      'src/app/[locale]/document-generator/page.tsx',
      'src/app/[locale]/vendor-create/page.tsx',
      'src/app/[locale]/calendario-compliance/page.tsx',
      'src/app/[locale]/ai-questionnaire/page.tsx',
      'src/app/[locale]/policy-pack/page.tsx',
      'src/app/[locale]/continuity-center/page.tsx',
      'src/app/[locale]/retention-center/page.tsx',
      'src/app/[locale]/security-questionnaire/page.tsx',
    ];

    for (const page of migratedPages) {
      const source = await readFile(resolve(ROOT, page), 'utf8');
      expect(source, page).toContain('AuthenticatedProductShell');
      expect(source, page).not.toContain('DashboardCommandNavigation');
      const contentStart = source.indexOf('const content = (');
      const contentEnd = source.indexOf('\n  );\n\n  return', contentStart);
      expect(contentStart, page).toBeGreaterThanOrEqual(0);
      expect(contentEnd, page).toBeGreaterThan(contentStart);
      expect(source.slice(contentStart, contentEnd), page).not.toContain('<main');
    }
  });

  it('does not expose fake audit-log filter controls', async () => {
    const source = await readFile(resolve(ROOT, 'src/app/[locale]/auditoria/page.tsx'), 'utf8');

    expect(source).not.toContain('<select');
    expect(source).not.toContain('audit_events existir');
    expect(source).toContain("const t = copy[locale] ?? copy.en");
  });
});
