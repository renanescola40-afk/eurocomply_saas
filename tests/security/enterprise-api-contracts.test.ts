import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type ApiRouteContract = {
  area: string;
  routePath: string;
  classification: 'tenant-scoped' | 'admin-only' | 'high-risk';
  requiredTokens: string[];
};

const apiInventoryPath = 'docs/security/API_ROUTE_INVENTORY.md';

const criticalApiContracts: ApiRouteContract[] = [
  {
    area: 'billing checkout',
    routePath: 'src/app/api/billing/checkout/route.ts',
    classification: 'high-risk',
    requiredTokens: [
      'requireApiUser',
      'requirePermission',
      "permission: 'manage_billing'",
      'requireTrustedMutation',
      'readBoundedJsonRequest',
      'checkoutBodySchema',
      'requireStepUpForRequest',
      'writeAuditLog',
      'secureApiError',
      'noStoreJson',
    ],
  },
  {
    area: 'AI systems inventory',
    routePath: 'src/app/api/ai-systems/route.ts',
    classification: 'tenant-scoped',
    requiredTokens: [
      'requireApiUser',
      'getCurrentOrganizationForUser',
      'assertOrganizationPermission',
      "permission: 'read_ai_governance'",
      "permission: 'manage_ai_governance'",
      'assertTrustedOrigin',
      'checkDistributedRateLimit',
      'parseJsonBodyWithZod',
      'createAuditEvent',
      'secureApiError',
      'noStoreJson',
    ],
  },
  {
    area: 'AI incidents',
    routePath: 'src/app/api/ai-incidents/route.ts',
    classification: 'tenant-scoped',
    requiredTokens: [
      'requireApiUser',
      'getCurrentOrganizationForUser',
      'assertOrganizationPermission',
      "permission: 'read_ai_incidents'",
      "permission: 'manage_ai_incidents'",
      'assertTrustedOrigin',
      'checkDistributedRateLimit',
      'parseJsonBodyWithZod',
      'createAuditEvent',
      'secureApiError',
      'noStoreJson',
    ],
  },
  {
    area: 'document upload',
    routePath: 'src/app/api/documents/upload/route.ts',
    classification: 'high-risk',
    requiredTokens: [
      'getCurrentUser',
      'getCurrentOrganizationForUser',
      'assertOrganizationPermission',
      "permission: 'manage_documents'",
      'assertTrustedOrigin',
      'checkDistributedRateLimit',
      'validateUploadSecurityFile',
      'scanValidatedUploadForMalware',
      'CONTROLLED_DOCUMENT_STORAGE_BUCKET',
      'buildTenantScopedUploadPath',
      'createAuditEvent',
      'noStoreJson',
    ],
  },
  {
    area: 'document approval',
    routePath: 'src/app/api/documents/[id]/approval/route.ts',
    classification: 'high-risk',
    requiredTokens: [
      'requireApiUser',
      'requirePermission',
      "permission: 'manage_documents'",
      'requireTrustedMutation',
      'parseJsonBodyWithZod',
      'assertApiResourceOrganization',
      ".eq('organization_id', organization.id)",
      'createAuditEvent',
      'secureApiError',
      'noStoreJson',
    ],
  },
  {
    area: 'team role mutation',
    routePath: 'src/app/api/team/members/role/route.ts',
    classification: 'admin-only',
    requiredTokens: [
      'requireApiUser',
      'requirePermission',
      "permission: 'manage_team'",
      'requireTrustedMutation',
      'requireStepUpForRequest',
      ".eq('organization_id', organization.id)",
      'team_member_role_changed',
      'secureApiError',
      'noStoreJson',
    ],
  },
];

function readRepoFile(filePath: string) {
  return readFileSync(join(process.cwd(), filePath), 'utf8');
}

describe('enterprise API security contracts', () => {
  it('keeps every critical SaaS API route registered with an enterprise security classification', () => {
    const inventory = readRepoFile(apiInventoryPath);

    for (const contract of criticalApiContracts) {
      expect(existsSync(join(process.cwd(), contract.routePath)), `${contract.area} route should exist`).toBe(true);
      expect(
        inventory,
        `${contract.area} should be listed in the API inventory with class ${contract.classification}`,
      ).toContain(`| \`${contract.routePath}\` | ${contract.classification} |`);
    }
  });

  it('keeps auth, tenant, RBAC, validation, audit and no-store controls on critical routes', () => {
    const missing: string[] = [];

    for (const contract of criticalApiContracts) {
      const source = readRepoFile(contract.routePath);

      for (const token of contract.requiredTokens) {
        if (!source.includes(token)) {
          missing.push(`${contract.area}: ${token}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('requires trusted-origin protection on every critical mutating route', () => {
    const missing: string[] = [];

    for (const contract of criticalApiContracts) {
      const source = readRepoFile(contract.routePath);
      const hasPostHandler = /export\s+async\s+function\s+POST\s*\(/.test(source);
      const hasTrustedMutationGuard = source.includes('assertTrustedOrigin') || source.includes('requireTrustedMutation');

      if (hasPostHandler && !hasTrustedMutationGuard) {
        missing.push(contract.area);
      }
    }

    expect(missing).toEqual([]);
  });

  it('documents negative API security cases required for release coverage', () => {
    const inventory = readRepoFile(apiInventoryPath);

    for (const requiredScenario of [
      'unauthenticated requests return 401',
      'missing membership returns 403',
      'viewer attempting admin mutation returns 403',
      'tenant A attempting tenant B resource access returns 403/404',
      'invalid origin returns 403',
      'invalid body returns 400',
      'internal errors return sanitized responses without stack traces',
    ]) {
      expect(inventory, `API inventory should keep required negative scenario: ${requiredScenario}`).toContain(requiredScenario);
    }
  });
});
