import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lifecycle = readFileSync('src/server/billing/subscription-lifecycle.ts', 'utf8');
const webhookAuthority = readFileSync('src/server/billing/stripe-event-mode.ts', 'utf8');

describe('billing add-on base price authority', () => {
  it('binds lifecycle base-item selection to the canonical plan price allowlist', () => {
    expect(lifecycle).toContain("import { getBillingPlanIdForStripePriceId } from '@/lib/billing/plans'");
    expect(lifecycle).toContain('Boolean(getBillingPlanIdForStripePriceId(candidate.price.id))');
    expect(lifecycle).toContain("throw new Error('stripe_base_subscription_item_not_found')");
    expect(lifecycle).toContain("throw new Error('stripe_base_subscription_item_ambiguous')");
    expect(lifecycle).not.toContain("candidate.price.recurring?.usage_type !== 'metered'");
  });

  it('requires webhook validation to recognize canonical plan and add-on prices separately', () => {
    expect(webhookAuthority).toContain('getBillingPlanIdForStripePriceId');
    expect(webhookAuthority).toContain('getBillingAddOnSlugForStripePriceId');
    expect(webhookAuthority).toContain("'subscription_add_on_price_not_allowlisted'");
    expect(webhookAuthority).toContain("'subscription_multiple_base_prices'");
  });
});
