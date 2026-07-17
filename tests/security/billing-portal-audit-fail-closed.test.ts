import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/billing/portal/route.ts';

describe('billing portal audit persistence', () => {
  it('does not disclose the Stripe portal URL when audit persistence fails', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const auditResult = await writeAuditLog({');
    expect(source).toContain('if (!auditResult.persisted)');
    expect(source).toContain("area: 'billing_portal_audit'");
    expect(source).toContain("return noStoreJson({ error: 'billing_portal_audit_unavailable' }, { status: 503 });");

    const auditGuardIndex = source.indexOf('if (!auditResult.persisted)');
    const portalUrlResponseIndex = source.indexOf('url: portalSession.url');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(portalUrlResponseIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('preserves the existing billing authorization and step-up controls', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("permission: 'manage_billing'");
    expect(source).toContain('requireTrustedMutation(request');
    expect(source).toContain("action: 'manage_billing'");
    expect(source).toContain('requireStepUpForRequest({');
  });
});
