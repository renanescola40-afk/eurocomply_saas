import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const sitemap = readFileSync(join(process.cwd(), 'src/app/sitemap.ts'), 'utf8');
const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
const middleware = readFileSync(join(process.cwd(), 'src/middleware.ts'), 'utf8');
const toolsPage = readFileSync(join(process.cwd(), 'src/app/[locale]/tools/page.tsx'), 'utf8');
const assessmentPage = readFileSync(join(process.cwd(), 'src/app/[locale]/tools/ai-act-readiness/page.tsx'), 'utf8');
const article50Page = readFileSync(join(process.cwd(), 'src/app/[locale]/tools/article-50-transparency/page.tsx'), 'utf8');
const rolePage = readFileSync(join(process.cwd(), 'src/app/[locale]/tools/provider-vs-deployer/page.tsx'), 'utf8');
const maturityPage = readFileSync(join(process.cwd(), 'src/app/[locale]/tools/ai-governance-maturity/page.tsx'), 'utf8');
const resourcesPage = readFileSync(join(process.cwd(), 'src/app/[locale]/resources/page.tsx'), 'utf8');

describe('free-tool indexability authority', () => {
  it('publishes the English resource and every live free-tool route in the sitemap', () => {
    expect(sitemap).toContain("'/resources'");
    expect(sitemap).toContain("'/tools'");
    expect(sitemap).toContain("'/tools/ai-act-readiness'");
    expect(sitemap).toContain("'/tools/article-50-transparency'");
    expect(sitemap).toContain("'/tools/provider-vs-deployer'");
    expect(sitemap).toContain("'/tools/ai-governance-maturity'");
    expect(sitemap).toContain("{ en: url, 'x-default': url }");
  });

  it('keeps the tools hub and nested free tools publicly reachable before auth gating', () => {
    expect(middleware).toContain("'/tools',");
    expect(middleware).toContain("PUBLIC_ROUTE_PREFIXES = ['/features/', '/tools/']");
  });

  it('surfaces every live free tool from the discovery hub instead of labeling it planned', () => {
    expect(toolsPage).toContain("href: '/en/tools/ai-act-readiness'");
    expect(toolsPage).toContain("href: '/en/tools/article-50-transparency'");
    expect(toolsPage).toContain("href: '/en/tools/provider-vs-deployer'");
    expect(toolsPage).toContain("href: '/en/tools/ai-governance-maturity'");
    expect(toolsPage).toContain('Available now');
    expect(toolsPage).not.toContain('Planned');
  });

  it('does not manufacture localized free-tool sitemap variants', () => {
    expect(sitemap).toContain('englishGrowthPaths');
    expect(sitemap).not.toContain("localizedUrl(appUrl, 'de', '/tools");
    expect(sitemap).not.toContain("localizedUrl(appUrl, 'fr', '/tools");
    expect(sitemap).not.toContain("localizedUrl(appUrl, 'es', '/tools");
  });

  it('permanently converges locale-less tools on the English authority', () => {
    expect(config).toContain("source: '/tools/:path*'");
    expect(config).toContain("destination: '/en/tools/:path*'");
    expect(config).toContain('permanent: true');
    expect(config).toContain("source: '/en/tools/:path*'");
  });

  it('keeps unsupported localized tool and resource pages non-indexable', () => {
    for (const page of [toolsPage, assessmentPage, article50Page, rolePage, maturityPage, resourcesPage]) {
      expect(page).toContain("locale !== 'en'");
      expect(page).toContain('notFound()');
    }
  });

  it('uses explicit English canonical and x-default metadata for every live tool', () => {
    for (const page of [toolsPage, assessmentPage, article50Page, rolePage, maturityPage, resourcesPage]) {
      expect(page).toContain("languages: { en: url, 'x-default': url }");
    }
  });
});
