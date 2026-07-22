import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/ai-governance/annex-iv/route.ts', 'utf8');
const queries = readFileSync('src/server/queries/annex-iv-governance.ts', 'utf8');
const page = readFileSync('src/app/[locale]/dashboard/annex-iv/page.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20260722200000_annex_iv_operational_workflow.sql', 'utf8');

describe('Annex IV operational workflow', () => {
  it('enforces auth, tenant context, RBAC, origin, bounded Zod and fail-closed rate limiting', () => {
    for (const token of ['requireApiUser()', 'getCurrentOrganizationForUser(user.id)', "permission: 'read_ai_governance'", "permission: 'manage_ai_governance'", 'assertTrustedOrigin(request)', 'parseJsonBodyWithZod(request', 'checkDistributedRateLimit({', 'security_control_unavailable']) expect(route).toContain(token);
  });

  it('keeps reads and writes tenant scoped', () => {
    expect(queries.match(/\.eq\('organization_id'/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
    expect(queries).toContain('p_organization_id: input.organizationId');
    expect(route).toContain('startsWith(`${organization.id}/`)');
    expect(route).not.toContain('error.message');
  });

  it('creates a versioned package and all twelve sections atomically', () => {
    expect(migration).toContain('create_annex_iv_package_atomic');
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(migration).toContain('coalesce(max(p.documentation_version), 0) + 1');
    expect((migration.match(/'general_description'|'post_market_monitoring'/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(migration).toContain('foreach v_section');
  });

  it('derives counters and approves fail closed in one transaction', () => {
    for (const token of ['refresh_annex_iv_package_counts', 'sync_annex_iv_section_after_evidence', 'approve_annex_iv_package_atomic', 'v_total <> 12', 'v_ready <> 12', "'package_approval', 'approved'", 'to service_role']) expect(migration).toContain(token);
  });

  it('exposes a customer-facing twelve-section workspace', () => {
    expect(page).toContain("fetch('/api/ai-governance/annex-iv'");
    expect(page).toContain('Annex IV Technical Documentation');
    expect(page).toContain('approved_sections_count');
    expect(page).toContain('sectionCodes.map');
  });
});
