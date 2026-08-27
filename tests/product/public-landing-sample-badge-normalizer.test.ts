import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const NORMALIZER = new URL(
  '../../src/components/marketing/public-landing-sample-badge-normalizer.tsx',
  import.meta.url,
);
const ENTERPRISE_HOME = new URL(
  '../../src/components/marketing/enterprise-home.tsx',
  import.meta.url,
);

describe('public landing illustrative badge normalization', () => {
  it('relabels only the exact Live badge inside the marked sample preview', async () => {
    const [normalizer, home] = await Promise.all([
      readFile(NORMALIZER, 'utf8'),
      readFile(ENTERPRISE_HOME, 'utf8'),
    ]);

    expect(home).toContain('PublicLandingSampleBadgeNormalizer');
    expect(home).toContain('data-public-sample-preview="true"');
    expect(normalizer).toContain("span.textContent?.trim() !== 'Live'");
    expect(normalizer).toContain("locale === 'pt' ? 'Amostra' : 'Sample'");
    expect(normalizer).toContain("data-sample-preview-badge");
    expect(normalizer).toContain('Illustrative demo data');
    expect(normalizer).toContain('Dados ilustrativos de demonstração');
  });
});
