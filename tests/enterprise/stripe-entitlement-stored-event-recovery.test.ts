import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

import {
  entitlementPayloadDigest,
} from '../../src/server/enterprise/entitlement-reconciliation';
import {
  normalizeStripeEntitlementEvent,
} from '../../src/server/billing/stripe-entitlement-runtime';
import {
  buildSnapshotFromStoredStripeEvent,
  entitlementPayloadDigestForRecovery,
  recoverStoredStripeEntitlement,
  validateRecoveredSnapshot,
  validateSourceForRecovery,
} from '../../scripts/enterprise/recover-stored-stripe-entitlement.mjs';

const NOW = new Date('2026-08-12T21:30:00.000Z');
const EVENT_ID = 'evt_test_entitlement_recovery_001';
const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_ID = '22222222-2222-4222-8222-222222222222';
const SUBSCRIPTION_ID = 'sub_test_entitlement_recovery_001';
const PERIOD_END = 1788043256;
const MIGRATION = 'supabase/migrations/20260812213753_guard_enterprise_entitlement_snapshots_against_stale_observations.sql';

function eventPayload() {
  return {
    id: EVENT_ID,
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: 1785447863,
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: SUBSCRIPTION_ID,
        object: 'subscription',
        metadata: {
          organization_id: ORGANIZATION_ID,
          entitlement_source_id: SOURCE_ID,
          plan_code: 'professional',
          full_seat_limit: '25',
          participant_seat_limit: '50',
          viewer_seat_limit: '100',
          source_version: '1',
          grace_period_days: '7',
        },
        items: {
          data: [
            {
              id: 'si_test',
              object: 'subscription_item',
              current_period_start: 1785364856,
              current_period_end: PERIOD_END,
            },
          ],
        },
      },
    },
  };
}

function storedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    type: 'customer.subscription.updated',
    status: 'processed',
    livemode: false,
    organization_id: ORGANIZATION_ID,
    api_version: '2026-05-27.dahlia',
    payload: eventPayload(),
    ...overrides,
  };
}

function sourceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SOURCE_ID,
    organization_id: ORGANIZATION_ID,
    source_kind: 'stripe_subscription',
    external_reference: SUBSCRIPTION_ID,
    active: true,
    version: 1,
    ...overrides,
  };
}

function snapshotRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    organization_id: ORGANIZATION_ID,
    source_id: SOURCE_ID,
    idempotency_key: `stripe:${EVENT_ID}`,
    plan_code: 'professional',
    full_seat_limit: 25,
    participant_seat_limit: 50,
    viewer_seat_limit: 100,
    status: 'applied',
    applied_policy_version: 1,
    source_version: 1,
    observed_at: '2026-07-30T19:04:23.000Z',
    ...overrides,
  };
}

function fakeSupabase({
  eventReads = [[storedRow()], []],
  sourceReads = [[sourceRow()]],
  snapshotReads = [[], [], [snapshotRow()]],
  rpcResult = [{
    outcome: 'applied',
    snapshot_id: snapshotRow().id,
    applied_policy_version: 1,
    source_version: 1,
  }],
}: {
  eventReads?: unknown[][];
  sourceReads?: unknown[][];
  snapshotReads?: unknown[][];
  rpcResult?: unknown;
} = {}) {
  let eventReadIndex = 0;
  let sourceReadIndex = 0;
  let snapshotReadIndex = 0;
  const rpc = vi.fn(async () => ({ data: rpcResult, error: null }));
  const from = vi.fn((table: string) => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      neq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      gt: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(async () => {
        if (table === 'stripe_events_processed') {
          const data = eventReads[Math.min(eventReadIndex, eventReads.length - 1)] ?? [];
          eventReadIndex += 1;
          return { data, error: null };
        }
        if (table === 'enterprise_entitlement_sources') {
          const data = sourceReads[Math.min(sourceReadIndex, sourceReads.length - 1)] ?? [];
          sourceReadIndex += 1;
          return { data, error: null };
        }
        if (table === 'enterprise_entitlement_snapshots') {
          const data = snapshotReads[Math.min(snapshotReadIndex, snapshotReads.length - 1)] ?? [];
          snapshotReadIndex += 1;
          return { data, error: null };
        }
        return { data: null, error: new Error(`unexpected table ${table}`) };
      }),
    };
    return builder;
  });
  return { client: { from, rpc }, rpc, from };
}

