import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const legacyRiskPagePath = 'src/app/[locale]/riscos/page.tsx';
const legacyDocumentsPagePath = 'src/app/[locale]/documentos/page.tsx';
const canonicalRiskPath = '/dashboard/organizations/risks';
const canonicalDocumentsPath = '/dashboard/organizations/documents';

describe('legacy tenant-data route retirement', () => {
  it('keeps localized compatibility routes as server redirects only', () => {
    const legacyRiskPage = read(legacyRiskPagePath);
    const legacyDocumentsPage = read(legacyDocumentsPagePath);

    expect(legacyRiskPage).toContain(`redirect(\`/\${locale}${canonicalRiskPath}\`)`);
    expect(legacyDocumentsPage).toContain(`redirect(\`/\${locale}${canonicalDocumentsPath}\`)`);

    for (const source of [legacyRiskPage, legacyDocumentsPage]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|demoRisks|defaultDocuments/);
      expect(source).not.toMatch(/getCurrentUser|getCurrentOrganizationForUser|getOrganizationEntitlements|listDocuments/);
      expect(source).not.toMatch(/risks-client|documents-client|nextDynamic/);
    }
  });

  it('removes the browser-owned tenant record implementations and their global keys', () => {
    expect(existsSync(join(root, 'src/app/[locale]/riscos/risks-client.tsx'))).toBe(false);
    expect(existsSync(join(root, 'src/app/[locale]/documentos/documents-client.tsx'))).toBe(false);
    expect(existsSync(join(root, 'src/app/[locale]/documentos/loading.tsx'))).toBe(false);
    expect(existsSync(join(root, 'src/app/[locale]/documentos/error.tsx'))).toBe(false);
    expect(existsSync(join(root, 'src/app/[locale]/dashboard/organizations/documents/loading.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/app/[locale]/dashboard/organizations/documents/error.tsx'))).toBe(true);

    const appSources = [
      legacyRiskPagePath,
      legacyDocumentsPagePath,
      'src/components/dashboard/dashboard-command-navigation.tsx',
      'src/components/dashboard/dashboard-navigation-i18n.ts',
    ].map(read).join('\n');

    expect(appSources).not.toContain('eurocomply-risk-register-demo');
    expect(appSources).not.toContain('eurocomply-controlled-documents-demo');
  });

  it('routes product navigation directly to the canonical tenant-backed pages', () => {
    const navigation = read('src/components/dashboard/dashboard-command-navigation.tsx');
    const localizedNavigation = read('src/components/dashboard/dashboard-navigation-i18n.ts');
    const approvals = read('src/app/[locale]/aprovacoes/approvals-client.tsx');
    const raci = read('src/app/[locale]/raci/raci-client.tsx');
    const addOns = read('src/app/[locale]/dashboard/organizations/add-ons/page.tsx');

    expect(navigation).toContain('href: `${dashboardRoot}/documents`');
    expect(navigation).toContain('href: `${dashboardRoot}/risks`');
    expect(localizedNavigation).toContain('href: `${dashboardRoot}/documents`');
    expect(localizedNavigation).toContain('href: `${dashboardRoot}/risks`');

    for (const source of [navigation, localizedNavigation, approvals, raci, addOns]) {
      expect(source).not.toMatch(/href:\s*['"]\/documentos['"]/);
      expect(source).not.toMatch(/href:\s*['"]\/riscos['"]/);
      expect(source).not.toMatch(/\$\{locale\}\/documentos/);
      expect(source).not.toMatch(/\$\{locale\}\/riscos/);
    }

    expect(approvals).toContain(canonicalDocumentsPath);
    expect(raci).toContain(canonicalDocumentsPath);
    expect(addOns).toContain(`'${canonicalDocumentsPath}'`);
  });

  it('retains server-side tenant authority on both canonical pages', () => {
    const canonicalRisks = read('src/app/[locale]/dashboard/organizations/risks/page.tsx');
    const canonicalDocuments = read('src/app/[locale]/dashboard/organizations/documents/page.tsx');

    expect(canonicalRisks).toContain('getCurrentOrganizationForUser');
    expect(canonicalRisks).toContain('listRisks(organization.id)');
    expect(canonicalRisks).toContain('createRisk');
    expect(canonicalDocuments).toContain('getCurrentOrganizationForUser');
    expect(canonicalDocuments).toContain('listDocuments(currentOrganization.id)');
    expect(canonicalDocuments).toContain('uploadDocument');
    expect(canonicalDocuments).toContain("fetchCache = 'force-no-store'");
    expect(canonicalDocuments).toContain('noStore()');
  });

  it('treats the canonical risk path as analytics-sensitive', () => {
    const analyticsClient = read('src/lib/analytics/posthog-client.ts');
    expect(analyticsClient).toContain('/\\/risks?(\\/|$)/i');
  });
});
