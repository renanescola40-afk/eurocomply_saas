'use client';

import { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';

type Locale = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';

const DATE_LOCALES: Record<Locale, string> = {
  en: 'en-GB',
  pt: 'pt-PT',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
};

export function localizeInventoryDate(value: string, locale: Locale): string {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u);
  if (!match) return normalized;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return normalized;
  }

  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function replaceInventoryDates(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const value = node.nodeValue?.trim();
    if (value && localizeInventoryDate(value, locale) !== value) nodes.push(node);
  }

  for (const node of nodes) {
    const original = node.nodeValue || '';
    const trimmed = original.trim();
    node.nodeValue = original.replace(trimmed, localizeInventoryDate(trimmed, locale));
  }
}

export default function InventoryDateI18nRuntime() {
  const pathname = usePathname();
  const params = useParams();
  const locale = ((params.locale as Locale) || 'en') as Locale;

  useEffect(() => {
    if (!pathname.includes('/dashboard/inventario')) return;
    if (locale === 'pt') return;

    const apply = () => replaceInventoryDates(document.body, locale);
    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [locale, pathname]);

  return null;
}
