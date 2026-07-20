import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const identityScanner = readFileSync(join(process.cwd(), 'scripts/security/check-server-action-identity.mjs'), 'utf8');
const risksAction = readFileSync(join(process.cwd(), 'src/server/actions/risks.ts'), 'utf8');
const vendorsAction = readFileSync(join(process.cwd(), 'src/server/actions/vendors.ts'), 'utf8');
const complianceTasksAction = readFileSync(join(process.cwd(), 'src/server/actions/compliance-tasks.ts'), 'utf8');
const billingActionPath = join(process.cwd(), 'src/server/actions/billing.ts');
const documentDownloadsAction = readFileSync(join(process.cwd(), 'src/server/actions/document-downloads.ts'), 'utf8');
const risksPage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/risks/page.tsx'), 'utf8');
const vendorsPage = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/organizations/vendors/page.tsx'), 'utf8');

describe('server action identity hardening invariants', () => {
  it('scans every standard action helper module under src/server/actions', () => {
    expect(identityScanner).toContain("rel.startsWith('src/server/actions/')");
    expect(identityScanner).toContain('isServerActionModule');
    expect(identityScanner).toContain('DEDICATED_SECURITY_SCANNER_MODULES');
    expect(identityScanner).toContain('src/server/actions/documents.ts');
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
    expect(risksAction).toContain('enforceRiskRateLimit');
    expect(risksAction).toContain("action: 'create' | 'update' | 'delete'");
    expect(risksAction).toContain('route: `server-action:${params.action}Risk`');
    expect(risksAction).toContain('action: `risk.${params.action}`');
    expect(risksAction).toContain("failureMode: 'fail-closed'");
    expect(risksAction).toContain("enforceRiskRateLimit({ action: 'create'");
    expect(risksAction).toContain("enforceRiskRateLimit({ action: 'update'");
    expect(risksAction).toContain("enforceRiskRateLimit({ action: 'delete'");
    expect(risksAction).toContain('reportError(error, context)');
    expect(risksAction).toContain("throw actionError('Unable to create risk')");
    expect(risksAction).toContain("throw actionError('Unable to update risk')");
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

  it('derives compliance task action identity server-side and avoids raw provider errors', () => {
    expect(complianceTasksAction).toContain('requireCurrentUser');
    expect(complianceTasksAction).not.toContain('createComplianceTask(input: CreateComplianceTaskInput, userId: string)');
    expect(complianceTasksAction).not.toContain('updateComplianceTask(taskId: string, organizationId: string, input: UpdateComplianceTaskInput, userId: string)');
    expect(complianceTasksAction).not.toContain('deleteComplianceTask(taskId: string, organizationId: string, userId: string)');
    expect(complianceTasksAction).toContain("failureMode: 'fail-closed'");
    expect(complianceTasksAction).toContain('reportError(error, context)');
    expect(complianceTasksAction).toContain("throw actionError('Unable to create task')");
    expect(complianceTasksAction).toContain("throw actionError('Unable to update task')");
    expect(complianceTasksAction).toContain("throw actionError('Unable to delete task')");
    expect(complianceTasksAction).not.toContain('throw error;');
  });

  it('keeps billing mutations API-only and document downloads sanitized', () => {
    expect(existsSync(billingActionPath)).toBe(false);
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
