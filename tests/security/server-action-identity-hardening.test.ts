import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const identityScanner = readFileSync(join(process.cwd(), 'scripts/security/check-server-action-identity.mjs'), 'utf8');
const risksAction = readFileSync(join(process.cwd(), 'src/server/actions/risks.ts'), 'utf8');
const vendorsAction = readFileSync(join(process.cwd(), 'src/server/actions/vendors.ts'), 'utf8');
const billingAction = readFileSync(join(process.cwd(), 'src/server/actions/billing.ts'), 'utf8');
const documentDownloadsAction = readFileSync(join(process.cwd(), 'src/server/actions/document-downloads.ts'), 'utf8');
const risksPage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/risks/page.tsx'), 'utf8');
const vendorsPage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/vendors/page.tsx'), 'utf8');

describe('server action identity hardening invariants', () => {
  it('scans every action helper module under src/server/actions', () => {
    expect(identityScanner).toContain("rel.startsWith('src/server/actions/')");
    expect(identityScanner).toContain('isServerActionModule');
    expect(identityScanner).not.toContain('if (!hasTopLevelServerActionDirective(content))');
  });

  it('fails on caller-supplied identity and unsanitized provider failures', () => {
    for (const expected of [
      'exported server action parameter named userId',
      'exported server action parameter named actorUserId',
      'exported server action parameter named invitedByUserId',
      'server action throws raw provider error message',
      'server action rethrows raw provider error',
      'server action rethrows raw caught error',
    ]) {
      expect(identityScanner).toContain(expected);
    }
  });

  it('derives risk action identity server-side and rate limits mutations', () => {
    expect(risksAction).toContain('requireCurrentUser');
    expect(risksAction).not.toContain('createRisk(input: unknown, userId: string)');
    expect(risksAction).not.toContain('deleteRisk(riskId: string, organizationId: string, userId: string)');
    expect(risksAction).toContain("failureMode: 'fail-closed'");
    expect(risksAction).toContain("route: 'server-action:createRisk'");
    expect(risksAction).toContain("route: 'server-action:deleteRisk'");
    expect(risksAction).toContain('reportError(error, context)');
    expect(risksAction).toContain("throw actionError('Unable to create risk')");
    expect(risksAction).toContain("throw actionError('Unable to delete risk')");
  });

  it('derives vendor action identity server-side and avoids raw provider errors', () => {
    expect(vendorsAction).toContain('requireCurrentUser');
    expect(vendorsAction).not.toContain('createVendor(input: unknown, userId: string)');
    expect(vendorsAction).not.toContain('updateVendor(input: unknown, userId: string)');
    expect(vendorsAction).not.toContain('deleteVendor(vendorId: string, organizationId: string, userId: string)');
    expect(vendorsAction).toContain('enforceVendorActionRateLimit');
    expect(vendorsAction).toContain("failureMode: 'fail-closed'");
    expect(vendorsAction).toContain('reportError(error, context)');
    expect(vendorsAction).toContain('toVendorErrorMessage(error,');
    expect(vendorsAction).not.toContain('return message ||');
  });

  it('keeps billing mutations API-only and document downloads sanitized', () => {
    expect(billingAction).toContain('Billing mutations must go through the hardened /api/billing routes.');
    expect(billingAction).not.toContain('stripe.checkout.sessions.create');
    expect(billingAction).not.toContain('stripe.billingPortal.sessions.create');
    expect(billingAction).not.toContain('throw subscriptionError');
    expect(billingAction).not.toContain('throw error;');
    expect(documentDownloadsAction).toContain("throw actionError('Document not found')");
    expect(documentDownloadsAction).not.toContain('throw error;');
  });

  it('does not pass authenticated user ids from page actions into risk or vendor mutations', () => {
    expect(risksPage).not.toContain('currentUser.id,');
    expect(vendorsPage).not.toContain('createVendor({ organizationId: current.id, ...input },');
    expect(vendorsPage).not.toContain('deleteVendor(vendorId, current.id, user.id)');
    expect(risksPage).toContain('await createRisk({');
    expect(risksPage).toContain('await deleteRisk(riskId, currentOrganization.id)');
    expect(vendorsPage).toContain('await createVendor({ organizationId: current.id, ...input })');
    expect(vendorsPage).toContain('await deleteVendor(vendorId, current.id)');
  });

  it('keeps tenant filters on destructive mutations', () => {
    expect(risksAction).toContain(".eq('organization_id', payload.organizationId)");
    expect(vendorsAction).toContain(".eq('organization_id', payload.organizationId)");
  });
});
