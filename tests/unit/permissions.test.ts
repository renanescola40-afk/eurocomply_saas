import { describe, expect, it } from 'vitest';
import {
  assertOrganizationPermission,
  getOrganizationPermissions,
  hasOrganizationPermission,
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLES,
  type OrganizationPermission,
  type OrganizationRole,
} from '@/lib/security/permissions';

const readOnlyPermissions: OrganizationPermission[] = [
  'read_documents',
  'read_vendors',
  'read_risks',
  'read_ai_governance',
  'read_ai_incidents',
];

const privilegedPermissions: OrganizationPermission[] = [
  'manage_billing',
  'manage_team',
  'manage_settings',
  'read_audit',
  'export_data',
];

const mutationPermissions: OrganizationPermission[] = [
  'manage_documents',
  'manage_vendors',
  'manage_risks',
  'manage_ai_governance',
  'manage_ai_incidents',
];

describe('organization permission matrix', () => {
  it('allows owners and admins to perform every registered permission', () => {
    for (const role of ['owner', 'admin'] satisfies OrganizationRole[]) {
      for (const permission of ORGANIZATION_PERMISSIONS) {
        expect(hasOrganizationPermission(role, permission)).toBe(true);
        expect(() => assertOrganizationPermission(role, permission)).not.toThrow();
      }
    }
  });

  it('allows editors to manage operational workflows but not enterprise administration', () => {
    const allowedEditorPermissions: OrganizationPermission[] = [...readOnlyPermissions, ...mutationPermissions, 'export_data'];

    for (const permission of allowedEditorPermissions) {
      expect(hasOrganizationPermission('editor', permission), `editor should allow ${permission}`).toBe(true);
    }

    for (const permission of ['manage_billing', 'manage_team', 'manage_settings', 'read_audit'] satisfies OrganizationPermission[]) {
      expect(hasOrganizationPermission('editor', permission), `editor should deny ${permission}`).toBe(false);
      expect(() => assertOrganizationPermission('editor', permission)).toThrow(permission);
    }
  });

  it('blocks members from billing, team, settings, audit, exports and privileged mutations', () => {
    const memberDeniedPermissions: OrganizationPermission[] = [
      ...privilegedPermissions,
      'manage_vendors',
      'manage_risks',
      'manage_ai_governance',
      'manage_ai_incidents',
    ];

    for (const permission of memberDeniedPermissions) {
      expect(hasOrganizationPermission('member', permission), `member should deny ${permission}`).toBe(false);
      expect(() => assertOrganizationPermission('member', permission)).toThrow(permission);
    }
  });

  it('allows members to contribute documents and read operational records', () => {
    const allowedMemberPermissions: OrganizationPermission[] = [
      'manage_documents',
      'read_documents',
      'read_vendors',
      'read_risks',
      'read_ai_governance',
      'read_ai_incidents',
    ];

    for (const permission of allowedMemberPermissions) {
      expect(hasOrganizationPermission('member', permission), `member should allow ${permission}`).toBe(true);
      expect(() => assertOrganizationPermission('member', permission)).not.toThrow();
    }
  });

  it('keeps viewers read-only', () => {
    for (const permission of readOnlyPermissions) {
      expect(hasOrganizationPermission('viewer', permission), `viewer should allow ${permission}`).toBe(true);
    }

    for (const permission of [...privilegedPermissions, ...mutationPermissions]) {
      expect(hasOrganizationPermission('viewer', permission), `viewer should deny ${permission}`).toBe(false);
    }
  });

  it('denies unauthenticated roles instead of silently granting viewer permissions', () => {
    expect(hasOrganizationPermission(null, 'read_documents')).toBe(false);
    expect(hasOrganizationPermission(undefined, 'manage_billing')).toBe(false);
    expect(() => assertOrganizationPermission(null, 'read_documents')).toThrow('read_documents');
    expect(() => assertOrganizationPermission(undefined, 'manage_billing')).toThrow('manage_billing');
  });

  it('documents the supported enterprise roles', () => {
    expect(ORGANIZATION_ROLES).toEqual(['owner', 'admin', 'editor', 'member', 'viewer']);
    expect(new Set(ORGANIZATION_ROLES).size).toBe(ORGANIZATION_ROLES.length);
  });

  it('returns copies of permission arrays', () => {
    const permissions = getOrganizationPermissions('viewer');
    permissions.push('manage_billing');

    expect(getOrganizationPermissions('viewer')).not.toContain('manage_billing');
  });
});
