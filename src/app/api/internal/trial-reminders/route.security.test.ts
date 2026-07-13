import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(new URL('./route.ts', import.meta.url), 'utf8');

describe('trial reminder dedupe safety', () => {
  it('fails closed when the dedupe lookup cannot be trusted', () => {
    const lookupErrorBlock = routeSource.match(
      /if \(error\) \{[\s\S]*?trial_reminder_dedupe_lookup[\s\S]*?\n\s*\}/,
    )?.[0];

    expect(lookupErrorBlock).toBeDefined();
    expect(lookupErrorBlock).toContain('throw error;');
    expect(lookupErrorBlock).not.toContain('return false;');
  });

  it('builds and passes a deterministic provider idempotency key before delivery', () => {
    const dedupeIndex = routeSource.indexOf('await hasReminderBeenSent(');
    const keyIndex = routeSource.indexOf('const idempotencyKey = buildTrialReminderIdempotencyKey({');
    const sendIndex = routeSource.indexOf('const delivery = await sendEmail({');
    const keyArgumentIndex = routeSource.indexOf('idempotencyKey,', sendIndex);

    expect(dedupeIndex).toBeGreaterThan(-1);
    expect(keyIndex).toBeGreaterThan(dedupeIndex);
    expect(sendIndex).toBeGreaterThan(keyIndex);
    expect(keyArgumentIndex).toBeGreaterThan(sendIndex);
  });

  it('records completion only after a confirmed provider send and fails closed on record errors', () => {
    const sendIndex = routeSource.indexOf('const delivery = await sendEmail({');
    const confirmedIndex = routeSource.indexOf('if (!delivery.sent)');
    const recordIndex = routeSource.indexOf('await recordReminderSent(');
    const recordErrorBlock = routeSource.match(
      /if \(error\) \{[\s\S]*?trial_reminder_dedupe_record[\s\S]*?\n\s*\}/,
    )?.[0];

    expect(confirmedIndex).toBeGreaterThan(sendIndex);
    expect(recordIndex).toBeGreaterThan(confirmedIndex);
    expect(recordErrorBlock).toBeDefined();
    expect(recordErrorBlock).toContain('throw error;');
  });

  it('uses the existing unique event identity for concurrent completion writes', () => {
    expect(routeSource).toContain("const REMINDER_EVENT_CONFLICT_COLUMNS = 'organization_id,event_type,entity_type,entity_id,recipient_email';");
    expect(routeSource).toContain(".from('email_notification_events').upsert(");
    expect(routeSource).toContain('onConflict: REMINDER_EVENT_CONFLICT_COLUMNS');
    expect(routeSource).toContain('ignoreDuplicates: true');
  });
});
