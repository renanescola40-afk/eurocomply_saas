import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/ai-governance/regulatory-control-tower/route.ts', 'utf8');
const query = readFileSync('src/server/queries/regulatory-control-tower.ts', 'utf8');
const page = readFileSync('src/app/[locale]/dashboard/regulatory-control-tower/page.tsx', 'utf8');
const sidebar = readFileSync('src/components/dashboard/dashboard-workspace-sidebar.tsx', 'utf8');

describe('regulatory control tower API contract', () => {
  it('requires authentication, organization context and AI governance read permission', () => {
    expect(route).toContain('requireApiUser()');
    expect(route).toContain('getCurrentOrganizationForUser(user.id)');
    expect(route).toContain("permission: 'read_ai_governance'");
    expect(route).toContain('permissionDeniedResponse(permission)');
  });

  it('uses distributed rate limiting, no-store responses and safe errors', () => {
    expect(route).toContain('checkDistributedRateLimit({');
    expect(route).toContain('regulatory-control-tower:read:${organization.id}:${user.id}');
    expect(route).toContain('noStoreJson(');
    expect(route).toContain('secureApiError(error)');
    expect(route).not.toContain('error.message');
  });

  it('queries every integrated workflow with an organization filter', () => {
    const tables = [
      'ai_literacy_programs',
      'ai_fria_assessments',
      'ai_prohibited_practice_reviews',
      'ai_provider_data_programs',
      'ai_annex_iv_packages',
      'ai_qms_systems',
      'ai_article50_assessments',
      'ai_conformity_assessments',
    ];

    for (const table of tables) expect(query).toContain(`.from('${table}')`);
    expect(query.match(/\.eq\('organization_id', organizationId\)/g)).toHaveLength(tables.length);
    expect(query).toContain("throw new Error('regulatory_control_tower_storage_unavailable')");
  });

  it('exposes a customer-facing no-store dashboard and navigation entry', () => {
    expect(page).toContain("fetch('/api/ai-governance/regulatory-control-tower'");
    expect(page).toContain("cache: 'no-store'");
    expect(page).toContain('Regulatory Control Tower');
    expect(page).toContain('not certification');
    expect(sidebar).toContain("href: `${basePath}/regulatory-control-tower`");
    expect(sidebar).toContain("label: 'Regulatory Control Tower'");
  });
});
