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
    expect(source).toContain('selectedPlan={authority?.plan}');
    expect(source).not.toContain('min-h-screen bg-[#050505] px-5 py-8');
  });
});
