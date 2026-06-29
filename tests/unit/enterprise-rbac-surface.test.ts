import { describe, expect, it } from 'vitest';

import {
  getOrganizationPermissionMatrix,
  getRolePermissions,
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLES,
  roleHasPermission,
  type OrganizationPermission,
  type OrganizationRole,
} from '@/server/security/rbac';

const readOnlyFeaturePermissions: OrganizationPermission[] = [
  'read_documents',
  'read_vendors',
  'read_risks',
  'read_ai_governance',
  'read_ai_incidents',
];

const privilegedMutationPermissions: OrganizationPermission[] = [
  'manage_billing',
  'manage_team',
  'manage_documents',
  'manage_vendors',
  'manage_risks',
  'manage_ai_governance',
  'manage_ai_incidents',
  'manage_settings',
  'export_data',
  'read_audit',
];

const enterpriseRoleExpectations: Record<OrganizationRole, { allow: OrganizationPermission[]; deny: OrganizationPermission[] }> = {
  owner: {
    allow: ORGANIZATION_PERMISSIONS,
    deny: [],
  },
  admin: {
    allow: ORGANIZATION_PERMISSIONS,
    deny: [],
  },
  editor: {
    allow: [
      'manage_documents',
      'read_documents',
      'manage_vendors',
      'read_vendors',
      'manage_risks',
      'read_risks',
      'manage_ai_governance',
      'read_ai_governance',
      'manage_ai_incidents',
      'read_ai_incidents',
      'export_data',
    ],
    deny: ['manage_billing', 'manage_team', 'read_audit', 'manage_settings'],
  },
  member: {
    allow: ['manage_documents', 'read_documents', 'read_vendors', 'read_risks', 'read_ai_governance', 'read_ai_incidents'],
    deny: [
      'manage_billing',
      'manage_team',
      'manage_vendors',
      'manage_risks',
      'manage_ai_governance',
      'manage_ai_incidents',
      'read_audit',
      'export_data',
      'manage_settings',
    ],
  },
  viewer: {
    allow: readOnlyFeaturePermissions,
    deny: privilegedMutationPermissions,
  },
};

describe('enterprise RBAC surface', () => {
  it('covers owner, admin, member and viewer roles used by enterprise QA', () => {
    expect(ORGANIZATION_ROLES).toEqual(expect.arrayContaining(['owner', 'admin', 'member', 'viewer']));
    expect(new Set(ORGANIZATION_ROLES).size).toBe(ORGANIZATION_ROLES.length);
  });

  it('keeps every matrix permission registered in the canonical permission list', () => {
    const registeredPermissions = new Set(ORGANIZATION_PERMISSIONS);
    const unknownPermissions = getOrganizationPermissionMatrix().flatMap((entry) =>
      entry.permissions.filter((permission) => !registeredPermissions.has(permission)).map((permission) => `${entry.role}:${permission}`),
    );

    expect(unknownPermissions).toEqual([]);
  });

  for (const role of ORGANIZATION_ROLES) {
    it(`${role} permissions match the enterprise contract`, () => {
      const expected = enterpriseRoleExpectations[role];

      for (const permission of expected.allow) {
        expect(roleHasPermission(role, permission), `${role} should allow ${permission}`).toBe(true);
      }

      for (const permission of expected.deny) {
        expect(roleHasPermission(role, permission), `${role} should deny ${permission}`).toBe(false);
      }
    });
  }

  it('keeps viewer read-only across documents, vendors, risks, AI inventory and AI incidents', () => {
    const viewerPermissions = getRolePermissions('viewer');

    expect(viewerPermissions).toEqual(expect.arrayContaining(readOnlyFeaturePermissions));
    expect(viewerPermissions.filter((permission) => permission.startsWith('manage_'))).toEqual([]);
    expect(viewerPermissions).not.toContain('export_data');
    expect(viewerPermissions).not.toContain('read_audit');
  });

  it('keeps returned permission arrays immutable from callers by returning copies', () => {
    const firstRead = getRolePermissions('viewer');
    firstRead.push('manage_billing');

    expect(getRolePermissions('viewer')).not.toContain('manage_billing');
  });
});
