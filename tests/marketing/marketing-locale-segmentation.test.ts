import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getMarketingLocale } from '../../src/lib/analytics/marketing-attribution';

describe('marketing locale segmentation', () => {
  it('returns only the six canonical European marketing locales', () => {
    expect(getMarketingLocale('/en')).toBe('en');
    expect(getMarketingLocale('/pt/pricing')).toBe('pt');
    expect(getMarketingLocale('/es/features/ai-inventory')).toBe('es');
    expect(getMarketingLocale('/fr/trust')).toBe('fr');
    expect(getMarketingLocale('/it/resources')).toBe('it');
    expect(getMarketingLocale('/de/book-demo')).toBe('de');
  });

  it('does not infer locale from arbitrary path fragments', () => {
    expect(getMarketingLocale('/enterprise')).toBeNull();
    expect(getMarketingLocale('/english/pricing')).toBeNull();
    expect(getMarketingLocale('/enough/pricing')).toBeNull();
    expect(getMarketingLocale('/dashboard/en')).toBeNull();
  });

  it('emits locale on public page, CTA and checkout acquisition signals', () => {
    const globalEffects = readFileSync('src/components/GlobalClientEffects.tsx', 'utf8');

    expect(globalEffects).toContain('const locale = getMarketingLocale(pathname)');
    expect(globalEffects.match(/\.\.\.\(locale \? \{ locale \} : \{\}\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('emits the resolved locale on demo-started and demo-submitted signals', () => {
    const demoForm = readFileSync('src/components/marketing/book-demo-form.tsx', 'utf8');

    expect(demoForm).toContain("source: 'book-demo-page'");
    expect(demoForm).toContain('locale,');
    expect(demoForm).toContain('analyticsEvents.demoStarted');
    expect(demoForm).toContain('analyticsEvents.demoSubmitted');
  });
});
