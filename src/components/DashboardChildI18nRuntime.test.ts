import { describe, expect, it } from 'vitest';

import { translateDashboardChildText } from './DashboardChildI18nRuntime';

describe('translateDashboardChildText', () => {
  it.each([
    ['en', '1 AI system registered', '5 AI systems registered'],
    ['es', '1 sistema de IA registrado', '5 sistemas de IA registrados'],
    ['fr', '1 système IA enregistré', '5 systèmes IA enregistrés'],
    ['it', '1 sistema IA registrato', '5 sistemi IA registrati'],
    ['de', '1 registriertes KI-System', '5 registrierte KI-Systeme'],
  ] as const)('pluralizes dynamic inventory counts for %s', (locale, singular, plural) => {
    expect(translateDashboardChildText('1 sistemas de IA registados', locale)).toBe(singular);
    expect(translateDashboardChildText('5 sistemas de IA registados', locale)).toBe(plural);
  });

  it('pluralizes Portuguese inventory counts without starting the runtime observer', () => {
    expect(translateDashboardChildText('1 sistemas de IA registados', 'pt')).toBe('1 sistema de IA registado');
    expect(translateDashboardChildText('0 sistemas de IA registados', 'pt')).toBe('0 sistemas de IA registados');
  });

  it('preserves unknown dynamic text', () => {
    expect(translateDashboardChildText('5 controlos pendentes', 'en')).toBe('5 controlos pendentes');
  });

  it('still translates exact dashboard strings', () => {
    expect(translateDashboardChildText('Inventário de IA', 'en')).toBe('AI Inventory');
    expect(translateDashboardChildText('A carregar...', 'de')).toBe('Wird geladen...');
  });
});
