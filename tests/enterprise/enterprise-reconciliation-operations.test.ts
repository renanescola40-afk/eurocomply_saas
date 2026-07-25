import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260724113000_enterprise_reconciliation_operations.sql', 'utf8');
const service = readFileSync('src/server/enterprise/group-access-reconciliation-operations.ts', 'utf8');
const drain = readFileSync('src/app/api/internal/enterprise-group-access-reconciliation/drain/route.ts', 'utf8');
const status = readFileSync('src/app/api/internal/enterprise-group-access-reconciliation/status/route.ts', 'utf8');
const replay = readFileSync('src/app/api/internal/enterprise-group-access-reconciliation/replay/route.ts', 'utf8');
const prune = readFileSync('src/app/api/internal/enterprise-group-access-reconciliation/prune/route.ts', 'utf8');

describe('enterprise reconciliation operations', () => {
  it('provides bounded queue draining and a trusted server actor', () => {
    expect(service).toContain('ENTERPRISE_RECONCILIATION_ACTOR_USER_ID');
    expect(service).toContain('Math.min(Math.max(limit, 1), 100)');
    expect(service).not.toContain('actorUserId: input');
  });

  it('exposes service-role-only status, replay and retention RPCs', () => {
    expect(migration).toContain('enterprise_group_access_reconciliation_status');
    expect(migration).toContain('replay_enterprise_group_access_dead_letter_job');
    expect(migration).toContain('prune_enterprise_group_access_reconciliation_jobs');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('to service_role');
  });

  it('keeps dead-letter replay tenant scoped and fail closed', () => {
    expect(migration).toContain('and organization_id = p_organization_id');
    expect(migration).toContain("and status = 'dead_letter'");
    expect(migration).toContain("return 'not_found'");
  });

  it('protects every operational endpoint', () => {
    for (const route of [drain, status, replay, prune]) {
      expect(route).toContain('enforceInternalAuthenticationRateLimit');
      expect(route).toContain('isAuthorizedInternalCronRequest(request)');
      expect(route).toContain('noStoreJson');
    }
  });

  it('bounds replay payload and retention policy', () => {
    expect(replay).toContain('maxBytes: 4096');
    expect(prune).toContain('min(7).max(365)');
    expect(migration).toContain('least(greatest(coalesce(p_retention_days, 30), 7), 365)');
  });
});
