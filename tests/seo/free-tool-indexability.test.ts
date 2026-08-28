import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const sitemap = readFileSync(join(process.cwd(), 'src/app/sitemap.ts'), 'utf8');
const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
const toolsPage = readFileSync(join(process.cwd(), 'src/app/[locale]/tools/page.tsx'), 'utf8');
const assessmentPage = readFileSync(join(process.cwd(), 'src/app/[locale]/tools/ai-act-readiness/page.tsx'), 'utf8');
const resourcesPage = readFileSync(join(process.cwd(), 'src/app/[locale]/resources/page.tsx'), 'utf8');

describe('free-tool indexability authority', () => {
  it('publishes the English resource and tool routes in the sitemap', () => {
    expect(sitemap).toContain("'/resources'");
    expect(sitemap).toContain("'/tools'");
    expect(sitemap).toContain("'/tools/ai-act-readiness'");
    expect(sitemap).toContain("{ en: url, 'x-default': url }");
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

  it('keeps unlocalized tool and resource pages non-indexable', () => {
    for (const page of [toolsPage, assessmentPage, resourcesPage]) {
      expect(page).toContain("locale !== 'en'");
      expect(page).toContain('notFound()');
    }
  });

  it('uses explicit English canonical and x-default metadata', () => {
    expect(toolsPage).toContain("languages: { en: url, 'x-default': url }");
    expect(assessmentPage).toContain("languages: { en: url, 'x-default': url }");
    expect(resourcesPage).toContain("languages: { en: url, 'x-default': url }");
  });
});
