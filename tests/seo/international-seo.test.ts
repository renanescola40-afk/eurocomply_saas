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
    expect(metadata).toContain("'x-default': `${appUrl}/${defaultLocale}${normalizedPath}`");

    expect(nextConfig).toContain('localeLessPublicCanonicalRedirects');
    expect(nextConfig).toContain("source: '/:path(pricing|enterprise|resources|faq|about|contact|book-demo|trust|security|compliance|data-processing|sla|privacy|terms|cookie-policy|acceptable-use|transfers|dpa|subprocessors|status|vulnerability-disclosure)'");
    expect(nextConfig).toContain("destination: '/en/:path'");
    expect(nextConfig).toContain("source: '/trust/:path*'");
    expect(nextConfig).toContain("destination: '/en/trust/:path*'");
    expect(nextConfig).toContain('permanent: true');

    // Feature slugs are localized, so a generic /features/* -> /en/features/*
    // redirect would be unsafe for Spanish/French/German localized slugs.
    expect(nextConfig).not.toContain("destination: '/en/features/:path*'");
  });

  it('ships eight fully authored feature intents in every supported locale', () => {
    for (const locale of localeFiles) {
      const path = `src/lib/seo/feature-pages/${locale}.ts`;
      expect(existsSync(path), `missing localized feature file ${path}`).toBe(true);
      const content = read(path);

      for (const featureKey of featureKeys) {
        expect(content).toContain(`key: '${featureKey}'`);
      }

      expect(content.match(/\n\s+slug: '/g)?.length).toBe(featureKeys.length);
      expect(content).not.toContain(': enFeaturePages');
    }
  });

  it('publishes localized feature routes with canonical, hreflang and structured data', () => {
    const featureRoute = read('src/app/[locale]/features/[feature]/page.tsx');
    const helpers = read('src/lib/seo/feature-pages/index.ts');

    expect(featureRoute).toContain('generateStaticParams');
    expect(featureRoute).toContain('getFeatureLanguageAlternates');
    expect(featureRoute).toContain("'@type': 'FAQPage'");
    expect(featureRoute).toContain("'@type': 'BreadcrumbList'");
    expect(featureRoute).toContain("'@type': 'SoftwareApplication'");
    expect(helpers).toContain("'x-default'");
    expect(helpers).toContain('getFeaturePath');
  });

  it('keeps feature pages public, cached and discoverable in the sitemap', () => {
    const middleware = read('src/middleware.ts');
    const nextConfig = read('next.config.ts');
    const sitemap = read('src/app/sitemap.ts');

    expect(middleware).toContain("PUBLIC_ROUTE_PREFIXES = ['/features/']");
    expect(nextConfig).toContain('/features/:path*');
    expect(sitemap).toContain('getFeaturePages');
    expect(sitemap).toContain('getFeatureLanguageAlternates');
    expect(sitemap).toContain('getFeaturePath');
  });

  it('adds brand entity data and keeps provisional status or mixed-language assurance pages out of the acquisition index', () => {
    const homepage = read('src/app/[locale]/page.tsx');
    const structuredData = read('src/components/seo/site-structured-data.tsx');
    const nextConfig = read('next.config.ts');
    const sitemap = read('src/app/sitemap.ts');

    expect(homepage).toContain('SiteStructuredData');
    expect(structuredData).toContain("'@type': 'WebSite'");
    expect(structuredData).toContain("'@type': 'Organization'");
    expect(structuredData).toContain("alternateName: 'Risck Comply'");
    expect(nextConfig).toContain('provisionalLocaleNoIndexHeaders');
    expect(sitemap).not.toContain("'/status'");
  });
});
