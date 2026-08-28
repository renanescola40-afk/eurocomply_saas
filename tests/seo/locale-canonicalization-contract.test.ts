import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('locale canonicalization contract', () => {
  it('keeps locale-prefixed HTML and sitemap metadata as the single hreflang authority', () => {
    const routing = read('src/lib/i18n/routing.ts');

    expect(routing).toContain("localePrefix: 'always'");
    expect(routing).toContain('alternateLinks: false');
  });

  it('permanently collapses only fixed public locale-less aliases to English', () => {
    const nextConfig = read('next.config.ts');

    expect(nextConfig).toContain('localeLessPublicCanonicalRedirects');
    expect(nextConfig).toContain("source: '/:path(pricing|enterprise|resources|faq|about|contact|book-demo|trust|security|compliance|data-processing|sla|privacy|terms|cookie-policy|acceptable-use|transfers|dpa|subprocessors|status|vulnerability-disclosure)'");
    expect(nextConfig).toContain("destination: '/en/:path'");
    expect(nextConfig).toContain("source: '/trust/:path*'");
    expect(nextConfig).toContain("destination: '/en/trust/:path*'");
    expect(nextConfig).toContain('permanent: true');
  });

  it('does not force localized feature slugs or private product routes to English', () => {
    const nextConfig = read('next.config.ts');

    expect(nextConfig).not.toContain("destination: '/en/features/:path*'");
    expect(nextConfig).not.toContain("source: '/:path(login|signup|register|reset-password|onboarding|checkout|dashboard|settings|billing|team|profile)'");
  });
});
