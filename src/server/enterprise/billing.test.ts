/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc: mocks.rpc }),
}));

import { syncEnterpriseContractBillingEvent } from './billing';

const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';
const ORGANIZATION_ID = '22222222-2222-4222-8222-222222222222';

function subscriptionEvent(metadata: Record<string, string> = {}) {
  return {
    id: 'evt_sub',
    object: 'event',
    type: 'customer.subscription.updated',
    livemode: true,
    created: 1_800_000_000,
    data: {
      object: {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        metadata,
        items: { data: [{ price: { id: 'price_123' } }] },
      },
    },
  };
}

function currentInvoiceEvent() {
  return {
    id: 'evt_invoice',
    object: 'event',
    type: 'invoice.paid',
    livemode: true,
    created: 1_800_000_001,
    data: {
      object: {
        id: 'in_123',
        customer: 'cus_123',
        status: 'paid',
        paid: true,
        // Deliberately conflicting invoice metadata proves the current parent
        // subscription snapshot remains the authoritative Enterprise binding.
        metadata: {
          enterprise_contract_id: '33333333-3333-4333-8333-333333333333',
          organization_id: '44444444-4444-4444-8444-444444444444',
        },
        number: 'INV-123',
        parent: {
          subscription_details: {
            subscription: 'sub_enterprise',
            metadata: {
              enterprise_contract_id: CONTRACT_ID,
              organization_id: ORGANIZATION_ID,
            },
          },
        },
      },
    },
  };
}

function acaciaInvoiceEvent() {
  return {
    id: 'evt_invoice_acacia',
    object: 'event',
    type: 'invoice.payment_failed',
    livemode: true,
    created: 1_800_000_002,
    data: {
      object: {
        id: 'in_acacia',
        customer: 'cus_acacia',
        subscription: 'sub_acacia_enterprise',
        status: 'open',
        paid: false,
        // Deliberately conflicting invoice metadata proves the subscription
        // snapshot wins for the Enterprise binding.
        metadata: { organization_id: '33333333-3333-4333-8333-333333333333' },
        subscription_details: {
          metadata: {
            enterprise_contract_id: CONTRACT_ID,
            organization_id: ORGANIZATION_ID,
          },
        },
      },
    },
  };
}

function successfulEnterpriseRpc(overrides: Record<string, unknown> = {}) {
  return {
    data: [{
      outcome: 'synced',
      matched: true,
      contract_id: CONTRACT_ID,
      organization_id: ORGANIZATION_ID,
      previous_status: 'pending_activation',
      applied_status: 'active',
      billing_status: 'paid',
      version: 2,
      ...overrides,
    }],
    error: null,
  };
}

describe('Enterprise Stripe billing synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps canonically marked self-service events available while the bounded V19 RPC is not promoted', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });

    const result = await syncEnterpriseContractBillingEvent(
      subscriptionEvent({
        organization_id: ORGANIZATION_ID,
        billing_flow: 'initial_subscription',
      }),
    );

    expect(result).toEqual(expect.objectContaining({
      outcome: 'runtime_unavailable_unmatched',
      matched: false,
      organizationId: ORGANIZATION_ID,
    }));
    expect(mocks.rpc).toHaveBeenCalledWith(
      'sync_enterprise_contract_billing_v3_atomic',
      expect.objectContaining({
        p_contract_id: null,
        p_organization_id: ORGANIZATION_ID,
        p_stripe_subscription_id: 'sub_123',
      }),
    );
  });

  it('fails retryably for an ambiguous unmarked event while the V19 RPC is absent', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });

    await expect(syncEnterpriseContractBillingEvent(subscriptionEvent({
      organization_id: ORGANIZATION_ID,
    }))).rejects.toThrow('enterprise_billing_sync_unavailable');
  });

  it('fails retryably instead of acknowledging an explicitly Enterprise event when the V19 RPC is absent', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });

    await expect(syncEnterpriseContractBillingEvent(subscriptionEvent({
      enterprise_contract_id: CONTRACT_ID,
      organization_id: ORGANIZATION_ID,
    }))).rejects.toThrow('enterprise_billing_sync_unavailable');
  });

  it('fails retryably when an explicit Enterprise contract marker is not matched by the promoted v3 runtime', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        outcome: 'not_enterprise',
        matched: false,
        contract_id: null,
        organization_id: ORGANIZATION_ID,
        previous_status: null,
        applied_status: null,
        billing_status: null,
        version: null,
      }],
      error: null,
    });

    await expect(syncEnterpriseContractBillingEvent(subscriptionEvent({
      enterprise_contract_id: CONTRACT_ID,
      organization_id: ORGANIZATION_ID,
    }))).rejects.toThrow('enterprise_billing_explicit_contract_unmatched');
  });

  it('reads current Invoice parent subscription metadata and dispatches the strict v3 binding RPC', async () => {
    mocks.rpc.mockResolvedValue(successfulEnterpriseRpc());

    const result = await syncEnterpriseContractBillingEvent(currentInvoiceEvent());

    expect(result).toEqual({
      outcome: 'synced',
      matched: true,
      contractId: CONTRACT_ID,
      organizationId: ORGANIZATION_ID,
      previousStatus: 'pending_activation',
      appliedStatus: 'active',
      billingStatus: 'paid',
      version: 2,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'sync_enterprise_contract_billing_v3_atomic',
      expect.objectContaining({
        p_contract_id: CONTRACT_ID,
        p_organization_id: ORGANIZATION_ID,
        p_stripe_customer_id: 'cus_123',
        p_stripe_subscription_id: 'sub_enterprise',
        p_stripe_invoice_id: 'in_123',
        p_invoice_paid: true,
        p_external_reference: 'INV-123',
      }),
    );
  });

  it('preserves Acacia invoice.subscription_details metadata ahead of invoice-level metadata', async () => {
    mocks.rpc.mockResolvedValue(successfulEnterpriseRpc({
      applied_status: 'past_due',
      billing_status: 'past_due',
    }));

    const result = await syncEnterpriseContractBillingEvent(acaciaInvoiceEvent());

    expect(result).toEqual(expect.objectContaining({
      matched: true,
      contractId: CONTRACT_ID,
      organizationId: ORGANIZATION_ID,
      appliedStatus: 'past_due',
      billingStatus: 'past_due',
    }));
    expect(mocks.rpc).toHaveBeenCalledWith(
      'sync_enterprise_contract_billing_v3_atomic',
      expect.objectContaining({
        p_contract_id: CONTRACT_ID,
        p_organization_id: ORGANIZATION_ID,
        p_stripe_customer_id: 'cus_acacia',
        p_stripe_subscription_id: 'sub_acacia_enterprise',
        p_stripe_invoice_id: 'in_acacia',
        p_invoice_paid: false,
      }),
    );
  });

  it('does not call the Enterprise data plane for unrelated Stripe event types', async () => {
    const event = {
      id: 'evt_checkout',
      object: 'event',
      type: 'checkout.session.completed',
      livemode: true,
      created: 1_800_000_003,
      data: { object: { id: 'cs_123', metadata: {} } },
    };

    const result = await syncEnterpriseContractBillingEvent(event);

    expect(result).toEqual(expect.objectContaining({ outcome: 'unsupported', matched: false }));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
