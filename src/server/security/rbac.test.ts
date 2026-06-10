import { describe, expect, it } from 'vitest';

import { normalizeOrganizationRole, roleHasPermission } from './rbac';

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
});
