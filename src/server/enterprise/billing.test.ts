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

function invoiceEvent() {
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
        metadata: {},
        number: 'INV-123',
        parent: {
          subscription_details: {
            subscription: 'sub_enterprise',
            metadata: {
              enterprise_contract_id: '11111111-1111-4111-8111-111111111111',
              organization_id: '22222222-2222-4222-8222-222222222222',
            },
          },
        },
      },
    },
  };
}

describe('Enterprise Stripe billing synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps ordinary self-service events available while the bounded V19 RPC is not promoted', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });

    const result = await syncEnterpriseContractBillingEvent(
      subscriptionEvent({ organization_id: '22222222-2222-4222-8222-222222222222' }),
    );

    expect(result).toEqual(expect.objectContaining({
      outcome: 'runtime_unavailable_unmatched',
      matched: false,
      organizationId: '22222222-2222-4222-8222-222222222222',
    }));
    expect(mocks.rpc).toHaveBeenCalledWith(
      'sync_enterprise_contract_billing_v3_atomic',
      expect.objectContaining({
        p_contract_id: null,
        p_organization_id: '22222222-2222-4222-8222-222222222222',
        p_stripe_subscription_id: 'sub_123',
      }),
    );
  });

  it('fails retryably instead of acknowledging an explicitly Enterprise event when the V19 RPC is absent', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });

    await expect(syncEnterpriseContractBillingEvent(subscriptionEvent({
      enterprise_contract_id: '11111111-1111-4111-8111-111111111111',
      organization_id: '22222222-2222-4222-8222-222222222222',
    }))).rejects.toThrow('enterprise_billing_sync_unavailable');
  });

  it('reads current Invoice parent subscription metadata and dispatches the strict v3 binding RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        outcome: 'synced',
        matched: true,
        contract_id: '11111111-1111-4111-8111-111111111111',
        organization_id: '22222222-2222-4222-8222-222222222222',
        previous_status: 'pending_activation',
        applied_status: 'active',
        billing_status: 'paid',
        version: 2,
      }],
      error: null,
    });

    const result = await syncEnterpriseContractBillingEvent(invoiceEvent());

    expect(result).toEqual({
      outcome: 'synced',
      matched: true,
      contractId: '11111111-1111-4111-8111-111111111111',
      organizationId: '22222222-2222-4222-8222-222222222222',
      previousStatus: 'pending_activation',
      appliedStatus: 'active',
      billingStatus: 'paid',
      version: 2,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'sync_enterprise_contract_billing_v3_atomic',
      expect.objectContaining({
        p_contract_id: '11111111-1111-4111-8111-111111111111',
        p_organization_id: '22222222-2222-4222-8222-222222222222',
        p_stripe_customer_id: 'cus_123',
        p_stripe_subscription_id: 'sub_enterprise',
        p_stripe_invoice_id: 'in_123',
        p_invoice_paid: true,
        p_external_reference: 'INV-123',
      }),
    );
  });

  it('does not call the Enterprise data plane for unrelated Stripe event types', async () => {
    const event = {
      id: 'evt_checkout',
      object: 'event',
      type: 'checkout.session.completed',
      livemode: true,
      created: 1_800_000_002,
      data: { object: { id: 'cs_123', metadata: {} } },
    };

    const result = await syncEnterpriseContractBillingEvent(event);

    expect(result).toEqual(expect.objectContaining({ outcome: 'unsupported', matched: false }));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
