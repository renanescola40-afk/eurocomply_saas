import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '../../src/lib/i18n/locales';

type MessageValue = string | number | boolean | null | MessageValue[] | MessageCatalog;
interface MessageCatalog {
  [key: string]: MessageValue;
}

function readCatalog(locale: string): MessageCatalog {
  const path = resolve(process.cwd(), 'src', 'messages', `${locale}.json`);
  return JSON.parse(readFileSync(path, 'utf8')) as MessageCatalog;
}

function isMessageArray(value: MessageValue): value is MessageValue[] {
  return Array.isArray(value);
}

function flattenCatalog(value: MessageValue, prefix = ''): Map<string, MessageValue> {
  const entries = new Map<string, MessageValue>();

  if (isMessageArray(value)) {
    if (value.length === 0) {
      entries.set(prefix, value);
      return entries;
    }

    for (const [index, item] of value.entries()) {
      const path = `${prefix}[${index}]`;
      for (const [childPath, childValue] of flattenCatalog(item, path)) {
        entries.set(childPath, childValue);
      }
    }
    return entries;
  }

  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      for (const [childPath, childValue] of flattenCatalog(child, path)) {
        entries.set(childPath, childValue);
      }
    }
    return entries;
  }

  entries.set(prefix, value);
  return entries;
}

function sortedKeys(catalog: MessageCatalog): string[] {
  return [...flattenCatalog(catalog).keys()].sort();
}

describe('localized message catalogs', () => {
  const english = readCatalog('en');
  const canonicalKeys = sortedKeys(english);

  it.each(SUPPORTED_LOCALES)('%s has exactly the canonical English key set', (locale) => {
    expect(sortedKeys(readCatalog(locale))).toEqual(canonicalKeys);
  });

  it.each(SUPPORTED_LOCALES)('%s contains no blank or placeholder values', (locale) => {
    const entries = flattenCatalog(readCatalog(locale));
    const invalid = [...entries.entries()].filter(([, value]) => {
      if (typeof value === 'string') {
        const text = value.trim();
        return text.length === 0 || text.startsWith('__OPEN_UNTIL_') || text === 'TODO' || text === 'TBD';
      }
      if (isMessageArray(value)) {
        return value.length === 0;
      }
      return value === null;
    });

    expect(invalid, `Invalid localized values in ${locale}: ${invalid.map(([key]) => key).join(', ')}`).toEqual([]);
  });

  it('keeps every supported locale backed by a message catalog', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'pt', 'es', 'fr', 'it', 'de']);
    expect(SUPPORTED_LOCALES.map((locale) => sortedKeys(readCatalog(locale)).length))
      .toEqual(SUPPORTED_LOCALES.map(() => canonicalKeys.length));
  });
});