import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const footer = readFileSync(join(process.cwd(), 'src/components/marketing/public-footer.tsx'), 'utf8');

describe('public footer locale authority', () => {
  it('uses the same localized Trust Center authority as the production runtime route', () => {
    expect(footer).toContain("import { getLocalizedTrustCenterPages } from '@/lib/trust-center/localized-content'");
    expect(footer).toContain('getLocalizedTrustCenterPages(activeLocale)');
    expect(footer).not.toContain('getTrustCenterPages(activeLocale)');
  });

  it('does not expose the known Portuguese mixed-language procurement labels', () => {
    expect(footer).toContain("tagline: 'Governação de IA, fluxos de risco");
    expect(footer).toContain("'Fluxos de governação'");
    expect(footer).toContain("'Documentação de conformidade'");
    expect(footer).not.toContain("tagline: 'Governança de IA, workflows de risco");
  });

  it('preserves visible keyboard focus across footer navigation with the V2 cobalt system', () => {
    expect(footer).toContain('focus-visible:ring-2');
    expect(footer).toContain('focus-visible:ring-blue-400');
    expect(footer).toContain('className={footerLinkClass}');
    expect(footer).not.toContain('focus-visible:ring-cyan-200');
  });
});
