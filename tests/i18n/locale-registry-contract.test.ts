import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  SUPPORTED_LOCALES,
  isSupportedLocale,
  normalizeLocale,
} from '../../src/lib/i18n/locales';

const routingSource = readFileSync(
  new URL('../../src/lib/i18n/routing.ts', import.meta.url),
  'utf8',
);
const requestConfigSource = readFileSync(
  new URL('../../src/i18n.ts', import.meta.url),
  'utf8',
);

describe('canonical locale registry', () => {
  it('keeps the supported European locale set explicit and unique', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'pt', 'es', 'fr', 'it', 'de']);
    expect(new Set(SUPPORTED_LOCALES).size).toBe(SUPPORTED_LOCALES.length);
  });

  it('normalizes unknown or missing locales to English', () => {
    expect(normalizeLocale(undefined)).toBe('en');
    expect(normalizeLocale('nl')).toBe('en');
    expect(normalizeLocale('pt')).toBe('en');
    expect(normalizeLocale('fr')).toBe('en');
    expect(isSupportedLocale('de')).toBe(true);
  });

  it('keeps one locale registry while forcing request messages to English', () => {
    expect(routingSource).toContain("import { SUPPORTED_LOCALES, type Locale } from './locales';");
    expect(routingSource).toContain('export const locales = SUPPORTED_LOCALES;');
    expect(routingSource).not.toContain('export const locales = [');

    expect(requestConfigSource).toContain("locale: 'en'");
    expect(requestConfigSource).toContain("import('./messages/en.json')");
    expect(requestConfigSource).not.toContain('messages/' + '$' + '{locale}.json');
  });
});
