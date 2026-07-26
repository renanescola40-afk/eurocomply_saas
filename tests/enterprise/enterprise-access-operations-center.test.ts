import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260724200000_enterprise_access_operations_center.sql',
  'utf8',
);
const service = readFileSync('src/server/enterprise/access-operations-center.ts', 'utf8');
const collectionRoute = readFileSync('src/app/api/team/access-operations/route.ts', 'utf8');
const itemRoute = readFileSync('src/app/api/team/access-operations/[jobId]/route.ts', 'utf8');
const exportRoute = readFileSync('src/app/api/team/access-operations/[jobId]/export/route.ts', 'utf8');
const csvHelper = readFileSync('src/lib/exports/csv.ts', 'utf8');
const workerRoute = readFileSync('src/app/api/internal/enterprise-access-operations/route.ts', 'utf8');

describe('enterprise access operations center', () => {
  it('uses durable tenant-scoped operations, items, events and forced RLS', () => {
    expect(migration).toContain('enterprise_access_operations');
    expect(migration).toContain('enterprise_access_operation_items');
    expect(migration).toContain('enterprise_access_operation_events');
    expect(migration.match(/force row level security/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain('organization_id uuid not null references public.organizations(id)');
    expect(migration).toContain('revoke all on public.enterprise_access_operations from public, anon, authenticated');
  });

  it('supports leased work, retry, dead letter, pause, resume and cancellation', () => {
    expect(migration).toContain('for update skip locked');
    expect(migration).toContain("status in ('pending','processing','paused','retry','completed','cancelled','dead_letter')");
    expect(migration).toContain("p_action not in ('pause','resume','cancel','retry_failed')");
    expect(migration).toContain("status = 'cancelled'");
    expect(migration).toContain("status = 'paused'");
    expect(migration).toContain("status = 'pending'");
  });

  it('records member-level before and after evidence with stable idempotency', () => {
    expect(migration).toContain('before_snapshot jsonb');
    expect(migration).toContain('after_snapshot jsonb');
    expect(migration).toContain("encode(digest(");
    expect(service).toContain('idempotencyKey: item.idempotency_key');
    expect(service).toContain("status: 'compensated'");
    expect(service).toContain('metadata_persistence_failed');
  });

  it('keeps mutations behind permission, trusted mutation, step-up and bounded JSON', () => {
    expect(collectionRoute).toContain("permission: 'manage_team'");
    expect(collectionRoute).toContain('requireTrustedMutation');
    expect(collectionRoute).toContain('requireStepUpForRequest');
    expect(collectionRoute).toContain('readBoundedJsonRequest');
    expect(collectionRoute).not.toContain('request.json()');
    expect(itemRoute).toContain('requireTrustedMutation');
    expect(itemRoute).toContain('requireStepUpForRequest');
    expect(itemRoute).not.toContain('request.json()');
  });

  it('provides tenant-scoped member exports through the hardened CSV helper', () => {
    expect(migration).toContain('export_enterprise_access_operation_members');
    expect(migration).toContain('i.organization_id = p_organization_id');
    expect(exportRoute).toContain('csvDownloadResponse');
    expect(exportRoute).toContain('requirePermission');
    expect(csvHelper).toContain("'Cache-Control': 'no-store, max-age=0'");
    expect(csvHelper).toContain("'X-Content-Type-Options': 'nosniff'");
    expect(csvHelper).toContain('neutralizeCsvFormula');
    expect(csvHelper).toContain('sanitizeCsvFilename');
  });

  it('protects the internal worker with cron authorization and fail-closed authentication limiting', () => {
    expect(workerRoute).toContain('enforceInternalAuthenticationRateLimit');
    expect(workerRoute).toContain('isAuthorizedInternalCronRequest');
    expect(workerRoute).toContain('ENTERPRISE_RECONCILIATION_ACTOR_USER_ID');
    expect(workerRoute).toContain('noStoreJson');
  });

  it('bounds operational scale to ten thousand seeded identities and 500 per worker lease', () => {
    expect(migration).toContain('least(greatest(coalesce(p_limit, 10000), 1), 10000)');
    expect(migration).toContain('batch_size integer not null default 100 check (batch_size between 1 and 500)');
    expect(service).toContain('index < operation.batch_size');
  });
});
