import { describe, expect, it } from 'vitest';
import {
  assertOrganizationPermission,
  getOrganizationPermissions,
  hasOrganizationPermission,
  type OrganizationPermission,
  type OrganizationRole,
} from '@/lib/security/permissions';

const destructivePermissions: OrganizationPermission[] = [
  'documents:delete',
  'vendors:delete',
  'risks:delete',
  'tasks:delete',
  'team:remove',
];

const memberDeniedPermissions: OrganizationPermission[] = [
  ...destructivePermissions,
  'billing:manage',
  'team:invite',
  'audit:read',
  'organization:update',
];

const writePermissions: OrganizationPermission[] = [
  'documents:write',
  'vendors:write',
  'risks:write',
  'tasks:write',
];

describe('organization permission matrix', () => {
  it('allows owners to perform every registered permission', () => {
    for (const permission of getOrganizationPermissions('owner')) {
      expect(hasOrganizationPermission('owner', permission)).toBe(true);
      expect(() => assertOrganizationPermission('owner', permission)).not.toThrow();
    }
  });

  it('allows admins to manage operational and billing workflows', () => {
    const expectedAdminPermissions: OrganizationPermission[] = [
      ...destructivePermissions,
      'billing:manage',
      'team:invite',
      'audit:read',
      'exports:create',
    ];

    for (const permission of expectedAdminPermissions) {
      expect(hasOrganizationPermission('admin', permission)).toBe(true);
      expect(() => assertOrganizationPermission('admin', permission)).not.toThrow();
    }
  });

  it('blocks members from destructive, billing, team invite and audit actions', () => {
    for (const permission of memberDeniedPermissions) {
      expect(hasOrganizationPermission('member', permission)).toBe(false);
      expect(() => assertOrganizationPermission('member', permission)).toThrow(permission);
    }
  });

  it('allows members to contribute operational records and exports', () => {
    const allowedMemberPermissions: OrganizationPermission[] = [
      'organization:read',
      'team:read',
      'documents:read',
      'vendors:read',
      'risks:read',
      'tasks:read',
      'reports:read',
      'exports:create',
      ...writePermissions,
    ];

    for (const permission of allowedMemberPermissions) {
      expect(hasOrganizationPermission('member', permission)).toBe(true);
      expect(() => assertOrganizationPermission('member', permission)).not.toThrow();
    }
  });

  it('denies unauthenticated or unknown roles', () => {
    expect(hasOrganizationPermission(null, 'organization:read')).toBe(false);
    expect(hasOrganizationPermission(undefined, 'organization:read')).toBe(false);
    expect(() => assertOrganizationPermission(null, 'organization:read')).toThrow('organization:read');
  });

  it('documents the supported roles', () => {
    const supportedRoles: OrganizationRole[] = ['owner', 'admin', 'member'];

    expect(supportedRoles).toEqual(['owner', 'admin', 'member']);
  });
});
