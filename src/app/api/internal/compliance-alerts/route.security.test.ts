import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./route.ts', import.meta.url), 'utf8');

describe('compliance alert delivery safety', () => {
  it('fails closed when notification dedupe state cannot be trusted', () => {
    const lookupErrorBlock = source.match(
      /if \(error\) \{[\s\S]*?email_notification_dedupe_lookup[\s\S]*?\n\s*\}/,
    )?.[0];

    expect(lookupErrorBlock).toBeDefined();
    expect(lookupErrorBlock).toContain('throw error;');
    expect(lookupErrorBlock).not.toContain('return false;');
  });

  it('passes deterministic provider keys for document and vendor alerts', () => {
    expect(source.match(/buildNotificationIdempotencyKey\(/g)).toHaveLength(2);
    expect(source.match(/idempotencyKey,/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain("source: 'document_expiry_alert_job'");
    expect(source).toContain("source: 'vendor_review_alert_job'");
  });

  it('records completion only after confirmed delivery and uses idempotent upsert', () => {
    const sendIndexes = [...source.matchAll(/const delivery = await sendEmail\(\{/g)].map((match) => match.index ?? -1);
    const confirmationIndexes = [...source.matchAll(/if \(!delivery\.sent\)/g)].map((match) => match.index ?? -1);
    const recordIndexes = [...source.matchAll(/await recordNotificationSent\(\{/g)].map((match) => match.index ?? -1);

    expect(sendIndexes).toHaveLength(2);
    expect(confirmationIndexes).toHaveLength(2);
    expect(recordIndexes).toHaveLength(2);

    for (let index = 0; index < 2; index += 1) {
      expect(confirmationIndexes[index]).toBeGreaterThan(sendIndexes[index]);
      expect(recordIndexes[index]).toBeGreaterThan(confirmationIndexes[index]);
    }

    expect(source).toContain('.upsert(');
    expect(source).toContain("onConflict: 'organization_id,event_type,entity_type,entity_id,recipient_email'");
  });

  it('fails closed when completion persistence fails', () => {
    const recordErrorBlock = source.match(
      /if \(error\) \{[\s\S]*?email_notification_dedupe_record[\s\S]*?\n\s*\}/,
    )?.[0];

    expect(recordErrorBlock).toBeDefined();
    expect(recordErrorBlock).toContain('throw error;');
  });

  it('does not report partial alert delivery as a successful cron run', () => {
    expect(source.match(/failed \+= 1;/g)).toHaveLength(2);
    expect(source.match(/return \{ sent, skipped, failed \};/g)).toHaveLength(2);

    const partialFailureGuard = source.match(
      /if \(documentAlerts\.failed > 0 \|\| vendorAlerts\.failed > 0\) \{[\s\S]*?status: 500[\s\S]*?\n\s*\}/,
    )?.[0];

    expect(partialFailureGuard).toBeDefined();
    expect(partialFailureGuard).toContain("error: 'Unable to send all compliance alerts'");
    expect(source.indexOf('documentAlerts.failed > 0')).toBeLessThan(source.indexOf('return noStoreJson({ ok: true'));
  });
});
