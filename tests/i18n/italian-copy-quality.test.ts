import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type ItalianCatalog = {
  landing: {
    nav: { platform: string };
    pricing: {
      essential: { name: string; price: string };
      professional: { name: string; price: string };
      business: { name: string; price: string };
      enterprise: { name: string; price: string };
    };
  };
  auth: { password: string; successWorkspace: string; errorOnboarding: string };
  onboarding: { industry: { healthcare: string } };
};

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStringValues);
  }
  return [];
}

const catalog = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/messages/it.json'), 'utf8'),
) as ItalianCatalog;
const serialized = JSON.stringify(catalog);
const translatedValues = collectStringValues(catalog).join('\n');

describe('Italian product copy quality', () => {
  it('uses native Italian diacritics and professional vocabulary', () => {
    expect(catalog.landing.nav.platform).toBe('Funzionalità');
    expect(catalog.auth.password).toBe('Password');
    expect(catalog.auth.successWorkspace).toContain('Spazio di lavoro');
    expect(catalog.auth.errorOnboarding).toContain('configurazione iniziale');
    expect(catalog.onboarding.industry.healthcare).toBe('Sanità');

    for (const legacyTerm of [
      'Funzionalita',
      'piu struttura',
      'visibilita',
      'l azienda',
      'l infrastruttura',
      'reporting executive',
      'Workspace',
      'Onboarding',
      'Template report',
      'Hai gia',
      'Sanita',
    ]) {
      expect(translatedValues).not.toContain(legacyTerm);
    }
  });

  it('preserves canonical plans and Italian euro formatting', () => {
    expect(catalog.landing.pricing.essential).toMatchObject({ name: 'Starter', price: '49 €' });
    expect(catalog.landing.pricing.professional).toMatchObject({ name: 'Growth', price: '149 €' });
    expect(catalog.landing.pricing.business).toMatchObject({ name: 'Business', price: '399 €' });
    expect(catalog.landing.pricing.enterprise).toMatchObject({ name: 'Enterprise', price: 'Da 990 €' });
  });

  it('does not reintroduce unsupported enterprise claims', () => {
    for (const prohibitedClaim of [
      /73\s*%/i,
      /40\s*ore/i,
      /conforme\s+(?:al\s+)?GDPR/i,
      /audit\s+trail\s+immutabile/i,
      /paesi\s+illimitati/i,
      /ISO\s*27001/i,
      /\bDORA\b/i,
      /\bNIS2\b/i,
      /14\s+giorni/i,
    ]) {
      expect(serialized).not.toMatch(prohibitedClaim);
    }
  });
});