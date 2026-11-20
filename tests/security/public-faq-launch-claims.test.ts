import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const faqUrl = new URL('../../src/app/[locale]/faq/page.tsx', import.meta.url);

describe('public FAQ claims before commercial SaaS release', () => {
  it('does not advertise a live checkout, subscription or instant self-service upgrade', async () => {
    const source = await readFile(faqUrl, 'utf8');

    expect(source).toContain('paid subscriptions cannot be activated for customers until contractual, fiscal, security and runtime release gates pass.');
    expect(source).toContain('Instant self-service upgrades are not currently an available customer promise.');
    expect(source).not.toContain('Owners and admins can start checkout for a new plan or manage billing through Stripe.');
  });

  it('qualifies data isolation, storage and audit claims to deployed runtime evidence', async () => {
    const source = await readFile(faqUrl, 'utf8');

    expect(source).toContain('Isolation for customer use must be demonstrated on the actual deployed release.');
    expect(source).toContain('Customer upload and download require tested runtime security and an approved release.');
    expect(source).toContain('Their completeness and persistence must be verified in the deployed release.');
    expect(source).not.toContain('Yes. Organizations are isolated by organization_id');
  });

  it('does not promise reporting or plan-limit enforcement before approved entitlements', async () => {
    const source = await readFile(faqUrl, 'utf8');

    expect(source).toContain('Reports and exports are plan-dependent capabilities');
    expect(source).toContain('runtime quota enforcement still requires verification.');
    expect(source).toContain('Customer access depends on the approved release and applicable plan.');
  });
});
