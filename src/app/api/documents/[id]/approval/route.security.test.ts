import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  join(process.cwd(), 'src/app/api/documents/[id]/approval/route.ts'),
  'utf8',
);

describe('document approval route security contract', () => {
  it('retains identity, permission, trusted-mutation, tenant, and no-store controls', () => {
    expect(routeSource).toContain('requireApiUser');
    expect(routeSource).toContain("permission: 'manage_documents'");
    expect(routeSource).toContain('requireTrustedMutation');
    expect(routeSource).toContain('assertApiResourceOrganization');
    expect(routeSource).toContain('noStoreJson');
  });

  it('scopes the admin lookup to the active organization before loading document data', () => {
    const lookupStart = routeSource.indexOf(".from('documents')");
    const lookupEnd = routeSource.indexOf('.maybeSingle<DocumentApprovalRow>()', lookupStart);
    const lookupSource = routeSource.slice(lookupStart, lookupEnd);

    expect(lookupStart).toBeGreaterThan(-1);
    expect(lookupSource).toContain(".eq('id', id)");
    expect(lookupSource).toContain(".eq('organization_id', organization.id)");
  });

  it('rejects same-state no-op requests before update or success evidence', () => {
    const noOpGuard = routeSource.indexOf('existingDocument.status === nextStatus');
    const approvalUpdate = routeSource.indexOf('let approvalUpdate =');
    const successAudit = routeSource.indexOf('const audit = await createAuditEvent');

    expect(noOpGuard).toBeGreaterThan(-1);
    expect(routeSource).toContain("reason: 'document_state_unchanged'");
    expect(routeSource).toContain("error: 'document_state_unchanged'");
    expect(noOpGuard).toBeLessThan(approvalUpdate);
    expect(approvalUpdate).toBeLessThan(successAudit);
  });

  it('uses the loaded status as a compare-and-set predicate and verifies the affected row', () => {
    expect(routeSource).toContain("approvalUpdate.is('status', null)");
    expect(routeSource).toContain("approvalUpdate.eq('status', existingDocument.status)");
    expect(routeSource).toContain(".select('id,name,status,organization_id')");
    expect(routeSource).toContain('.maybeSingle<DocumentApprovalRow>()');
    expect(routeSource).toContain("error: 'document_state_changed'");
    expect(routeSource).toContain('{ status: 409 }');
  });

  it('does not write success audit evidence or notifications before transition confirmation', () => {
    const stateChangedGuard = routeSource.indexOf("error: 'document_state_changed'");
    const successAudit = routeSource.indexOf('const audit = await createAuditEvent');
    const notification = routeSource.indexOf('const notification = await createNotification');

    expect(stateChangedGuard).toBeGreaterThan(-1);
    expect(successAudit).toBeGreaterThan(stateChangedGuard);
    expect(notification).toBeGreaterThan(successAudit);
  });
});
