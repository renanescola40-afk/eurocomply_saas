import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/internal/trial-reminders/route.ts', 'utf8');

describe('trial reminder delivery integrity', () => {
  it('reserves the unique notification event before sending email', () => {
    const reservationCall = route.indexOf('const reserved = await reserveReminder');
    const emailSend = route.indexOf('await sendEmail({');

    expect(reservationCall).toBeGreaterThan(-1);
    expect(emailSend).toBeGreaterThan(reservationCall);
    expect(route).toContain("const UNIQUE_VIOLATION_CODE = '23505'");
    expect(route).toContain('if (error.code === UNIQUE_VIOLATION_CODE)');
  });

  it('fails closed when the dedupe reservation cannot be persisted', () => {
    const reservationBlock = route.slice(
      route.indexOf('async function reserveReminder'),
      route.indexOf('async function releaseReminderReservation'),
    );

    expect(reservationBlock).toContain("area: 'trial_reminder_dedupe_reservation'");
    expect(reservationBlock).toContain('throw error');
    expect(reservationBlock).not.toContain('return true;', reservationBlock.indexOf('if (error.code'));
  });

  it('releases the reservation after a failed email send so a later run can retry', () => {
    const sendFailureBlock = route.slice(
      route.indexOf('} catch (error) {', route.indexOf('await sendEmail({')),
      route.indexOf("reportError(error, { area: 'trial_reminder_email'"),
    );

    expect(sendFailureBlock).toContain('await releaseReminderReservation(');
    expect(route).toContain(".eq('event_type', 'billing.trial_ending')");
    expect(route).toContain(".eq('entity_type', 'subscription')");
    expect(route).toContain(".eq('recipient_email', recipientEmail)");
  });
});
