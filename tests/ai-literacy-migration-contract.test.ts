import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260717173000_ai_literacy_center.sql';
const migration = readFileSync(migrationPath, 'utf8');

const TABLES = [
  'ai_literacy_programs',
  'ai_literacy_courses',
  'ai_literacy_assignments',
  'ai_literacy_evidence',
] as const;

describe('AI literacy migration contract', () => {
  it('creates organization-scoped operational tables', () => {
    for (const table of TABLES) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
      expect(migration).toContain(`revoke all on public.${table} from anon;`);
    }

    expect(migration.match(/organization_id uuid not null references public\.organizations\(id\) on delete cascade/g)?.length).toBe(4);
  });

  it('uses composite tenant foreign keys for nested literacy records', () => {
    expect(migration).toContain('foreign key (program_id, organization_id)');
    expect(migration).toContain('references public.ai_literacy_programs(id, organization_id)');
    expect(migration).toContain('foreign key (course_id, organization_id)');
    expect(migration).toContain('references public.ai_literacy_courses(id, organization_id)');
    expect(migration).toContain('foreign key (assignment_id, organization_id)');
    expect(migration).toContain('references public.ai_literacy_assignments(id, organization_id)');
  });

  it('enforces completion, waiver and evidence review integrity', () => {
    expect(migration).toContain('ai_literacy_assignment_completion_consistent');
    expect(migration).toContain("status <> 'completed'");
    expect(migration).toContain('completed_at is not null and acknowledgement = true');
    expect(migration).toContain('ai_literacy_assignment_waiver_consistent');
    expect(migration).toContain('waiver_approved_by is not null');
    expect(migration).toContain('ai_literacy_evidence_review_consistent');
    expect(migration).toContain("status not in ('approved', 'rejected')");
    expect(migration).toContain('reviewed_by is not null and reviewed_at is not null');
  });

  it('requires evidence location and validates optional hashes', () => {
    expect(migration).toContain('ai_literacy_evidence_location_required');
    expect(migration).toContain("sha256 ~ '^[a-f0-9]{64}$'");
    expect(migration).toContain("evidence_type in ('completion_record', 'assessment_result', 'attendance', 'acknowledgement', 'certificate', 'other')");
  });

  it('reuses fail-closed membership helpers for read and manage policies', () => {
    expect(migration.match(/public\.enterprise_member_can_read\(organization_id\)/g)?.length).toBe(4);
    expect(migration.match(/public\.enterprise_member_can_manage\(organization_id\)/g)?.length).toBe(8);
  });
});
