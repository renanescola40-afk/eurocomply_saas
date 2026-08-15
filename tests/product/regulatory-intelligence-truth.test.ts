import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('regulatory intelligence product truth', () => {
  it('shows only published intelligence with a dated HTTPS source reference', () => {
    const query = read('src/server/queries/intelligence.ts');

    expect(query).toContain(".not('published_at', 'is', null)");
    expect(query).toContain(".not('reference_url', 'is', null)");
    expect(query).toContain("parsed.protocol === 'https:'");
    expect(query).toContain('if (!item.published_at || !sourceUrl) return null;');
    expect(query).not.toContain('fallbackIntelligenceItems');
    expect(query).not.toContain('publishedAt: item.published_at ?? new Date().toISOString()');
  });

  it('keeps internal refresh probes draft and non-public', () => {
    const refresh = read('src/app/api/intelligence/refresh/route.ts');

    expect(refresh).toContain('published_at: null');
    expect(refresh).toContain('reference_url: null');
    expect(refresh).toContain("status: 'draft'");
    expect(refresh).not.toContain('published_at: new Date().toISOString()');
  });

  it('uses the canonical Regulatory Monitoring entitlement including active add-ons', () => {
    const page = read('src/app/[locale]/dashboard/organizations/reports-governance/news/page.tsx');
    const detail = read('src/app/[locale]/dashboard/organizations/reports-governance/news/[id]/page.tsx');

    for (const source of [page, detail]) {
      expect(source).toContain("canAccessFeature('regulatory_monitoring'");
      expect(source).toContain('listActiveOrganizationAddOns');
      expect(source).toContain('activeAddOns,');
      expect(source).not.toContain("isPlanAtLeast(entitlements.plan, 'professional')");
    }
    expect(page).toContain('addon=regulatory-monitoring-pro');
    expect(detail).toContain('addon=regulatory-monitoring-pro');
  });

  it('renders source provenance as a real outbound link in list and detail views', () => {
    const page = read('src/app/[locale]/dashboard/organizations/reports-governance/news/page.tsx');
    const detail = read('src/app/[locale]/dashboard/organizations/reports-governance/news/[id]/page.tsx');

    for (const source of [page, detail]) {
      expect(source).toContain('href={item.sourceUrl}');
      expect(source).toContain('target="_blank"');
      expect(source).toContain('rel="noreferrer"');
    }
    expect(detail).toContain('item.referenceLabel');
    expect(detail).toContain('item.contentRights');
  });

  it('does not market an unmodeled Premium News product', () => {
    const page = read('src/app/[locale]/dashboard/organizations/reports-governance/news/page.tsx');
    const detail = read('src/app/[locale]/dashboard/organizations/reports-governance/news/[id]/page.tsx');

    expect(page).not.toContain('Premium News');
    expect(detail).not.toContain('Premium News');
    expect(page).toContain('Regulatory Monitoring Pro');
    expect(detail).toContain('Regulatory Monitoring Pro');
  });

  it('has an honest empty state instead of synthetic latest news', () => {
    const page = read('src/app/[locale]/dashboard/organizations/reports-governance/news/page.tsx');

    expect(page).toContain('No source-verified regulatory updates are published right now.');
    expect(page).toContain('A RISCK COMPLY não substitui um feed real por notícias sintéticas ou sem data.');
  });
});
