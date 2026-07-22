import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/ai-governance/provider-data/route.ts', 'utf8');
const queries = readFileSync('src/server/queries/provider-data-governance.ts', 'utf8');
const page = readFileSync('src/app/[locale]/dashboard/provider-data/page.tsx', 'utf8');
const tower = readFileSync('src/server/ai-governance/regulatory-control-tower.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260722170000_provider_data_operational_workflow.sql', 'utf8');

const directOrganizationFilters = queries.match(/\.eq\('organization_id'/g)?.length ?? 0;
const tenantBoundRpcArguments = queries.match(/p_organization_id: input\.organizationId/g)?.length ?? 0;

describe('high-risk provider data operational workflow', () => {
  it('enforces authentication, tenant context, RBAC, origin, Zod and fail-closed rate limiting', () => {
    expect(route).toContain('requireApiUser()');
    expect(route).toContain('getCurrentOrganizationForUser(user.id)');
    expect(route).toContain("permission: 'read_ai_governance'");
    expect(route).toContain("permission: 'manage_ai_governance'");
    expect(route).toContain('assertTrustedOrigin(request)');
    expect(route).toContain('parseJsonBodyWithZod(request');
    expect(route).toContain('checkDistributedRateLimit({');
    expect(route).toContain('security_control_unavailable');
  });

  it('keeps all reads, direct writes and RPC transitions tenant-scoped', () => {
    expect(directOrganizationFilters).toBeGreaterThanOrEqual(7);
    expect(tenantBoundRpcArguments).toBeGreaterThanOrEqual(2);
    expect(route).toContain('listProviderDataSnapshot(organization.id)');
    expect(route).not.toContain('error.message');
  });

  it('creates versioned programmes under an advisory lock', () => {
    expect(migration).toContain('create_provider_data_program_atomic');
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(migration).toContain('coalesce(max(p.program_version), 0) + 1');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('to service_role');
  });

  it('derives programme counters from datasets and approves fail-closed', () => {
    expect(migration).toContain('refresh_provider_data_program_counts');
    expect(migration).toContain('sync_provider_program_after_dataset');
    expect(migration).toContain('approve_provider_data_program_atomic');
    expect(migration).toContain('approved_dataset_count <> v_current.dataset_count');
    expect(migration).toContain("'program_approved', 'approved'");
    expect(migration).toContain('uses_special_category_data');
  });

  it('exposes the workspace through the control tower', () => {
    expect(page).toContain("fetch('/api/ai-governance/provider-data'");
    expect(page).toContain('High-Risk Provider Data Governance');
    expect(tower).toContain("route: '/dashboard/provider-data'");
  });
});