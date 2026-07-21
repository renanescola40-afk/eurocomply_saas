import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260721180000_annex_iv_technical_documentation_governance.sql',
  ),
  'utf8',
);

const TABLES = [
  'ai_annex_iv_packages',
  'ai_annex_iv_sections',
  'ai_annex_iv_evidence',
  'ai_annex_iv_changes',
  'ai_annex_iv_decisions',
] as const;

describe('Annex IV technical documentation migration contract', () => {
  it('creates the complete organization-scoped domain with forced RLS', () => {
    for (const table of TABLES) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('prevents cross-organization package, section and evidence references', () => {
    expect(migration).toContain('unique (organization_id, id)');
    expect(migration).toMatch(
      /foreign key \(organization_id, package_id\)[\s\S]*references public\.ai_annex_iv_packages\(organization_id, id\)/,
    );
    expect(migration).toMatch(
      /foreign key \(organization_id, section_id\)[\s\S]*references public\.ai_annex_iv_sections\(organization_id, id\)/,
    );
  });

  it('requires all twelve approved sections and clean severe-finding state', () => {
    expect(migration).toContain('ai_annex_iv_package_approval_integrity');
    expect(migration).toContain('approved_sections_count = 12');
    expect(migration).toContain('total_sections_count = 12');
    expect(migration).toContain('open_high_findings = 0');
    expect(migration).toContain('open_critical_findings = 0');
    expect(migration).toContain('package_digest is not null');
  });

  it('requires section evidence, independent review and change freshness', () => {
    expect(migration).toContain('ai_annex_iv_section_approval_integrity');
    expect(migration).toContain('evidence_count > 0');
    expect(migration).toContain('content_digest is not null');
    expect(migration).toContain('reviewer_user_id <> owner_user_id');
    expect(migration).toContain('reviewed_at >= last_material_change_at');
  });

  it('requires reviewed non-applicability decisions', () => {
    expect(migration).toContain('ai_annex_iv_package_non_applicability_integrity');
    expect(migration).toContain("applicability = 'not_required'");
    expect(migration).toContain('legal_reviewed_by_user_id is not null');
    expect(migration).toContain('legal_reviewed_at is not null');
  });

  it('binds every accountable actor to organization membership', () => {
    expect(migration).toContain('ai_annex_iv_actor_is_member');
    expect(migration).toContain('enforce_ai_annex_iv_package_actor_scope');
    expect(migration).toContain('enforce_ai_annex_iv_section_actor_scope');
    expect(migration).toContain('enforce_ai_annex_iv_evidence_actor_scope');
    expect(migration).toContain('enforce_ai_annex_iv_change_actor_scope');
    expect(migration).toContain('enforce_ai_annex_iv_decision_actor_scope');
  });

  it('keeps evidence, material changes and decisions append-only', () => {
    expect(migration).toContain('prevent_ai_annex_iv_history_mutation');
    expect(migration).toContain('Annex IV evidence, changes and decisions are append-only');
    expect(migration).toMatch(/before update or delete on public\.ai_annex_iv_evidence/);
    expect(migration).toMatch(/before update or delete on public\.ai_annex_iv_changes/);
    expect(migration).toMatch(/before update or delete on public\.ai_annex_iv_decisions/);
    expect(migration).toContain('grant select, insert on public.ai_annex_iv_evidence to service_role');
    expect(migration).toContain('grant select, insert on public.ai_annex_iv_changes to service_role');
    expect(migration).toContain('grant select, insert on public.ai_annex_iv_decisions to service_role');
  });

  it('keeps authenticated writes behind the privileged API boundary', () => {
    for (const table of TABLES) {
      expect(migration).toContain(`revoke all on public.${table} from anon, authenticated`);
      expect(migration).toContain(`grant select on public.${table} to authenticated`);
    }
  });

  it('uses idempotent policy recreation and SHA-256 integrity checks', () => {
    expect(migration.match(/drop policy if exists/g)?.length).toBeGreaterThanOrEqual(TABLES.length);
    expect(migration.match(/\^\[a-f0-9\]\{64\}\$/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
