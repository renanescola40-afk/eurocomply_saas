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
    expect(normalizeLocale('pt')).toBe('pt');
    expect(isSupportedLocale('de')).toBe(true);
  });

  it('prevents routing and request configuration from duplicating locale arrays', () => {
    expect(routingSource).toContain("import { SUPPORTED_LOCALES, type Locale } from './locales';");
    expect(routingSource).toContain('export const locales = SUPPORTED_LOCALES;');
    expect(routingSource).not.toMatch(/export const locales = \[/);

    expect(requestConfigSource).toContain("import { isSupportedLocale } from './lib/i18n/locales';");
    expect(requestConfigSource).not.toContain("locale as 'en'");
  });
});
