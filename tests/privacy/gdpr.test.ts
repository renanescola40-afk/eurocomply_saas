import { describe, expect, it } from 'vitest';

import {
  buildGdprDeleteAuditMetadata,
  buildGdprDeletePlan,
  buildGdprExportAuditMetadata,
  GDPR_DELETE_CONFIRMATION,
  GDPR_DELETE_SAFETY_DELAY_HOURS,
  normalizeDeleteReason,
  ORGANIZATION_EXPORT_TABLES,
  validateDeleteConfirmation,
  validateRequestedOrganizationScope,
} from '../../src/server/privacy/gdpr';
import { NO_STORE_HEADERS } from '../../src/server/security/no-store';
import { roleHasPermission } from '../../src/server/security/rbac';
import { assessStepUpToken, createStepUpToken } from '../../src/server/security/step-up';

const signingKeyForTests = 'gdpr-privacy-signing-key-for-tests';

function createToken(input: { action: 'export_data' | 'gdpr_delete'; organizationId?: string; verifiedAt?: string }) {
  return createStepUpToken({
    action: input.action,
    userId: 'user_123',
    organizationId: input.organizationId ?? 'org_123',
    verifiedAt: input.verifiedAt ?? '2026-06-22T10:00:00.000Z',
    nonce: `${input.action}-nonce`,
    secret: signingKeyForTests,
  });
}

describe('GDPR privacy controls', () => {
  it('maps all required enterprise datasets into the export/delete inventory', () => {
    expect(ORGANIZATION_EXPORT_TABLES.map((table) => table.key)).toEqual(
      expect.arrayContaining([
        'users',
        'organizations',
        'organization_members',
        'documents',
        'risks',
        'vendors',
        'tasks',
        'audit_events',
        'notifications',
        'subscriptions',
        'billing_metadata',
        'logs',
      ]),
    );
  });

  it('allows authorized organization roles to export tenant data with step-up and no-store controls', () => {
    const token = createToken({ action: 'export_data' });
    const assessment = assessStepUpToken({
      action: 'export_data',
      userId: 'user_123',
      organizationId: 'org_123',
      token,
      now: '2026-06-22T10:01:00.000Z',
      secret: signingKeyForTests,
    });

    expect(roleHasPermission('owner', 'export_data')).toBe(true);
    expect(roleHasPermission('admin', 'export_data')).toBe(true);
    expect(roleHasPermission('editor', 'export_data')).toBe(true);
    expect(validateRequestedOrganizationScope('org_123', 'org_123')).toMatchObject({ ok: true });
    expect(assessment).toMatchObject({ ok: true, action: 'export_data' });
    expect(NO_STORE_HEADERS['Cache-Control']).toContain('no-store');
  });

  it('denies export for roles without export permission', () => {
    expect(roleHasPermission('member', 'export_data')).toBe(false);
    expect(roleHasPermission('viewer', 'export_data')).toBe(false);
  });

  it('rejects cross-tenant export requests and cross-tenant step-up tokens', () => {
    expect(validateRequestedOrganizationScope('org_other', 'org_123')).toMatchObject({
      ok: false,
      status: 403,
      error: 'cross_tenant_export_denied',
      auditReason: 'cross_tenant_export_denied',
    });

    const token = createToken({ action: 'export_data', organizationId: 'org_123' });
    const assessment = assessStepUpToken({
      action: 'export_data',
      userId: 'user_123',
      organizationId: 'org_other',
      token,
      now: '2026-06-22T10:01:00.000Z',
      secret: signingKeyForTests,
    });

    expect(assessment).toMatchObject({ ok: false, reason: 'step_up_token_scope_mismatch' });
  });

  it('rejects invalid organization identifiers before export scoping', () => {
    expect(validateRequestedOrganizationScope('../org_123', 'org_123')).toMatchObject({
      ok: false,
      status: 400,
      error: 'invalid_organization_id',
      auditReason: 'invalid_requested_organization_id',
    });
  });

  it('rejects delete requests without valid step-up', () => {
    const assessment = assessStepUpToken({
      action: 'gdpr_delete',
      userId: 'user_123',
      organizationId: 'org_123',
      token: null,
      now: '2026-06-22T10:01:00.000Z',
      secret: signingKeyForTests,
    });

    expect(assessment).toMatchObject({ ok: false, reason: 'missing_verification' });
  });

  it('accepts delete only with step-up scoped to gdpr_delete and explicit confirmation', () => {
    const token = createToken({ action: 'gdpr_delete' });
    const assessment = assessStepUpToken({
      action: 'gdpr_delete',
      userId: 'user_123',
      organizationId: 'org_123',
      token,
      now: '2026-06-22T10:01:00.000Z',
      secret: signingKeyForTests,
    });

    expect(assessment).toMatchObject({ ok: true, action: 'gdpr_delete' });
    expect(validateDeleteConfirmation({ confirmation: GDPR_DELETE_CONFIRMATION })).toBe(true);
    expect(validateDeleteConfirmation({ confirmation: 'delete' })).toBe(false);
    expect(normalizeDeleteReason('  customer request  ')).toBe('customer request');
  });

  it('preserves legal, billing, and audit-chain data in the delete plan', () => {
    const plan = buildGdprDeletePlan(new Date('2026-06-22T10:00:00.000Z'));

    expect(plan.status).toBe('pending_review');
    expect(plan.safetyDelayHours).toBe(GDPR_DELETE_SAFETY_DELAY_HOURS);
    expect(plan.reviewNotBefore).toBe('2026-06-25T10:00:00.000Z');
    expect(plan.legalRetentionPreserved).toEqual(expect.arrayContaining(['subscriptions', 'billing_metadata', 'audit_events', 'audit_logs']));
    expect(plan.actions.find((action) => action.key === 'documents')).toMatchObject({ action: 'delete' });
    expect(plan.actions.find((action) => action.key === 'audit_events')).toMatchObject({ action: 'preserve' });
  });

  it('builds GDPR audit metadata without exposing step-up token material', () => {
    const exportMetadata = buildGdprExportAuditMetadata({
      plan: 'enterprise',
      role: 'admin',
      tableKeys: ['users', 'organizations', 'documents'],
      unavailableTables: [],
      stepUp: { action: 'export_data', verifiedAt: '2026-06-22T10:00:00.000Z' },
    });
    const deletePlan = buildGdprDeletePlan(new Date('2026-06-22T10:00:00.000Z'));
    const deleteMetadata = buildGdprDeleteAuditMetadata({
      reason: 'customer request',
      role: 'owner',
      plan: 'enterprise',
      deletePlan,
      stepUp: { action: 'gdpr_delete', verifiedAt: '2026-06-22T10:00:00.000Z' },
    });

    expect(exportMetadata).toMatchObject({ scope: 'organization_export', stepUpTokenType: 'signed_hmac' });
    expect(deleteMetadata).toMatchObject({ reason: 'customer request', stepUpTokenType: 'signed_hmac' });
    expect(JSON.stringify({ exportMetadata, deleteMetadata })).not.toMatch(/nonce|token\./i);
  });
});
