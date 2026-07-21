import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260721190000_high_risk_provider_data_governance.sql',
  ),
  'utf8',
);

const TABLES = [
  'ai_provider_data_programs',
  'ai_provider_datasets',
  'ai_provider_dataset_assessments',
  'ai_provider_dataset_mitigations',
  'ai_provider_dataset_evidence',
  'ai_provider_data_decisions',
] as const;

describe('high-risk provider data governance migration contract', () => {
  it('creates the complete organization-scoped data governance domain', () => {
    for (const table of TABLES) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(migration).toContain(
        `alter table public.${table} force row level security`,
      );
    }
  });

  it('binds datasets, assessments, mitigations and evidence to one organization and program', () => {
    expect(migration).toContain('unique (organization_id, program_id, id)');
    expect(migration).toMatch(
      /foreign key \(organization_id, program_id, dataset_id\)[\s\S]*references public\.ai_provider_datasets\(organization_id, program_id, id\)/,
    );
    expect(migration).toMatch(
      /foreign key \(organization_id, program_id, dataset_id, assessment_id\)[\s\S]*references public\.ai_provider_dataset_assessments/,
    );
  });

  it('enforces independent review and approval roles', () => {
    expect(migration).toContain('ai_provider_data_program_actor_separation');
    expect(migration).toContain('reviewer_user_id <> owner_user_id');
    expect(migration).toContain('approver_user_id <> reviewer_user_id');
    expect(migration).toContain('ai_provider_dataset_reviewer_separation');
    expect(migration).toContain(
      'ai_provider_dataset_assessment_reviewer_separation',
    );
    expect(migration).toContain(
      'ai_provider_dataset_mitigation_verifier_separation',
    );
  });

  it('blocks program approval until every dataset and severe finding is resolved', () => {
    expect(migration).toContain('ai_provider_data_program_approval_integrity');
    expect(migration).toContain('approved_dataset_count = dataset_count');
    expect(migration).toContain('open_high_findings = 0');
    expect(migration).toContain('open_critical_findings = 0');
    expect(migration).toContain('program_digest is not null');
  });

  it('blocks dataset approval without provenance, schema, assessments and evidence', () => {
    expect(migration).toContain('ai_provider_dataset_approval_integrity');
    expect(migration).toContain('provenance_digest is not null');
    expect(migration).toContain('schema_digest is not null');
    expect(migration).toContain(
      'approved_assessment_count = required_assessment_count',
    );
    expect(migration).toContain('evidence_count > 0');
  });

  it('requires evidence-backed independent assessment approval', () => {
    expect(migration).toContain(
      'ai_provider_dataset_assessment_approval_integrity',
    );
    expect(migration).toContain("residual_risk <> 'unknown'");
    expect(migration).toContain('reviewer_user_id is not null');
    expect(migration).toContain('evidence_digest is not null');
  });

  it('requires verified effectiveness for completed mitigations', () => {
    expect(migration).toContain(
      'ai_provider_dataset_mitigation_effectiveness_integrity',
    );
    expect(migration).toContain('verified_by_user_id is not null');
    expect(migration).toContain('verified_at is not null');
  });

  it('binds every accountable actor to organization membership', () => {
    expect(migration).toContain('ai_provider_data_actor_is_member');
    expect(migration).toContain(
      'enforce_ai_provider_data_program_actor_scope',
    );
    expect(migration).toContain('enforce_ai_provider_dataset_actor_scope');
    expect(migration).toContain(
      'enforce_ai_provider_dataset_assessment_actor_scope',
    );
    expect(migration).toContain(
      'enforce_ai_provider_dataset_mitigation_actor_scope',
    );
    expect(migration).toContain(
      'enforce_ai_provider_dataset_evidence_actor_scope',
    );
    expect(migration).toContain(
      'enforce_ai_provider_data_decision_actor_scope',
    );
  });

  it('keeps evidence and material decisions append-only', () => {
    expect(migration).toContain(
      'prevent_ai_provider_data_append_only_mutation',
    );
    expect(migration).toMatch(
      /before update or delete on public\.ai_provider_dataset_evidence/,
    );
    expect(migration).toMatch(
      /before update or delete on public\.ai_provider_data_decisions/,
    );
    expect(migration).toContain(
      'grant select, insert on public.ai_provider_dataset_evidence to service_role',
    );
    expect(migration).toContain(
      'grant select, insert on public.ai_provider_data_decisions to service_role',
    );
  });

  it('keeps authenticated mutations behind privileged APIs', () => {
    for (const table of TABLES) {
      expect(migration).toContain(
        `revoke all on public.${table} from anon, authenticated`,
      );
      expect(migration).toContain(
        `grant select on public.${table} to authenticated`,
      );
    }
  });

  it('requires SHA-256-shaped integrity digests', () => {
    expect(migration.match(/\^\[a-f0-9\]\{64\}\$/g)?.length).toBeGreaterThanOrEqual(6);
  });
});
