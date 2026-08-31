import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const CHECKOUT = new URL('../../src/app/[locale]/checkout/page.tsx', import.meta.url);

describe('checkout RISCK UI V2 brand contract', () => {
  it('uses the official wordmark and cobalt/violet atmosphere', async () => {
    const source = await readFile(CHECKOUT, 'utf8');

    expect(source).toContain("import Image from 'next/image'");
    expect(source).toContain('src="/brand/risck-comply-wordmark.svg"');
    expect(source).toContain('alt="RISCK COMPLY"');
    expect(source).toContain('aria-label="RISCK COMPLY home"');
    expect(source).toContain('focus-visible:ring-blue-400/60');
    expect(source).toContain('bg-blue-500/20');
    expect(source).toContain('bg-violet-500/10');
    expect(source).not.toContain('bg-emerald-500/10');
  });

  it('preserves payment-first, billing authority, plan routing and semantic payment states', async () => {
    const source = await readFile(CHECKOUT, 'utf8');

    expect(source).toContain("import { BillingActionButton } from '@/app/[locale]/dashboard/organizations/billing/billing-action-button'");
    expect(source).toContain('const user = await getCurrentUser()');
    expect(source).toContain('getCurrentOrganizationForUser(user.id)');
    expect(source).toContain('getOrganizationBillingContext(organization.id)');
    expect(source).toContain('const selectedPlanIsSalesLed = selectedPlan.salesLed');
    expect(source).toContain('const selectedPlanIsCurrent = billing?.plan === selectedPlan.id');
    expect(source).toContain('const needsPaymentRecovery = hasStatus(billing?.status, PAYMENT_RECOVERY_STATUSES)');
    expect(source).toContain("const PAYMENT_RECOVERY_STATUSES = new Set(['past_due', 'unpaid', 'incomplete'])");
    expect(source).toContain('const checkoutContinuationPath =');
    expect(source).toContain('const onboardingPath =');
    expect(source).toContain('const salesLedPath =');
    expect(source).toContain('const billingDashboardPath =');
    expect(source).toContain('action="portal"');
    expect(source).toContain('action="checkout"');
    expect(source).toContain('border-amber-300/30 bg-amber-300/10');
    expect(source).toContain('border-emerald-300/30 bg-emerald-300/10');
    expect(source).toContain('text-emerald-300');
  });
});
