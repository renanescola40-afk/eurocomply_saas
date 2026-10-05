/** Format a database DATE as a calendar day, without applying browser timezone conversion. */
export function formatCalendarDate(
  value: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string | null {
  if (!value) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return null;
  // Date parsing normalizes nonexistent dates; reject them rather than showing a different day.
  if (isDateOnly && date.toISOString().slice(0, 10) !== value) return null;
  return new Intl.DateTimeFormat(locale, {
    ...options,
    ...(isDateOnly ? { timeZone: 'UTC' } : {}),
  }).format(date);
}
