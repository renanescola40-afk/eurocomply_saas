import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const PAGE = new URL('../../src/app/[locale]/onboarding/page.tsx', import.meta.url);
const LAYOUT = new URL('../../src/app/[locale]/onboarding/layout.tsx', import.meta.url);
const STYLES = new URL('../../src/app/[locale]/onboarding/onboarding-purchase-ui-v2.module.css', import.meta.url);

describe('RISCK COMPLY UI V2 payment-first onboarding purchase stage', () => {
  it('keeps payment-first authority untouched while applying route-level enterprise chrome', async () => {
    const [page, layout, css] = await Promise.all([
      readFile(PAGE, 'utf8'),
      readFile(LAYOUT, 'utf8'),
      readFile(STYLES, 'utf8'),
    ]);

    expect(page).toContain('requireLicensedOnboardingPageAccess');
    expect(page).toContain('getOrganizationBillingAuthority(input.organizationId)');
    expect(page).toContain('async function createPurchaseContext(formData: FormData)');
    expect(page).toContain('await createOrganization({');
    expect(page).toContain('redirect(getBillingRecoveryPath(safeLocale, selectedPlan.id))');
    expect(page).toContain('<form action={createPurchaseContext}');

    expect(layout).toContain("import styles from './onboarding-purchase-ui-v2.module.css'");
    expect(layout).toContain('data-risck-onboarding-route="risck-ui-v2"');
    expect(layout).toContain('robots: {');
    expect(layout).toContain('index: false');
    expect(layout).toContain('follow: false');
    expect(layout).toContain('nocache: true');
    expect(layout).toContain('noimageindex: true');

    expect(css).toContain("url('/brand/risck-comply-wordmark.svg')");
    expect(css).toContain('color: rgb(253 230 138) !important');
    expect(css).toContain('background: rgb(37 99 235) !important');
    expect(css).toContain('background: #0a1320 !important');
    expect(css).toContain("button[type='submit']");
    expect(css).not.toContain('rgb(110 231 183)');
  });
});
