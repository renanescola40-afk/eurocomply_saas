import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260803133000_article_50_product_integration.sql',
  'utf8',
).toLowerCase();

describe('Article 50 operational migration contract', () => {
  it('creates versioned assessment, evidence and event domains', () => {
    expect(migration).toContain('create table if not exists public.ai_article50_assessments');
    expect(migration).toContain('create table if not exists public.ai_article50_evidence');
    expect(migration).toContain('create table if not exists public.ai_article50_events');
    expect(migration).toContain('unique (organization_id, ai_system_id, version)');
  });

  it('enables and forces RLS for every Article 50 table', () => {
    for (const table of [
      'ai_article50_assessments',
      'ai_article50_evidence',
      'ai_article50_events',
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('allows tenant reads but blocks browser writes', () => {
    expect(migration).toContain('organization_members');
    expect(migration).toContain('member.user_id = auth.uid()');
    expect(migration).toContain(
      'revoke insert, update, delete on public.ai_article50_assessments from anon, authenticated',
    );
    expect(migration).toContain(
      'revoke insert, update, delete on public.ai_article50_evidence from anon, authenticated',
    );
    expect(migration).toContain(
      'revoke insert, update, delete on public.ai_article50_events from anon, authenticated',
    );
  });

  it('creates assessment versions atomically under a per-system advisory lock', () => {
    expect(migration).toContain('create_article50_assessment_version');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('coalesce(max(version), 0) + 1');
    expect(migration).toContain('grant execute on function public.create_article50_assessment_version');
    expect(migration).toContain('to service_role');
  });

  it('prevents unsupported readiness states and incomplete transition claims', () => {
    expect(migration).toContain("status in ('blocked', 'needs_review', 'ready')");
    expect(migration).toContain('not final_amending_act_verified');
    expect(migration).toContain('official_journal_evidence_id');
    expect(migration).toContain("sha256_digest ~ '^[a-f0-9]{64}$'");
  });
});
