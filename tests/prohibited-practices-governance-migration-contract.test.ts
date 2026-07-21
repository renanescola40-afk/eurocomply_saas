import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260721200000_prohibited_practices_governance.sql',
  ),
  'utf8',
);

const TABLES = [
  'ai_prohibited_practice_reviews',
  'ai_prohibited_practice_signal_assessments',
  'ai_prohibited_practice_exception_claims',
  'ai_prohibited_practice_evidence',
  'ai_prohibited_practice_decisions',
] as const;

describe('prohibited-practices governance migration contract', () => {
  it('creates the complete organization-scoped governance domain', () => {
    for (const table of TABLES) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('covers all eight Article 5 signal codes', () => {
    for (const signal of [
      'subliminal_manipulation',
      'vulnerability_exploitation',
      'social_scoring',
      'criminal_risk_prediction',
      'untargeted_facial_scraping',
      'emotion_inference_workplace_education',
      'biometric_categorisation_sensitive_traits',
      'real_time_remote_biometric_public_space',
    ]) {
      expect(migration).toContain(`'${signal}'`);
    }
  });

  it('prevents cross-organization review and signal relationships', () => {
    expect(migration).toContain('unique (organization_id, id)');
    expect(migration).toMatch(
      /foreign key \(organization_id, review_id\)[\s\S]*references public\.ai_prohibited_practice_reviews\(organization_id, id\)/,
    );
    expect(migration).toMatch(
      /foreign key \(organization_id, review_id, signal_assessment_id\)[\s\S]*references public\.ai_prohibited_practice_signal_assessments\(organization_id, review_id, id\)/,
    );
  });

  it('requires a clean resolved state before review approval', () => {
    expect(migration).toContain('ai_prohibited_review_approval_integrity');
    expect(migration).toContain('unknown_signal_count = 0');
    expect(migration).toContain('prohibited_signal_count = 0');
    expect(migration).toContain('unresolved_signal_count = 0');
    expect(migration).toContain('open_high_findings = 0');
    expect(migration).toContain('open_critical_findings = 0');
    expect(migration).toContain('last_material_change_at is null or reviewed_at >= last_material_change_at');
  });

  it('requires legal review for positive signal clearance and exceptions', () => {
    expect(migration).toContain('ai_prohibited_signal_approval_integrity');
    expect(migration).toContain("legal_conclusion in ('not_prohibited','exception_supported')");
    expect(migration).toContain('legal_reviewer_user_id is not null');
    expect(migration).toContain('legal_reviewed_at is not null');
    expect(migration).toContain('ai_prohibited_signal_exception_integrity');
  });

  it('requires complete authorization and proportionality evidence for supported exceptions', () => {
    expect(migration).toContain('ai_prohibited_exception_supported_integrity');
    expect(migration).toContain('char_length(btrim(legal_basis)) >= 10');
    expect(migration).toContain('char_length(btrim(authorization_reference)) >= 3');
    expect(migration).toContain('char_length(btrim(necessity_and_proportionality)) >= 10');
    expect(migration).toContain('valid_until is null or valid_until > valid_from');
  });

  it('enforces actor membership and separation of duties', () => {
    expect(migration).toContain('ai_prohibited_actor_is_member');
    expect(migration).toContain('enforce_ai_prohibited_review_actor_scope');
    expect(migration).toContain('enforce_ai_prohibited_signal_actor_scope');
    expect(migration).toContain('enforce_ai_prohibited_exception_actor_scope');
    expect(migration).toContain('reviewer_user_id <> owner_user_id');
    expect(migration).toContain('approver_user_id <> reviewer_user_id');
  });

  it('keeps evidence and material decisions append-only', () => {
    expect(migration).toContain('prevent_ai_prohibited_immutable_mutation');
    expect(migration).toContain('Prohibited-practice evidence and decisions are append-only');
    expect(migration).toMatch(/before update or delete on public\.ai_prohibited_practice_evidence/);
    expect(migration).toMatch(/before update or delete on public\.ai_prohibited_practice_decisions/);
    expect(migration).toContain(
      'grant select, insert on public.ai_prohibited_practice_evidence to service_role',
    );
    expect(migration).toContain(
      'grant select, insert on public.ai_prohibited_practice_decisions to service_role',
    );
  });

  it('keeps authenticated mutations behind privileged APIs', () => {
    for (const table of TABLES) {
      expect(migration).toContain(`revoke all on public.${table} from anon, authenticated`);
      expect(migration).toContain(`grant select on public.${table} to authenticated`);
    }
  });

  it('requires SHA-256-shaped integrity digests', () => {
    expect(migration.match(/\^\[a-f0-9\]\{64\}\$/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
