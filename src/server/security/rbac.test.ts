import { describe, expect, it } from 'vitest';

import {
  getOrganizationPermissionMatrix,
  getRolePermissions,
  normalizeOrganizationRole,
  ORGANIZATION_ROLES,
  permissionDeniedResponse,
  roleHasPermission,
} from './rbac';

describe('organization RBAC', () => {
  it('normalizes supported role aliases', () => {
    expect(normalizeOrganizationRole('Admin')).toBe('admin');
    expect(normalizeOrganizationRole('Editor')).toBe('editor');
    expect(normalizeOrganizationRole('Visualizador')).toBe('viewer');
    expect(normalizeOrganizationRole('owner')).toBe('owner');
    expect(normalizeOrganizationRole('membro')).toBe('member');
  });

  it('falls back unknown roles to viewer', () => {
    expect(normalizeOrganizationRole('unexpected-role')).toBe('viewer');
    expect(normalizeOrganizationRole(null)).toBe('viewer');
  });

  it('allows admin to manage team and billing', () => {
    expect(roleHasPermission('Admin', 'manage_team')).toBe(true);
    expect(roleHasPermission('Admin', 'manage_billing')).toBe(true);
  });

  it('allows editor to manage operational records but not billing or team', () => {
    expect(roleHasPermission('Editor', 'manage_documents')).toBe(true);
    expect(roleHasPermission('Editor', 'manage_ai_governance')).toBe(true);
    expect(roleHasPermission('Editor', 'manage_ai_incidents')).toBe(true);
    expect(roleHasPermission('Editor', 'manage_team')).toBe(false);
    expect(roleHasPermission('Editor', 'manage_billing')).toBe(false);
  });

  it('keeps viewer read-only', () => {
    expect(roleHasPermission('Visualizador', 'read_documents')).toBe(true);
    expect(roleHasPermission('Visualizador', 'read_ai_governance')).toBe(true);
    expect(roleHasPermission('Visualizador', 'manage_documents')).toBe(false);
    expect(roleHasPermission('Visualizador', 'export_data')).toBe(false);
  });

  it('returns effective permissions for a role alias', () => {
    expect(getRolePermissions('Administrador')).toContain('manage_settings');
    expect(getRolePermissions('leitor')).toEqual(expect.arrayContaining(['read_documents', 'read_ai_governance']));
    expect(getRolePermissions('leitor')).not.toContain('manage_billing');
  });

  it('returns one permission matrix row per supported role', () => {
    const matrix = getOrganizationPermissionMatrix();

    expect(matrix.map((entry) => entry.role)).toEqual(ORGANIZATION_ROLES);
    expect(matrix.find((entry) => entry.role === 'owner')?.permissions).toContain('manage_billing');
    expect(matrix.find((entry) => entry.role === 'viewer')?.permissions).not.toContain('export_data');
  });

  it('returns no-store headers for denied responses', () => {
    const response = permissionDeniedResponse({
      ok: false,
      status: 403,
      error: 'insufficient_role_permission',
      message: 'Your organization role does not allow this action.',
      permission: 'manage_billing',
      role: 'viewer',
    });

    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
  });
});
