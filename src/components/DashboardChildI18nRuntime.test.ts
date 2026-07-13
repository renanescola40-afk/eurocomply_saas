import { describe, expect, it } from 'vitest';

import { translateDashboardChildText } from './DashboardChildI18nRuntime';

describe('translateDashboardChildText', () => {
  it.each([
    ['en', '5 AI systems registered'],
    ['es', '5 sistemas de IA registrados'],
    ['fr', '5 systèmes IA enregistrés'],
    ['it', '5 sistemi IA registrati'],
    ['de', '5 registrierte KI-Systeme'],
  ] as const)('translates dynamic inventory counts for %s', (locale, expected) => {
    expect(translateDashboardChildText('5 sistemas de IA registados', locale)).toBe(expected);
  });

  it('preserves Portuguese copy and unknown dynamic text', () => {
    expect(translateDashboardChildText('5 sistemas de IA registados', 'pt')).toBe('5 sistemas de IA registados');
    expect(translateDashboardChildText('5 controlos pendentes', 'en')).toBe('5 controlos pendentes');
  });

  it('still translates exact dashboard strings', () => {
    expect(translateDashboardChildText('Inventário de IA', 'en')).toBe('AI Inventory');
    expect(translateDashboardChildText('A carregar...', 'de')).toBe('Wird geladen...');
  });
});
