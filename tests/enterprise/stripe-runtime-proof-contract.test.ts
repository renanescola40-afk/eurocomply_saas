import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('scripts/enterprise/stripe-runtime-proof.sql', 'utf8');
const report = readFileSync('scripts/enterprise/build-stripe-runtime-proof.mjs', 'utf8');

describe('Stripe entitlement runtime proof', () => {
  it('uses a read-only bounded transaction', () => {
    expect(sql).toContain('begin transaction read only');
    expect(sql).toContain("statement_timeout = '45s'");
    expect(sql).toContain('rollback;');
  });

  it('correlates event, snapshot, policy and reconciliation evidence', () => {
    for (const marker of ['stripe_events_processed', 'enterprise_entitlement_snapshots', 'enterprise_seat_policies', 'enterprise_entitlement_reconciliation_events']) {
      expect(sql).toContain(marker);
    }
    expect(sql).toContain("'stripe:' || :'stripe_event_id'");
    expect(sql).toContain(":'organization_id'::uuid");
  });

  it('sanitizes identifiers and retains a truth boundary', () => {
    expect(report).toContain('eventIdSuffix');
    expect(report).toContain('idSuffix');
    expect(report).toContain('containsSecrets: false');
    expect(report).toContain('provesAllFutureStripeEvents: false');
  });
});
