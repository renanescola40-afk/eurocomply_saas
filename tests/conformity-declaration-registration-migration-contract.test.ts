import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260721170000_conformity_declaration_registration_governance.sql',
  ),
  'utf8',
);

const TABLES = [
  'ai_conformity_assessments',
  'ai_conformity_evidence',
  'ai_eu_declarations',
  'ai_eu_registrations',
  'ai_conformity_decisions',
] as const;

describe('conformity declaration registration migration contract', () => {
  it('creates the complete organization-scoped domain', () => {
    for (const table of TABLES) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('prevents cross-organization child references', () => {
    expect(migration).toContain('unique (organization_id, id)');
    expect(migration.match(/foreign key \(organization_id, assessment_id\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration.match(/references public\.ai_conformity_assessments\(organization_id, id\)/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('enforces independent assessment and evidence review', () => {
    expect(migration).toContain('ai_conformity_assessment_actor_separation');
    expect(migration).toContain('reviewer_user_id <> owner_user_id');
    expect(migration).toContain('approver_user_id <> reviewer_user_id');
    expect(migration).toContain('ai_conformity_evidence_actor_separation');
  });

  it('fails closed before market approval', () => {
    expect(migration).toContain('ai_conformity_assessment_approval_integrity');
    expect(migration).toContain("applicability <> 'uncertain'");
    expect(migration).toContain("conformity_route <> 'uncertain'");
    expect(migration).toContain('declaration_signed');
    expect(migration).toContain('ce_marking_control_complete');
    expect(migration).toContain('open_severe_nonconformities = 0');
    expect(migration).toContain('expired_certificates = 0');
    expect(migration).toContain('(not eu_registration_required or eu_registration_complete)');
  });

  it('requires integrity-backed signed declarations', () => {
    expect(migration).toContain('ai_eu_declaration_signature_integrity');
    expect(migration).toContain('signed_by_user_id is not null');
    expect(migration).toContain('signed_at is not null');
    expect(migration).toContain('declaration_digest is not null');
    expect(migration).toContain('cardinality(legislation_references) > 0');
  });

  it('requires complete submitted and registered records', () => {
    expect(migration).toContain('ai_eu_registration_submission_integrity');
    expect(migration).toContain('dataset_complete');
    expect(migration).toContain('dataset_digest is not null');
    expect(migration).toContain('ai_eu_registration_registered_integrity');
    expect(migration).toContain('registration_identifier is not null');
    expect(migration).toContain('registered_at is not null');
  });

  it('binds accountable actors to the same organization', () => {
    expect(migration).toContain('ai_conformity_actor_is_member');
    expect(migration).toContain('enforce_ai_conformity_assessment_actor_scope');
    expect(migration).toContain('enforce_ai_conformity_evidence_actor_scope');
    expect(migration).toContain('enforce_ai_eu_declaration_actor_scope');
    expect(migration).toContain('enforce_ai_eu_registration_actor_scope');
    expect(migration).toContain('enforce_ai_conformity_decision_actor_scope');
  });

  it('keeps material decisions append-only', () => {
    expect(migration).toContain('prevent_ai_conformity_decision_mutation');
    expect(migration).toContain('Conformity decisions are append-only');
    expect(migration).toContain('before update or delete on public.ai_conformity_decisions');
    expect(migration).toContain('grant select, insert on public.ai_conformity_decisions to service_role');
  });

  it('keeps authenticated mutations behind server APIs', () => {
    for (const table of TABLES) {
      expect(migration).toContain(`revoke all on public.${table} from anon, authenticated`);
      expect(migration).toContain(`grant select on public.${table} to authenticated`);
    }
  });

  it('requires SHA-256-shaped integrity digests', () => {
    expect(migration.match(/\^\[a-f0-9\]\{64\}\$/g)?.length).toBeGreaterThanOrEqual(4);
  });
});
