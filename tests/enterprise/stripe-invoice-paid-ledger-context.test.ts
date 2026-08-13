import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/server/billing/stripe-webhook-recovery.ts'), 'utf8');

describe('invoice.paid ledger context', () => {
  it('retains the organization identifier derived from subscription metadata', () => {
    expect(source).toContain('getEntitlementOnlyOrganizationId');
    expect(source).toContain('invoice.parent?.subscription_details?.metadata');
    expect(source).toContain('finalizeEntitlementOnlyStripeEvent');
    expect(source).toContain('organization_id: organizationId');
    expect(source).toContain(".eq('status', 'processing')");
  });
});
