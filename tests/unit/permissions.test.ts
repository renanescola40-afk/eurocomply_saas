import { describe, expect, it } from 'vitest';
import { assertOrganizationPermission, getOrganizationPermissions, hasOrganizationPermission } from '@/lib/security/permissions';

describe('organization permissions', () => {
  it('allows owners and admins to manage billing and team access', () => {
    expect(hasOrganizationPermission('owner', 'billing:manage')).toBe(true);
    expect(hasOrganizationPermission('admin', 'billing:manage')).toBe(true);
    expect(hasOrganizationPermission('owner', 'team:invite')).toBe(true);
    expect(hasOrganizationPermission('admin', 'team:remove')).toBe(true);
  });

  it('keeps members out of billing, organization updates and destructive deletes', () => {
    expect(hasOrganizationPermission('member', 'billing:manage')).toBe(false);
    expect(hasOrganizationPermission('member', 'organization:update')).toBe(false);
    expect(hasOrganizationPermission('member', 'documents:delete')).toBe(false);
    expect(hasOrganizationPermission('member', 'vendors:delete')).toBe(false);
    expect(hasOrganizationPermission('member', 'risks:delete')).toBe(false);
    expect(hasOrganizationPermission('member', 'tasks:delete')).toBe(false);
  });

  it('allows members to do day-to-day operational work', () => {
    expect(hasOrganizationPermission('member', 'documents:write')).toBe(true);
    expect(hasOrganizationPermission('member', 'vendors:write')).toBe(true);
    expect(hasOrganizationPermission('member', 'risks:write')).toBe(true);
    expect(hasOrganizationPermission('member', 'tasks:write')).toBe(true);
    expect(hasOrganizationPermission('member', 'reports:read')).toBe(true);
    expect(hasOrganizationPermission('member', 'exports:create')).toBe(true);
  });

  it('rejects missing roles', () => {
    expect(hasOrganizationPermission(null, 'reports:read')).toBe(false);
    expect(() => assertOrganizationPermission(undefined, 'billing:manage')).toThrow('Missing required organization permission');
  });

  it('returns a stable role permission list', () => {
    expect(getOrganizationPermissions('owner')).toContain('audit:read');
    expect(getOrganizationPermissions('member')).not.toContain('audit:read');
  });
});
