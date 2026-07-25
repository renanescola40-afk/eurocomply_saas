import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const route = fs.readFileSync('src/app/api/ai-governance/qualified-reviews/route.ts', 'utf8');
const queries = fs.readFileSync('src/server/queries/qualified-review-api.ts', 'utf8');

describe('qualified review API contract', () => {
  it('requires authentication, organization permission, trusted origin, bounded JSON, distributed rate limit and no-store responses', () => {
    for (const required of ['requireApiUser', 'getCurrentOrganizationForUser', 'assertOrganizationPermission', 'assertTrustedOrigin', 'parseJsonBodyWithZod', 'checkDistributedRateLimit', 'noStoreJson']) {
      expect(route).toContain(required);
    }
  });

  it('implements the six operational workflows', () => {
    for (const workflow of ['campaign_create','reviewer_register','assignment_create','submission_create','assignment_transition','evidence_export']) {
      expect(route).toContain(workflow);
    }
  });

  it('keeps the eight human review families and canonical 51-point weights', () => {
    for (const token of ["'LEGAL-RULES': 4", "'PROHIBITED-PRACTICES': 7", "'ARTICLE-50': 8", 'FRIA: 6', 'DEPLOYER: 7', "'HIGH-RISK-PROVIDER': 9", 'CONFORMITY: 5', 'GPAI: 5']) {
      expect(route).toContain(token);
    }
  });

  it('uses organization-scoped storage operations and the backend-only transition RPC', () => {
    expect(queries).toContain("eq('organization_id', organizationId)");
    expect(queries).toContain("rpc('transition_qualified_review_assignment'");
    expect(queries).toContain('truthBoundary');
  });

  it('does not claim certification or regulator approval', () => {
    expect(queries).toContain('not certification, regulator approval or a legal guarantee');
  });
});
