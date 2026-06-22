import { describe, expect, it } from 'vitest';

import {
  buildGdprDeletePlan,
  GDPR_DELETE_CONFIRMATION,
  GDPR_DELETE_SAFETY_DELAY_HOURS,
  normalizeDeleteReason,
  ORGANIZATION_EXPORT_TABLES,
  validateDeleteConfirmation,
} from '../../src/server/privacy/gdpr';
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

  it('allows authorized organization roles to export tenant data', () => {
    expect(roleHasPermission('owner', 'export_data')).toBe(true);
    expect(roleHasPermission('admin', 'export_data')).toBe(true);
    expect(roleHasPermission('editor', 'export_data')).toBe(true);
  });

  it('denies export for roles without export permission', () => {
    expect(roleHasPermission('member', 'export_data')).toBe(false);
    expect(roleHasPermission('viewer', 'export_data')).toBe(false);
  });

  it('rejects cross-tenant export tokens', () => {
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

  it('accepts delete only with step-up scoped to gdpr_delete', () => {
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
  });

  it('requires explicit delete confirmation text', () => {
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
});
