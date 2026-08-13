import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationPath = 'supabase/migrations/20260812230229_optimize_ai_incidents_rls_and_deduplicate_ai_systems_index.sql';
const sql = fs.readFileSync(path.join(root, migrationPath), 'utf8');

describe('AI incidents RLS and performance hardening', () => {
  it('removes legacy public policies and recreates authenticated membership policies', () => {
    expect(sql).toContain('drop policy if exists "Organization members can insert ai incidents"');
    expect(sql).toContain('drop policy if exists "Organization members can read ai incidents"');
    expect(sql).toContain('drop policy if exists "Organization members can update ai incidents"');

    expect(sql).toContain('create policy rls_ai_incidents_select_member');
    expect(sql).toContain('create policy rls_ai_incidents_insert_member');
    expect(sql).toContain('create policy rls_ai_incidents_update_member');
    expect(sql.match(/to authenticated/g)?.length).toBeGreaterThanOrEqual(4);
    expect(sql.match(/app_private\.is_org_member\(organization_id\)/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('removes anonymous/admin-like table grants while preserving intended incident DML', () => {
    expect(sql).toContain('revoke all on table public.ai_incidents from PUBLIC, anon, authenticated');
    expect(sql).toContain('grant select, insert, update on table public.ai_incidents to authenticated');
    expect(sql).not.toContain('grant delete on table public.ai_incidents to authenticated');
    expect(sql).not.toContain('grant select, insert, update, delete on table public.ai_incidents to authenticated');
    expect(sql).toContain("privilege_type in ('SELECT','INSERT','UPDATE')");
    expect(sql).toContain("raise exception 'unexpected ai_incidents client grants survived: %'");
  });

  it('evaluates regulatory auth identity once per statement', () => {
    expect(sql).toContain('drop policy if exists rls_regulatory_updates_select_authenticated');
    expect(sql).toContain('create policy rls_regulatory_updates_select_authenticated');
    expect(sql).toContain('using ((select auth.uid()) is not null)');
  });

  it('removes the duplicate AI systems created-at index and verifies only one remains', () => {
    expect(sql).toContain('drop index if exists public.ai_systems_org_created_idx');
    expect(sql).toContain("indexname in ('ai_systems_org_created_at_idx','ai_systems_org_created_idx')");
    expect(sql).toContain('if duplicate_indexes <> 1 then');
    expect(sql).toContain("raise exception 'ai_systems created-at duplicate index reconciliation failed: %'");
  });

  it('keeps RLS enforced during the reconciliation', () => {
    expect(sql).toContain('alter table public.ai_incidents enable row level security');
    expect(sql).toContain('alter table public.ai_incidents force row level security');
    expect(sql).toContain("roles = array['authenticated']::name[]");
  });
});
