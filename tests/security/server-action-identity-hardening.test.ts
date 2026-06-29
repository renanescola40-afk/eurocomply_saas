import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const risksAction = readFileSync(join(process.cwd(), 'src/server/actions/risks.ts'), 'utf8');
const vendorsAction = readFileSync(join(process.cwd(), 'src/server/actions/vendors.ts'), 'utf8');
const risksPage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/risks/page.tsx'), 'utf8');
const vendorsPage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/vendors/page.tsx'), 'utf8');

describe('server action identity hardening invariants', () => {
  it('derives risk action identity server-side and rate limits mutations', () => {
    expect(risksAction).toContain('requireCurrentUser');
    expect(risksAction).not.toContain('createRisk(input: unknown, userId: string)');
    expect(risksAction).not.toContain('deleteRisk(riskId: string, organizationId: string, userId: string)');
    expect(risksAction).toContain("failureMode: 'fail-closed'");
    expect(risksAction).toContain("route: 'server-action:createRisk'");
    expect(risksAction).toContain("route: 'server-action:deleteRisk'");
    expect(risksAction).toContain('reportError(error, context)');
    expect(risksAction).not.toContain('if (error) throw error');
  });

  it('derives vendor action identity server-side and avoids raw provider errors', () => {
    expect(vendorsAction).toContain('requireCurrentUser');
    expect(vendorsAction).not.toContain('createVendor(input: unknown, userId: string)');
    expect(vendorsAction).not.toContain('updateVendor(input: unknown, userId: string)');
    expect(vendorsAction).not.toContain('deleteVendor(vendorId: string, organizationId: string, userId: string)');
    expect(vendorsAction).toContain('enforceVendorActionRateLimit');
    expect(vendorsAction).toContain("failureMode: 'fail-closed'");
    expect(vendorsAction).toContain('reportError(error, context)');
    expect(vendorsAction).not.toContain('return message ||');
    expect(vendorsAction).not.toContain('if (error) throw error');
  });

  it('does not pass authenticated user ids from page actions into risk or vendor actions', () => {
    expect(risksPage).not.toContain('currentUser.id,');
    expect(vendorsPage).not.toContain('user.id);');
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
