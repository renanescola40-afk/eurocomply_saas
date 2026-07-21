import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260721160000_quality_management_system_governance.sql',
  ),
  'utf8',
);

const TABLES = [
  'ai_qms_systems',
  'ai_qms_controls',
  'ai_qms_nonconformities',
  'ai_qms_decisions',
] as const;

describe('quality management system migration contract', () => {
  it('creates the complete organization-scoped QMS domain', () => {
    for (const table of TABLES) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('prevents cross-organization child references', () => {
    expect(migration).toMatch(
      /foreign key \(organization_id, qms_system_id\)[\s\S]*references public\.ai_qms_systems\(organization_id, id\)/,
    );
    expect(migration).toContain('unique (organization_id, id)');
  });

  it('enforces owner reviewer and approver separation', () => {
    expect(migration).toContain('ai_qms_systems_actor_separation');
    expect(migration).toContain('reviewer_user_id <> owner_user_id');
    expect(migration).toContain('approver_user_id <> reviewer_user_id');
    expect(migration).toContain('ai_qms_nonconformities_verifier_separation');
  });

  it('requires clean corrective-action state before approval', () => {
    expect(migration).toContain('ai_qms_systems_approval_integrity');
    expect(migration).toContain('severe_nonconformities_count = 0');
    expect(migration).toContain('overdue_corrective_actions_count = 0');
    expect(migration).toContain('management_reviewed_at is not null');
  });

  it('requires verified root cause and corrective action before closure', () => {
    expect(migration).toContain('ai_qms_nonconformities_closure_integrity');
    expect(migration).toContain('char_length(btrim(root_cause)) >= 10');
    expect(migration).toContain('char_length(btrim(corrective_action)) >= 10');
    expect(migration).toContain('verified_by_user_id is not null');
  });

  it('binds every accountable actor to the same organization', () => {
    expect(migration).toContain('ai_qms_actor_is_member');
    expect(migration).toContain('enforce_ai_qms_system_actor_scope');
    expect(migration).toContain('enforce_ai_qms_control_actor_scope');
    expect(migration).toContain('enforce_ai_qms_nonconformity_actor_scope');
    expect(migration).toContain('enforce_ai_qms_decision_actor_scope');
  });

  it('keeps material QMS decisions append-only', () => {
    expect(migration).toContain('prevent_ai_qms_decision_mutation');
    expect(migration).toContain('QMS decisions are append-only');
    expect(migration).toMatch(
      /before update or delete on public\.ai_qms_decisions/,
    );
    expect(migration).toContain(
      'grant select, insert on public.ai_qms_decisions to service_role',
    );
  });

  it('keeps authenticated writes behind the server API boundary', () => {
    for (const table of TABLES) {
      expect(migration).toContain(
        `revoke all on public.${table} from anon, authenticated`,
      );
      expect(migration).toContain(`grant select on public.${table} to authenticated`);
    }
  });

  it('requires SHA-256-shaped evidence digests', () => {
    expect(migration.match(/\^\[a-f0-9\]\{64\}\$/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
