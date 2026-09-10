import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lifecycle = readFileSync('src/server/billing/subscription-lifecycle.ts', 'utf8');
const reconciliation = readFileSync('src/server/billing/add-on-reconciliation.ts', 'utf8');

describe('add-on invoice authority contract', () => {
  it('forces an immediate invoice for an explicit add-on purchase', () => {
    expect(lifecycle).toContain("input.action === 'replace_add_ons' ? 'always_invoice' : 'create_prorations'");
  });

  it('preserves only provider add-ons still billable on the destination plan', () => {
    expect(lifecycle).toContain('getEligibleProviderAddOnSelectionsForPlan');
    expect(lifecycle).toContain("input.action === 'upgrade' || input.action === 'downgrade'");
    expect(lifecycle).toContain('isAddOnAvailableForPlan(addOn, plan)');
  });

  it('binds paid activation to invoice line subscription-item identity', () => {
    expect(reconciliation).toContain('invoices.listLineItems');
    expect(reconciliation).toContain('subscription_item_details?.subscription_item');
    expect(reconciliation).toContain('paidSubscriptionItemIds?.has(item.id)');
    expect(reconciliation).toContain('stripe_add_on_invoice_lines_incomplete');
  });

  it('keeps delayed or unrelated paid invoices fail-closed for new add-ons', () => {
    expect(reconciliation).toContain('if (!paidByCurrentInvoice)');
    expect(reconciliation).toContain("return 'inactive' as const");
  });
});
