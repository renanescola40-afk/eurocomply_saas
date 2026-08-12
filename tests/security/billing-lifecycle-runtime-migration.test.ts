import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260812221912_reconcile_billing_lifecycle_requests_runtime.sql';
const legacyMigrationPath = 'supabase/migrations/20260728170000_billing_lifecycle_requests.sql';

describe('billing lifecycle runtime migration reconciliation', () => {
  const migration = readFileSync(migrationPath, 'utf8');

  it('mirrors the production ledger schema and keeps the historical split-review migration visible', () => {
    expect(migration).toContain('create table if not exists public.billing_lifecycle_requests');
    expect(migration).toContain('organization_id uuid not null references public.organizations(id) on delete cascade');
    expect(migration).toContain("action text not null check (action in ('upgrade','downgrade','cancel','reactivate','replace_add_ons'))");
    expect(migration).toContain("status text not null default 'pending' check (status in ('pending','processing','completed','failed','cancelled'))");
    expect(readFileSync(legacyMigrationPath, 'utf8')).toContain('create table if not exists public.billing_lifecycle_requests');
  });

  it('serializes active lifecycle mutations and indexes idempotency lookup', () => {
    expect(migration).toContain('create unique index if not exists billing_lifecycle_requests_one_processing_idx');
    expect(migration).toContain('on public.billing_lifecycle_requests (organization_id)');
    expect(migration).toContain("where status in ('pending','processing')");
    expect(migration).toContain('create index if not exists billing_lifecycle_requests_org_request_idx');
    expect(migration).toContain('on public.billing_lifecycle_requests (organization_id, stripe_request_id, requested_at desc)');
    expect(migration).toContain('where stripe_request_id is not null');
  });

  it('is browser-deny-all and service-role-only with RLS forced', () => {
    expect(migration).toContain('alter table public.billing_lifecycle_requests enable row level security');
    expect(migration).toContain('alter table public.billing_lifecycle_requests force row level security');
    expect(migration).toContain('revoke all on public.billing_lifecycle_requests from public, anon, authenticated');
    expect(migration).toContain('grant all on public.billing_lifecycle_requests to service_role');
    expect(migration).not.toMatch(/create\s+policy[\s\S]*billing_lifecycle_requests/i);
  });

  it('fails the migration if the live security boundary is not materialized', () => {
    expect(migration).toContain("raise exception 'billing lifecycle ledger RLS hardening verification failed'");
    expect(migration).toContain("raise exception 'billing lifecycle ledger client grants verification failed'");
    expect(migration).toContain("raise exception 'billing lifecycle ledger service role grants verification failed'");
    expect(migration).toContain("pg_catalog.has_table_privilege('anon', 'public.billing_lifecycle_requests', 'SELECT')");
    expect(migration).toContain("pg_catalog.has_table_privilege('authenticated', 'public.billing_lifecycle_requests', 'DELETE')");
    expect(migration).toContain("pg_catalog.has_table_privilege('service_role', 'public.billing_lifecycle_requests', 'SELECT,INSERT,UPDATE,DELETE')");
  });
});
