import { describe, expect, it } from 'vitest';

import {
  addUtcCalendarMonths,
  buildExtendedDataSubjectRequestDeadline,
  buildInitialDataSubjectRequestDeadline,
} from '@/lib/privacy/gdpr-deadlines';

describe('GDPR rights-request deadline arithmetic', () => {
  it('uses one calendar month rather than a fixed 30-day duration', () => {
    const received = '2026-03-15T10:30:00.000Z';
    const deadline = buildInitialDataSubjectRequestDeadline(received);

    expect(deadline.receivedAt).toBe(received);
    expect(deadline.initialDueAt).toBe('2026-04-15T10:30:00.000Z');
    expect(deadline.dueAt).toBe(deadline.initialDueAt);
    expect(new Date(deadline.dueAt).getTime() - new Date(received).getTime()).toBe(31 * 24 * 60 * 60 * 1000);
  });

  it('clamps January 31 to the final day of February', () => {
    expect(addUtcCalendarMonths('2026-01-31T09:45:00.000Z', 1).toISOString())
      .toBe('2026-02-28T09:45:00.000Z');
  });

  it('handles leap-year month end', () => {
    expect(addUtcCalendarMonths('2028-01-31T09:45:00.000Z', 1).toISOString())
      .toBe('2028-02-29T09:45:00.000Z');
  });

  it('caps the implemented extension input to one or two further months', () => {
    expect(buildExtendedDataSubjectRequestDeadline({
      initialDueAt: '2026-04-30T12:00:00.000Z',
      extensionMonths: 2,
    })).toBe('2026-06-30T12:00:00.000Z');
  });

  it('rejects invalid dates and unsupported month deltas', () => {
    expect(() => addUtcCalendarMonths('not-a-date', 1)).toThrow('invalid_received_at');
    expect(() => addUtcCalendarMonths('2026-01-01T00:00:00.000Z', 4)).toThrow('invalid_calendar_month_delta');
  });
});
