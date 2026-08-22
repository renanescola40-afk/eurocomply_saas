import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260822123622_v19_reconcile_gap_remediation_persistence.sql';
const migration = readFileSync(migrationPath, 'utf8');
const replay = readFileSync('scripts/recovery/run-ephemeral-project-schema-replay.mjs', 'utf8');

const legacy20260605 = [
  '20260605_compliance_evidence.sql',
  '20260605_evidence_vault.sql',
  '20260605_findings_tasks.sql',
  '20260605_gap_analysis.sql',
  '20260605_gap_analysis_user_scoped_patch.sql',
] as const;

const requiredTables = [
  'gap_assessments',
  'gap_answers',
  'compliance_findings',
  'evidence_items',
  'compliance_evidence',
] as const;

const requiredTaskColumns = [
  'workspace_id',
  'finding_id',
  'user_id',
  'owner_id',
  'completed_at',
  'metadata',
] as const;

describe('gap/remediation forward reconciliation', () => {
  it('preserves the duplicate historical 20260605 lineage outside canonical replay', () => {
    for (const file of legacy20260605) {
      expect(replay).toContain(`'${file}'`);
    }
    expect(replay).toContain("const UNAPPLIED_LEGACY_VERSION = '20260605'");
    expect(migration).toContain('historical 20260605 duplicate-version files are preserved byte-for-byte');
    expect(migration).not.toContain('supabase_migrations.schema_migrations');
    expect(migration).not.toContain('migration repair');
    expect(migration.trimStart()).toMatch(/^begin;/i);
  });

  it('materializes the runtime tables that are absent when the legacy group is excluded', () => {
    for (const table of requiredTables) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
      expect(migration).toContain(`alter table public.${table} force row level security;`);
    }
  });

  it('extends the canonical organization task table without replacing its organization scope', () => {
    expect(migration).toContain("if to_regclass('public.compliance_tasks') is null then");
    expect(migration).toContain('alter column organization_id drop not null');
    expect(migration).toContain('alter table public.compliance_tasks');
    for (const column of requiredTaskColumns) {
      expect(migration).toContain(`add column if not exists ${column}`);
    }
    expect(migration).toContain('check (organization_id is not null or user_id is not null) not valid');
    expect(migration).toContain('validate constraint compliance_tasks_requires_tenant_scope');
    expect(migration).toContain('organization_id is null and user_id = auth.uid()');
    expect(migration).not.toContain('drop policy if exists "rls_compliance_tasks_select_member"');
    expect(migration).not.toContain('drop policy if exists "rls_compliance_tasks_insert_writer"');
    expect(migration).not.toContain('drop policy if exists "rls_compliance_tasks_update_writer"');
    expect(migration).not.toContain('drop policy if exists "rls_compliance_tasks_delete_admin"');
  });

  it('does not recreate the removed workspaces foreign-key dependency', () => {
    expect(migration).not.toMatch(/references\s+public\.workspaces/i);
    expect(migration).toContain("raise exception 'legacy workspace_id foreign key was recreated unexpectedly'");
  });

  it('binds child writes to the authenticated owner rather than accepting arbitrary cross-user links', () => {
    expect(migration).toContain('ga.user_id = auth.uid()');
    expect(migration).toContain('cf.user_id = auth.uid()');
    expect(migration).toContain('ct.user_id = auth.uid()');
    expect(migration).toContain('app_private.is_org_member(ct.organization_id)');
    expect(migration).toContain('where cf.id = compliance_evidence.finding_id and cf.user_id = auth.uid()');
    expect(migration).toContain('where ct.id = compliance_evidence.task_id');
    expect(migration).not.toContain('using (true)');
    expect(migration).not.toContain('with check (true)');
  });

  it('forces the compliance evidence bucket private and owner-prefix scoped', () => {
    expect(migration).toContain("values ('compliance-evidence', 'compliance-evidence', false)");
    expect(migration).toContain('on conflict (id) do update set public = false');
    expect(migration).toContain("bucket_id = 'compliance-evidence'");
    expect(migration).toContain("auth.uid()::text = (storage.foldername(name))[1]");
  });

  it('fails closed when required schema or RLS/FORCE RLS posture is missing', () => {
    expect(migration).toContain('do $reconciliation_guard$');
    expect(migration).toContain('c.relrowsecurity');
    expect(migration).toContain('c.relforcerowsecurity');
    expect(migration).toContain("raise exception 'required RLS/FORCE RLS posture is missing on public.%'");
    expect(migration).toContain("raise exception 'private compliance-evidence storage bucket is missing'");
    expect(migration.trimEnd()).toMatch(/commit;$/);
  });
});