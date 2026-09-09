function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Operational calendar-month date arithmetic for GDPR rights-request tracking.
 * It deliberately avoids a fixed 30-day duration, preserves the UTC clock time,
 * and clamps month-end dates to the final day of the target month.
 */
export function addUtcCalendarMonths(value: string | Date, months: number) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('invalid_received_at');
  if (!Number.isInteger(months) || months < 0 || months > 3) throw new Error('invalid_calendar_month_delta');

  const originalDay = date.getUTCDate();
  const targetMonthAbsolute = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const targetYear = Math.floor(targetMonthAbsolute / 12);
  const targetMonth = targetMonthAbsolute % 12;
  const targetDay = Math.min(originalDay, daysInUtcMonth(targetYear, targetMonth));

  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
}

export function buildInitialDataSubjectRequestDeadline(receivedAt: string | Date = new Date()) {
  const received = receivedAt instanceof Date ? new Date(receivedAt.getTime()) : new Date(receivedAt);
  if (Number.isNaN(received.getTime())) throw new Error('invalid_received_at');
  const initialDue = addUtcCalendarMonths(received, 1);

  return {
    receivedAt: received.toISOString(),
    initialDueAt: initialDue.toISOString(),
    dueAt: initialDue.toISOString(),
  };
}

export function buildExtendedDataSubjectRequestDeadline(input: {
  initialDueAt: string | Date;
  extensionMonths: 1 | 2;
}) {
  const initialDue = input.initialDueAt instanceof Date ? new Date(input.initialDueAt.getTime()) : new Date(input.initialDueAt);
  if (Number.isNaN(initialDue.getTime())) throw new Error('invalid_initial_due_at');
  return addUtcCalendarMonths(initialDue, input.extensionMonths).toISOString();
}
