import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layoutSource = readFileSync('src/app/[locale]/layout.tsx', 'utf8');

describe('localized metadata copy', () => {
  it('keeps complete metadata descriptions for every supported locale', () => {
    for (const locale of ['en', 'pt', 'es', 'fr', 'it', 'de']) {
      expect(layoutSource).toMatch(new RegExp(`\\b${locale}: \\{[\\s\\S]*?description:`));
    }
  });

  it('preserves native-language diacritics in non-English SEO descriptions', () => {
    for (const phrase of [
      'preparação para o AI Act',
      'preparación ante el AI Act',
      'équipes B2B européennes',
      'visibilità dei rischi',
      'für europäische B2B-Teams',
    ]) {
      expect(layoutSource).toContain(phrase);
    }
  });

  it('does not regress to ASCII transliterations used by the previous metadata copy', () => {
    for (const obsoletePhrase of [
      'inventario de IA',
      'preparacion de evidencias',
      'equipes B2B europeennes',
      'visibilita del rischio',
      'fuer europaeische B2B-Teams',
    ]) {
      expect(layoutSource).not.toContain(obsoletePhrase);
    }
  });
});
