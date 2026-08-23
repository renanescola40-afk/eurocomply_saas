import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const organizationSource = readFileSync(resolve(repoRoot, 'src/server/queries/current-organization.ts'), 'utf8');
const marketingSource = readFileSync(resolve(repoRoot, 'src/app/[locale]/trust/page.tsx'), 'utf8');

describe('organization source integrity', () => {
  it('keeps one memberships query export', () => {
    const exports = organizationSource.match(/export async function getUserOrganizationMemberships/g) ?? [];

    expect(exports).toHaveLength(1);
  });

  it('keeps localized Trust Center authority bound before render', () => {
    expect(marketingSource).toContain("getLocalizedTrustCenterPage('trust', locale)");
    expect(marketingSource).toContain('applyVerifiedTrustAuthority(');
    expect(marketingSource).toContain('<TrustCenterPage locale={locale} page={page} />');
    expect(marketingSource).not.toContain('TRUST_COPY[locale]');
    expect(marketingSource).not.toContain('const page = copy[locale];');
  });
});
