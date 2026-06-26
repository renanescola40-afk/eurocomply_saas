import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const organizationSource = readFileSync(resolve(repoRoot, 'src/server/queries/current-organization.ts'), 'utf8');
const trustRouteSource = readFileSync(resolve(repoRoot, 'src/app/[locale]/trust/page.tsx'), 'utf8');
const trustShellSource = readFileSync(resolve(repoRoot, 'src/components/marketing/trust-center-page.tsx'), 'utf8');

describe('organization source integrity', () => {
  it('keeps one memberships query export', () => {
    const exports = organizationSource.match(/export async function getUserOrganizationMemberships/g) ?? [];

    expect(exports).toHaveLength(1);
  });

  it('keeps localized trust content bound before render', () => {
    expect(trustRouteSource).toContain('<TrustCenterPage locale={locale} kind="trust" />');
    expect(trustShellSource).toContain('const locale = getLocale(rawLocale);');
    expect(trustShellSource).toContain('const content = PAGE_CONTENT[kind];');
    expect(trustShellSource).not.toContain('const page = copy[locale];');
  });
});
