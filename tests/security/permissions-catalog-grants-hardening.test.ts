import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const migrationPath = 'supabase/migrations/20260812224650_tighten_permissions_catalog_authenticated_grants.sql';
const reconciliationPath = 'supabase/reconciliation/20260726070000_permissions_catalog_rls_hotfix.sql';
const workflowPath = '.github/workflows/supabase-production-rls-reconciliation.yml';

describe('permissions catalog least-privilege hardening', () => {
  it('mirrors the live production grant-hardening migration', () => {
    const migration = read(migrationPath);

    expect(migration).toContain('revoke all on table public.permissions from anon, authenticated');
    expect(migration).toContain('revoke all on table public.role_permissions from anon, authenticated');
    expect(migration).toContain('revoke all on table public.stripe_webhook_events from anon, authenticated');
    expect(migration).toContain('grant select on table public.permissions to authenticated');
    expect(migration).toContain('grant select on table public.role_permissions to authenticated');
    expect(migration).toContain("has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')");
    expect(migration).toContain("raise exception 'authenticated write/admin privilege survived for public.%'");
    expect(migration).toContain("raise exception 'client privilege survived for public.stripe_webhook_events'");
  });

  it('keeps the manual reconciliation idempotent and least privilege', () => {
    const reconciliation = read(reconciliationPath);

    expect(reconciliation).toContain('force row level security');
    expect(reconciliation).toContain('revoke all on table public.permissions from PUBLIC, anon, authenticated');
    expect(reconciliation).toContain('revoke all on table public.role_permissions from PUBLIC, anon, authenticated');
    expect(reconciliation).toContain('revoke all on table public.stripe_webhook_events from PUBLIC, anon, authenticated');
    expect(reconciliation).toContain('grant select on table public.permissions to authenticated');
    expect(reconciliation).toContain('grant select on table public.role_permissions to authenticated');
    expect(reconciliation).toContain("raise exception 'authenticated write/admin privilege survived for public.%'");
  });

  it('requires complete effective privilege and exact migration-history evidence before closure PASS', () => {
    const workflow = read(workflowPath);
    const verifier = read('scripts/supabase/verify-rls-reconciliation-proof.mjs');

    expect(workflow).toContain("select 'grant|' || table_name || '|' || grantee || '|' || privilege_type");
    expect(workflow).toContain('from information_schema.table_privileges');
    expect(workflow).toContain("and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')");
    expect(workflow).toContain("where version in ('20260726070000', '20260812224650')");
    expect(verifier).toContain("'20260812224650|tighten_permissions_catalog_authenticated_grants'");
    expect(verifier).toContain('Unexpected client privilege');
    expect(verifier).toContain("'stripe_webhook_events|service_role|DELETE'");
  });
});
