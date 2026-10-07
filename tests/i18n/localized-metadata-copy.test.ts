import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layoutSource = readFileSync('src/app/[locale]/layout.tsx', 'utf8');

describe('English-only metadata copy', () => {
  it('keeps complete English metadata', () => {
    expect(layoutSource).toMatch(/\ben: \{[\s\S]*?description:/);
  });

  it('does not publish non-English localized SEO descriptions', () => {
    for (const phrase of [
      'preparação para o AI Act',
      'preparación ante el AI Act',
      'équipes B2B européennes',
      'visibilità dei rischi',
      'für europäische B2B-Teams',
    ]) {
      expect(layoutSource).not.toContain(phrase);
    }
  });

  it('does not regress to obsolete ASCII transliterations', () => {
    for (const obsoletePhrase of [
      'inventario de IA, visibilidade de risco',
      'preparacion de evidencias',
      'equipes B2B europeennes',
      'visibilita del rischio',
      'fuer europaeische B2B-Teams',
    ]) {
      expect(layoutSource).not.toContain(obsoletePhrase);
    }
  });
});
