import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  getOrganizationPermissionMatrix,
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLES,
  roleHasPermission,
  type OrganizationPermission,
  type OrganizationRole,
} from '@/lib/security/permissions';

// The enterprise permission document is an audit artifact: every effective
// canonical grant must be represented, with no extra or ambiguous rows.
const matrixFile = 'docs/security/RBAC_MATRIX.md';
const roles = ORGANIZATION_ROLES as readonly OrganizationRole[];

function documentedMatrix() {
  const document = readFileSync(matrixFile, 'utf8');
  const section = document.split('## Permission matrix\\n')[1]?.split(/\\n## /)[0];
  if (!section) throw new Error('SEC-02 canonical permission matrix section missing');
  return section.split(/\\r?\\n/)
    .filter((line) => /^\|\s*`[a-z_]+`\s*\|/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .map((cells) => ({
      permission: cells[0]?.replaceAll('`', '') as OrganizationPermission,
      grants: cells.slice(1),
    }));
}

describe('SEC-02 — canonical RBAC matrix remains consistent with code', () => {
  it('documents each canonical permission exactly once in source order', () => {
    const rows = documentedMatrix();
    expect(rows.map((row) => row.permission)).toEqual(ORGANIZATION_PERMISSIONS);
    expect(new Set(rows.map((row) => row.permission)).size).toBe(ORGANIZATION_PERMISSIONS.length);
  });

  it('documents each role grant and denial exactly as enforced by code', () => {
    const rows = documentedMatrix();
    const canonical = getOrganizationPermissionMatrix();

    expect(canonical.map((row) => row.role)).toEqual(roles);
    for (const row of rows) {
      expect(row.grants).toHaveLength(roles.length);
      for (const [index, role] of roles.entries()) {
        const actual = roleHasPermission(role, row.permission);
        expect(row.grants[index], `${role}:${row.permission}`).toBe(actual ? 'yes' : 'no');
      }
    }
  });

  it('keeps unrecognized roles unauthorized for every canonical permission', () => {
    for (const role of ['unexpected-role', 'org:superuser', '', '  ', null, undefined]) {
      for (const permission of ORGANIZATION_PERMISSIONS) {
        expect(roleHasPermission(role, permission)).toBe(false);
      }
    }
  });
});
