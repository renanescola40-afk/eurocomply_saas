'use client';

import { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';

import {
  buildLocalizedInventoryDisplayCsv,
  type InventoryCsvLocale,
  type InventoryDisplayCsvRow,
} from '@/lib/i18n/inventory-csv';

const SUPPORTED_LOCALES = new Set<InventoryCsvLocale>(['en', 'pt', 'es', 'fr', 'it', 'de']);

function readDisplayedRows(): InventoryDisplayCsvRow[] {
  const rows = document.querySelectorAll<HTMLTableRowElement>('table tbody tr');
  return Array.from(rows).flatMap((row) => {
    const cells = row.querySelectorAll<HTMLTableCellElement>('td');
    if (cells.length < 5) return [];

    const identity = cells[0].querySelectorAll('p');
    const name = identity[0]?.textContent?.trim() ?? '';
    if (!name) return [];

    return [{
      name,
      vendor: identity[1]?.textContent?.trim() ?? '',
      riskLabel: cells[1].querySelector('[class*="badge"]')?.textContent?.trim()
        ?? cells[1].textContent?.trim()
        ?? '',
      statusLabel: cells[2].querySelector('[class*="badge"]')?.textContent?.trim()
        ?? cells[2].textContent?.trim()
        ?? '',
      department: cells[3].textContent?.trim() ?? '',
      assessmentDate: cells[4].textContent?.trim() ?? '',
    }];
  });
}

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'inventario-ia-risck-comply.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function InventoryCsvExportRuntime() {
  const pathname = usePathname();
  const params = useParams();
  const rawLocale = (params.locale as string) || 'en';
  const locale: InventoryCsvLocale = SUPPORTED_LOCALES.has(rawLocale as InventoryCsvLocale)
    ? rawLocale as InventoryCsvLocale
    : 'en';

  useEffect(() => {
    if (!pathname.includes('/dashboard/inventario')) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (!button || !button.querySelector('svg.lucide-download')) return;

      const rows = readDisplayedRows();
      if (rows.length === 0) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      downloadCsv(buildLocalizedInventoryDisplayCsv(rows, locale));
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [locale, pathname]);

  return null;
}
