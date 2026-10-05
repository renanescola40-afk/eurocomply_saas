import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatCalendarDate } from '@/lib/calendar-date';

const numeric = { year: 'numeric', month: '2-digit', day: '2-digit' } as const;
const dates = ['2026-12-15', '2026-12-20', '2027-01-01', '2027-03-31'];
const timezones = ['UTC', 'America/Los_Angeles', 'Pacific/Honolulu', 'Europe/Lisbon', 'Asia/Tokyo'];
afterEach(() => vi.unstubAllEnvs());

describe.each(timezones)('calendar dates in %s', (timezone) => {
  it.each(dates)('preserves %s in the rendered calendar day', (date) => {
    vi.stubEnv('TZ', timezone);
    expect(formatCalendarDate(date, 'en-CA', numeric)).toBe(date);
  });
});

it('keeps timestamp timezone behavior and rejects invalid calendar input', () => {
  vi.stubEnv('TZ', 'America/Los_Angeles');
  expect(formatCalendarDate('2026-12-20T00:00:00Z', 'en-CA', numeric)).toBe('2026-12-19');
  expect(formatCalendarDate('2026-02-30', 'en-CA', numeric)).toBeNull();
  expect(formatCalendarDate('not-a-date', 'en-CA', numeric)).toBeNull();
  expect(formatCalendarDate(null, 'en-CA', numeric)).toBeNull();
  expect(formatCalendarDate('2028-02-29', 'en-CA', numeric)).toBe('2028-02-29');
});
