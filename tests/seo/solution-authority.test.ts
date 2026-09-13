import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const model = read('src/lib/seo/solution-pages.ts');
const hub = read('src/app/[locale]/solutions/page.tsx');
const detail = read('src/app/[locale]/solutions/[solution]/page.tsx');
const sitemap = read('src/app/sitemap.ts');
const middleware = read('src/middleware.ts');

describe('commercial solution authority', () => {
  it('publishes a bounded high-intent solution set instead of thin keyword variants', () => {
    for (const slug of [
      'eu-ai-act-compliance-software',
      'ai-governance-platform',
      'ai-inventory-software',
    ]) {
      expect(model).toContain(`'${slug}'`);
    }
    expect(model).toContain('SOLUTION_KEYS');
    expect(model).toContain('getSolutionPath');
  });

  it('keeps the solution hub and nested pages public without changing private-route semantics', () => {
    expect(middleware).toContain("'/solutions',");
    expect(middleware).toContain("PUBLIC_ROUTE_PREFIXES = ['/features/', '/tools/', '/solutions/']");
    expect(middleware).toContain('const requestHeaders = trustedRequestHeaders(req, requestId);');
  });

  it('publishes the hub and every solution page through the canonical sitemap', () => {
    expect(sitemap).toContain("'/solutions'");
    expect(sitemap).toContain('getSolutionPages');
    expect(sitemap).toContain('getSolutionPath');
    expect(sitemap).toContain("languages: { en: url, 'x-default': url }");
  });

  it('uses answer-engine friendly visible answers and matching structured data', () => {
    expect(detail).toContain('Direct answer');
    expect(detail).toContain("'@type': 'FAQPage'");
    expect(detail).toContain("'@type': 'SoftwareApplication'");
    expect(detail).toContain("'@type': 'WebPage'");
    expect(detail).toContain("'@type': 'BreadcrumbList'");
    expect(detail).toContain('page.faq.map');
  });

  it('fails closed for unsupported locales and uses one English canonical authority', () => {
    expect(hub).toContain("locale !== 'en'");
    expect(hub).toContain('notFound()');
    expect(detail).toContain("locale !== 'en'");
    expect(detail).toContain('notFound()');
    expect(hub).toContain("languages: { en: url, 'x-default': url }");
    expect(detail).toContain("languages: { en: url, 'x-default': url }");
  });

  it('anchors regulatory context in primary sources and preserves claim safety', () => {
    expect(model).toContain('eur-lex.europa.eu/eli/reg/2024/1689/oj');
    expect(model).toContain('ai-act-service-desk.ec.europa.eu');
    expect(detail).toContain('Authoritative sources');
    expect(detail).toContain('does not provide legal advice');
    expect(detail).toContain('guarantee compliance outcomes');
  });

  it('links category demand to real product capability pages and trackable CTAs', () => {
    expect(model).toContain('/en/features/eu-ai-act-readiness');
    expect(model).toContain('/en/features/ai-governance-workflows');
    expect(model).toContain('/en/features/ai-inventory');
    expect(hub).toContain('data-cta-id');
    expect(detail).toContain('data-cta-id');
  });
});
