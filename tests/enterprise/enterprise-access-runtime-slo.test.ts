import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260726150000_enterprise_access_runtime_slo.sql',
  'utf8',
);
const service = readFileSync('src/server/enterprise/access-runtime-slo.ts', 'utf8');
const adminRoute = readFileSync('src/app/api/team/access-runtime/route.ts', 'utf8');
const internalRoute = readFileSync('src/app/api/internal/enterprise-access-runtime/route.ts', 'utf8');

describe('enterprise access runtime SLO megapack', () => {
  it('stores tenant-scoped snapshots, alerts and export jobs behind forced RLS', () => {
    expect(migration).toContain('enterprise_access_runtime_snapshots');
    expect(migration).toContain('enterprise_access_runtime_alerts');
    expect(migration).toContain('enterprise_access_export_jobs');
    expect(migration.match(/force row level security/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain('revoke all on public.enterprise_access_runtime_snapshots from public, anon, authenticated');
    expect(migration).toContain('enterprise_access_runtime_alerts_deny_delete');
  });

  it('captures success rate, latency, queue lag, dead letters and compensation evidence', () => {
    expect(migration).toContain('success_rate numeric');
    expect(migration).toContain('p95_duration_ms');
    expect(migration).toContain('oldest_pending_seconds');
    expect(migration).toContain('operations_dead_letter');
    expect(migration).toContain('members_compensated');
    expect(migration).toContain('percentile_cont(0.95)');
  });

  it('raises deterministic warnings and critical alerts', () => {
    expect(migration).toContain("'dead-letter:'");
    expect(migration).toContain("'queue-lag:'");
    expect(migration).toContain("'success-rate:'");
    expect(migration).toContain("success_rate < 0.95");
    expect(migration).toContain("oldest_pending_seconds >= 900");
  });

  it('uses leased skip-locked claims for large asynchronous exports', () => {
    expect(migration).toContain('for update skip locked');
    expect(migration).toContain("now() + interval '15 minutes'");
    expect(migration).toContain("format in ('csv','jsonl')");
    expect(migration).toContain("p_sha256 !~ '^[a-f0-9]{64}$'");
    expect(migration).toContain("expires_at = now() + interval '24 hours'");
  });

  it('keeps deep pagination tenant scoped and bounded', () => {
    expect(service).toContain(".eq('organization_id', id)");
    expect(service).toContain(".lt('created_at', cursor)");
    expect(service).toContain('Math.min(Math.max(limit, 1), 100)');
    expect(service).toContain('nextCursor');
  });

  it('protects administrative actions with auth, RBAC, trusted mutation and step-up', () => {
    expect(adminRoute).toContain('requireApiUser');
    expect(adminRoute).toContain("permission: 'manage_team'");
    expect(adminRoute).toContain('requireTrustedMutation');
    expect(adminRoute).toContain("failureMode: 'fail-closed'");
    expect(adminRoute).toContain('requireStepUpForRequest');
    expect(adminRoute).toContain('readBoundedJsonRequest');
    expect(adminRoute).not.toContain('request.json()');
  });

  it('protects runtime scheduling with internal auth and sanitized failures', () => {
    expect(internalRoute).toContain('enforceInternalAuthenticationRateLimit');
    expect(internalRoute).toContain('isAuthorizedInternalCronRequest');
    expect(internalRoute).toContain('readBoundedJsonRequest');
    expect(internalRoute).toContain('reportError');
    expect(internalRoute).toContain('noStoreJson');
  });
});