describe('stored Stripe entitlement recovery', () => {
  it('builds the same snapshot and digest as the canonical runtime for a Dahlia item-level period', () => {
    const row = storedRow();
    const prepared = buildSnapshotFromStoredStripeEvent(row, {
      expectedEventId: EVENT_ID,
      expectedOrganizationId: ORGANIZATION_ID,
      now: NOW,
    });
    const canonical = normalizeStripeEntitlementEvent(eventPayload() as unknown as Stripe.Event, NOW);

    expect(canonical.outcome).toBe('normalized');
    if (canonical.outcome !== 'normalized') throw new Error('canonical normalization unexpectedly failed');
    expect(prepared.snapshot).toEqual(canonical.snapshot);
    expect(entitlementPayloadDigestForRecovery(prepared.snapshot))
      .toBe(entitlementPayloadDigest(canonical.snapshot));
    expect(prepared.snapshot.validUntil).toBe('2026-08-29T22:40:56.000Z');
  });

  it('rejects live mode, mismatched identity and expired billing windows before reconciliation', () => {
    const livePayload = { ...eventPayload(), livemode: true };
    expect(() => buildSnapshotFromStoredStripeEvent(storedRow({ livemode: true, payload: livePayload }), {
      expectedEventId: EVENT_ID,
      expectedOrganizationId: ORGANIZATION_ID,
      now: NOW,
    })).toThrow();

    expect(() => buildSnapshotFromStoredStripeEvent(storedRow(), {
      expectedEventId: 'evt_other',
      expectedOrganizationId: ORGANIZATION_ID,
      now: NOW,
    })).toThrow('stripe_recovery_event_id_mismatch');

    expect(() => buildSnapshotFromStoredStripeEvent(storedRow(), {
      expectedEventId: EVENT_ID,
      expectedOrganizationId: '44444444-4444-4444-8444-444444444444',
      now: NOW,
    })).toThrow('stripe_recovery_organization_mismatch');

    expect(() => buildSnapshotFromStoredStripeEvent(storedRow(), {
      expectedEventId: EVENT_ID,
      expectedOrganizationId: ORGANIZATION_ID,
      now: new Date('2026-09-01T00:00:00.000Z'),
    })).toThrow('stripe_recovery_billing_period_expired');
  });

  it('requires the active canonical Stripe subscription source and exact version/reference', () => {
    const prepared = buildSnapshotFromStoredStripeEvent(storedRow(), {
      expectedEventId: EVENT_ID,
      expectedOrganizationId: ORGANIZATION_ID,
      now: NOW,
    });

    expect(validateSourceForRecovery(sourceRow(), prepared)).toBe(true);
    expect(() => validateSourceForRecovery(sourceRow({ source_kind: 'manual_override' }), prepared))
      .toThrow('stripe_recovery_source_kind_mismatch');
    expect(() => validateSourceForRecovery(sourceRow({ external_reference: 'sub_wrong' }), prepared))
      .toThrow('stripe_recovery_source_reference_mismatch');
    expect(() => validateSourceForRecovery(sourceRow({ active: false }), prepared))
      .toThrow('stripe_recovery_source_inactive');
    expect(() => validateSourceForRecovery(sourceRow({ version: 2 }), prepared))
      .toThrow('stripe_recovery_source_version_mismatch');
  });

  it('uses the canonical atomic RPC only after freshness checks and verifies the materialized snapshot', async () => {
    const { client, rpc } = fakeSupabase();
    const result = await recoverStoredStripeEntitlement({
      supabase: client,
      eventId: EVENT_ID,
      expectedOrganizationId: ORGANIZATION_ID,
      now: NOW,
    });

    expect(result.outcome).toBe('applied');
    expect(result.planCode).toBe('professional');
    expect(result.appliedPolicyVersion).toBe(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('apply_enterprise_entitlement_snapshot_atomic', expect.objectContaining({
      p_organization_id: ORGANIZATION_ID,
      p_source_id: SOURCE_ID,
      p_idempotency_key: `stripe:${EVENT_ID}`,
      p_expected_source_version: 1,
      p_plan_code: 'professional',
      p_full_seat_limit: 25,
      p_participant_seat_limit: 50,
      p_viewer_seat_limit: 100,
      p_valid_until: '2026-08-29T22:40:56.000Z',
    }));
  });

  it('is idempotent when the exact applied snapshot already exists and never calls the RPC again', async () => {
    const existing = snapshotRow();
    const { client, rpc } = fakeSupabase({ snapshotReads: [[existing]] });
    const result = await recoverStoredStripeEntitlement({
      supabase: client,
      eventId: EVENT_ID,
      expectedOrganizationId: ORGANIZATION_ID,
      now: NOW,
    });

    expect(result.outcome).toBe('idempotent_replay');
    expect(result.snapshotId).toBe(existing.id);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed when a newer retained Stripe event exists for the organization', async () => {
    const { client, rpc } = fakeSupabase({
      eventReads: [
        [storedRow()],
        [{
          id: 'evt_newer',
          type: 'customer.subscription.updated',
          stripe_created_at: '2026-08-01T12:00:00.000Z',
        }],
      ],
      snapshotReads: [[]],
    });

    await expect(recoverStoredStripeEntitlement({
      supabase: client,
      eventId: EVENT_ID,
      expectedOrganizationId: ORGANIZATION_ID,
      now: NOW,
    })).rejects.toThrow('stripe_recovery_newer_event_exists');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed on same-second cancellation or billing-state ambiguity', async () => {
    for (const type of ['customer.subscription.deleted', 'invoice.payment_failed', 'invoice.paid']) {
      const { client, rpc } = fakeSupabase({
        eventReads: [
          [storedRow()],
          [{
            id: `evt_conflict_${type.replace(/[^a-z]/g, '_')}`,
            type,
            stripe_created_at: '2026-07-30T19:04:23.000Z',
          }],
        ],
        snapshotReads: [[]],
      });

      await expect(recoverStoredStripeEntitlement({
        supabase: client,
        eventId: EVENT_ID,
        expectedOrganizationId: ORGANIZATION_ID,
        now: NOW,
      })).rejects.toThrow('stripe_recovery_newer_event_exists');
      expect(rpc).not.toHaveBeenCalled();
    }
  });

  it('fails closed when a same-time or newer entitlement snapshot exists for the organization', async () => {
    const { client, rpc } = fakeSupabase({
      snapshotReads: [
        [],
        [{ id: 'ambiguous-snapshot', observed_at: '2026-07-30T19:04:23.000Z', status: 'applied' }],
      ],
    });

    await expect(recoverStoredStripeEntitlement({
      supabase: client,
      eventId: EVENT_ID,
      expectedOrganizationId: ORGANIZATION_ID,
      now: NOW,
    })).rejects.toThrow('stripe_recovery_newer_snapshot_exists');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed on ambiguous or mismatched recovered snapshots', async () => {
    const prepared = buildSnapshotFromStoredStripeEvent(storedRow(), {
      expectedEventId: EVENT_ID,
      expectedOrganizationId: ORGANIZATION_ID,
      now: NOW,
    });
    expect(validateRecoveredSnapshot(snapshotRow(), prepared.snapshot)).toBe(true);
    expect(() => validateRecoveredSnapshot(snapshotRow({ status: 'superseded' }), prepared.snapshot))
      .toThrow('stripe_recovery_snapshot_not_applied');

    const { client, rpc } = fakeSupabase({ snapshotReads: [[snapshotRow(), snapshotRow({ id: 'other' })]] });
    await expect(recoverStoredStripeEntitlement({
      supabase: client,
      eventId: EVENT_ID,
      expectedOrganizationId: ORGANIZATION_ID,
      now: NOW,
    })).rejects.toThrow('stripe_recovery_snapshot_ambiguous');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('has an atomic database freshness guard sharing the canonical entitlement advisory lock', () => {
    const migration = readFileSync(MIGRATION, 'utf8');

    expect(migration).toContain('enterprise_entitlement_snapshot_freshness_guard');
    expect(migration).toContain('before insert on public.enterprise_entitlement_snapshots');
    expect(migration).toContain("new.organization_id::text || ':entitlement-reconcile'");
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(migration).toContain('existing.observed_at > new.observed_at');
    expect(migration).toContain("raise exception 'stale enterprise entitlement observation'");
    expect(migration).toContain("errcode = '23514'");
    expect(migration).toContain('set search_path = pg_catalog');
    expect(migration).toContain('revoke all on function public.reject_stale_enterprise_entitlement_snapshot() from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.reject_stale_enterprise_entitlement_snapshot() to service_role');
  });

  it('keeps the operational workflow manual, exact-SHA, production-scoped and entitlement-only', () => {
    const workflow = readFileSync('.github/workflows/stripe-entitlement-stored-event-recovery.yml', 'utf8');
    const script = readFileSync('scripts/enterprise/recover-stored-stripe-entitlement.mjs', 'utf8');

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/\n\s+push:/);
    expect(workflow).not.toMatch(/\n\s+pull_request:/);
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain("test \"$RECOVERY_CONFIRMATION\" = 'REPAIR_STRIPE_ENTITLEMENT_SNAPSHOT'");
    expect(workflow.match(/test "\$main_sha" = "\$RELEASE_SHA"/g)).toHaveLength(2);
    expect(workflow).toContain('STRIPE_TEST_MODE_CONFIRMED: ${{ inputs.stripe_test_mode_confirmed }}');
    expect(workflow.match(/SUPABASE_SERVICE_ROLE_KEY:/g)).toHaveLength(1);
    expect(workflow.match(/NEXT_PUBLIC_SUPABASE_URL:/g)).toHaveLength(1);
    expect(workflow.indexOf('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}'))
      .toBeGreaterThan(workflow.indexOf('- name: Repair only the missing enterprise entitlement snapshot'));
    expect(workflow.indexOf('- name: Revalidate current main immediately before production mutation'))
      .toBeLessThan(workflow.indexOf('- name: Repair only the missing enterprise entitlement snapshot'));
    expect(workflow).toContain('retention-days: 365');

    expect(script).toContain(".from('stripe_events_processed')");
    expect(script).toContain(".from('enterprise_entitlement_sources')");
    expect(script).toContain(".from('enterprise_entitlement_snapshots')");
    expect(script).toContain("'customer.subscription.deleted'");
    expect(script).toContain("'invoice.payment_failed'");
    expect(script).toContain("'invoice.paid'");
    expect(script).toContain(".gte('stripe_created_at', prepared.snapshot.observedAt)");
    expect(script).toContain(".neq('id', eventId)");
    expect(script).toContain(".gte('observed_at', prepared.snapshot.observedAt)");
    expect(script).toContain(".neq('idempotency_key', prepared.snapshot.idempotencyKey)");
    expect(script).toContain("supabase.rpc('apply_enterprise_entitlement_snapshot_atomic'");
    expect(script).not.toContain('handleStripeWebhookEvent(');
    expect(script).not.toContain('handleStripeWebhookEventWithRecovery(');
    expect(script).not.toContain('sendEmail');
    expect(script).not.toContain('checkout.sessions');
  });
});