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

  it('checks dedupe state before constructing and sending the email', () => {
    const dedupeIndex = routeSource.indexOf('await hasReminderBeenSent(');
    const templateIndex = routeSource.indexOf('const email = trialUpgradeEmail(');
    const sendIndex = routeSource.indexOf('await sendEmail({');

    expect(dedupeIndex).toBeGreaterThan(-1);
    expect(templateIndex).toBeGreaterThan(dedupeIndex);
    expect(sendIndex).toBeGreaterThan(templateIndex);
  });
});
