import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260825171500_harden_active_membership_rls_authority.sql';
const migration = readFileSync(migrationPath, 'utf8');
const manifest = JSON.parse(readFileSync('config/supabase-forward-reconciliation.json', 'utf8')) as {
  changeSet: string;
  migrations: Array<{ filename: string }>;
  truthBoundary: Record<string, boolean>;
};
const evidenceStorage = readFileSync(
  'supabase/migrations/20260823131500_payment_first_gap_analysis_and_storage.sql',
  'utf8',
);

describe('active membership RLS authority', () => {
  it('requires active status in both canonical private membership helpers', () => {
    expect(migration).toContain('create or replace function app_private.is_org_member');
    expect(migration).toContain('create or replace function app_private.has_org_role');
    expect(migration.match(/lower\(coalesce\(om\.status, ''\)\) = 'active'/g)).toHaveLength(2);
    expect(migration).toContain('public.current_legacy_user_id()');
    expect(migration).toContain('public.current_clerk_user_id()');
    expect(migration).toContain('lower(om.role) = any(allowed_roles)');
  });

  it('closes every verified direct membership policy bypass in the same migration', () => {
    expect(migration).toContain('alter policy "organization members can read add-ons"');
    expect(migration).toContain('alter policy "Members can read organization document objects"');
    expect(migration).toContain('alter policy "Members can upload organization document objects"');
    expect(migration).toContain("lower(coalesce(members.status, '')) = 'active'");
    expect(migration.match(/lower\(coalesce\(status, ''\)\) = 'active'/g)).toHaveLength(2);
    expect(migration).toContain('direct membership RLS policies are not active-membership aware');
  });

  it('fails closed when legacy direct membership authority is not transitively gated by active organization_members RLS', () => {
    expect(migration).toContain("to_regprocedure('public.is_org_member(uuid)') is not null");
    expect(migration).toContain("to_regprocedure('public.has_org_role(uuid,text[])') is not null");
    expect(migration).toContain('membership_rls_enabled');
    expect(migration).toContain("policyname = 'rls_organization_members_select_member'");
    expect(migration).toContain("coalesce(public_membership_select_policy, '') not ilike '%is_org_member%'");
    expect(migration).toContain('legacy direct membership policies are not gated by active organization_members RLS');
    expect(migration).toContain("coalesce(add_on_policy, '') not ilike '%status%active%'");
    expect(migration).toContain("coalesce(document_read_policy, '') not ilike '%status%active%'");
    expect(migration).toContain("coalesce(document_upload_policy, '') not ilike '%status%active%'");
  });

  it('fails closed on missing status/helper/policy contracts and rechecks canonical status values', () => {
    expect(migration).toContain("raise exception 'organization_members.status is missing or nullable'");
    expect(migration).toContain("raise exception 'canonical private organization authorization helpers are missing'");
    expect(migration).toContain("raise exception 'organization add-ons membership policy is missing'");
    expect(migration).toContain("raise exception 'compliance-documents membership policies are missing'");
    expect(migration).toContain('organization_members_status_check');
    expect(migration).toContain("like '%active%'");
    expect(migration).toContain("like '%suspended%'");
    expect(migration).toContain("like '%deprovisioned%'");
    expect(migration).toContain("raise exception 'canonical private RLS helpers are not active-membership aware'");
  });

  it('preserves policy execution privileges without exposing helpers to anon', () => {
    expect(migration).toContain('revoke all on function app_private.is_org_member(uuid) from public, anon;');
    expect(migration).toContain('revoke all on function app_private.has_org_role(uuid, text[]) from public, anon;');
    expect(migration).toContain('grant execute on function app_private.is_org_member(uuid) to authenticated, service_role;');
    expect(migration).toContain('grant execute on function app_private.has_org_role(uuid, text[]) to authenticated, service_role;');
  });

  it('closes Evidence Vault Storage through the same canonical helpers', () => {
    expect(evidenceStorage).toContain('app_private.is_org_member(e.organization_id)');
    expect(evidenceStorage).toContain("app_private.has_org_role(e.organization_id, array['owner','admin','member']::text[])");
  });

  it('appends exactly one governed identity after V22 without authorizing Production writes', () => {
    expect(manifest.changeSet).toBe('2026-08-25-enterprise-data-plane-active-membership-rls-closure-v23');
    expect(manifest.migrations).toHaveLength(33);
    expect(manifest.migrations.at(-2)?.filename).toBe('20260825092500_atomic_document_commercial_quota.sql');
    expect(manifest.migrations.at(-1)?.filename).toBe('20260825171500_harden_active_membership_rls_authority.sql');
    expect(manifest.truthBoundary.productionWriteAuthorizedByConfig).toBe(false);
    expect(manifest.truthBoundary.migrationHistoryRepairAllowed).toBe(false);
    expect(manifest.truthBoundary.unrestrictedDbPushAllowed).toBe(false);
  });
});