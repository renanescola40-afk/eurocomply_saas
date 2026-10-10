import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const localeFiles = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;
const featureKeys = [
  'ai-inventory',
  'ai-risk-assessment',
  'evidence-management',
  'ai-governance-workflows',
  'vendor-ai-risk',
  'eu-ai-act-readiness',
  'audit-trails',
  'compliance-documentation',
] as const;

describe('international SEO acquisition architecture', () => {
  it('uses one canonical production domain and redirects legacy hosts', () => {
    const metadata = read('src/lib/seo/public-metadata.ts');
    const nextConfig = read('next.config.ts');

    expect(metadata).toContain("SITE_DEFAULT_URL = 'https://www.risckcomply.com'");
    expect(metadata).not.toContain("SITE_DEFAULT_URL = 'https://risckcomply.app'");
    expect(nextConfig).toContain("value: 'risckcomply.com'");
    expect(nextConfig).toContain("value: 'risckcomply.app'");
    expect(nextConfig).toContain("destination: 'https://www.risckcomply.com/:path*'");
  });

  it('uses HTML/sitemap as the single hreflang authority and permanently collapses fixed locale-less public aliases', () => {
    const routing = read('src/lib/i18n/routing.ts');
    const metadata = read('src/lib/seo/public-metadata.ts');
    const nextConfig = read('next.config.ts');

    expect(routing).toContain("localePrefix: 'always'");
    expect(routing).toContain('alternateLinks: false');
    expect(metadata).toContain("const englishUrl = `${appUrl}/en${normalizedPath}`");
    expect(metadata).toContain("'x-default': englishUrl");
    expect(metadata).not.toContain('const entries = locales.map');

    expect(nextConfig).toContain('localeLessPublicCanonicalRedirects');
    expect(nextConfig).toContain("source: '/:path(pricing|enterprise|resources|faq|about|contact|book-demo|trust|security|compliance|data-processing|sla|privacy|terms|cookie-policy|acceptable-use|transfers|dpa|subprocessors|status|vulnerability-disclosure)'");
    expect(nextConfig).toContain("destination: '/en/:path'");
    expect(nextConfig).toContain("source: '/trust/:path*'");
    expect(nextConfig).toContain("destination: '/en/trust/:path*'");
    expect(nextConfig).toContain('permanent: true');

    // Historical locale feature URLs are redirected to canonical English by middleware.
    expect(nextConfig).not.toContain("destination: '/en/features/:path*'");
  });

  it('keeps one authored English feature catalog and historical compatibility modules', () => {
    const english = read('src/lib/seo/feature-pages/en.ts');
    for (const featureKey of featureKeys) {
      expect(english).toContain(`key: '${featureKey}'`);
    }
    expect(english.match(/\n\s+slug: '/g)?.length).toBe(featureKeys.length);

    for (const locale of localeFiles.filter((value) => value !== 'en')) {
      const path = `src/lib/seo/feature-pages/${locale}.ts`;
      expect(existsSync(path), `missing compatibility feature file ${path}`).toBe(true);
      expect(read(path)).toContain('enFeaturePages as');
    }
  });

  it('keeps feature content available while advertising only the English canonical in hreflang', () => {
    const featureRoute = read('src/app/[locale]/features/[feature]/page.tsx');
    const helpers = read('src/lib/seo/feature-pages/index.ts');

    expect(featureRoute).toContain('generateStaticParams');
    expect(featureRoute).toContain('getFeatureLanguageAlternates');
    expect(featureRoute).toContain("'@type': 'FAQPage'");
    expect(featureRoute).toContain("'@type': 'BreadcrumbList'");
    expect(featureRoute).toContain("'@type': 'SoftwareApplication'");
    expect(helpers).toContain("const englishUrl = `${siteUrl}${getFeaturePath('en', key)}`");
    expect(helpers).toContain("'x-default': englishUrl");
    expect(helpers).not.toContain('const entries = locales.map');
  });

  it('keeps feature and tool pages public, cached and discoverable in the sitemap', () => {
    const middleware = read('src/middleware.ts');
    const nextConfig = read('next.config.ts');
    const sitemap = read('src/app/sitemap.ts');

    expect(middleware).toMatch(/PUBLIC_ROUTE_PREFIXES\s*=\s*\[[^\]]*'\/features\/'/);
    expect(middleware).toMatch(/PUBLIC_ROUTE_PREFIXES\s*=\s*\[[^\]]*'\/tools\/'/);
    expect(nextConfig).toContain('/features/:path*');
    expect(sitemap).toContain("getFeaturePages('en')");
    expect(sitemap).toContain("getFeaturePath('en', page.key)");
    expect(sitemap).toContain('getFeatureLanguageAlternates');
    expect(sitemap).not.toContain('locales.flatMap');
  });

  it('adds brand entity data and keeps provisional status or mixed-language assurance pages out of the acquisition index', () => {
    const homepage = read('src/app/[locale]/page.tsx');
    const structuredData = read('src/components/seo/site-structured-data.tsx');
    const nextConfig = read('next.config.ts');
    const sitemap = read('src/app/sitemap.ts');

    expect(homepage).toContain('SiteStructuredData');
    expect(structuredData).toContain("'@type': 'WebSite'");
    expect(structuredData).toContain("'@type': 'Organization'");
    expect(structuredData).not.toContain("alternateName: 'Risck Comply'");
    expect(structuredData).toContain("inLanguage: 'en'");
    expect(nextConfig).toContain('provisionalLocaleNoIndexHeaders');
    expect(sitemap).not.toContain("'/status'");
  });
});
