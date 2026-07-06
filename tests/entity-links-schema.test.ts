import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('entity link schema', () => {
  it('keeps AI systems linkable to related workflow records', () => {
    const migration = read('supabase/migrations/20260706103000_ai_system_relationship_fields.sql');

    expect(migration).toContain('alter table if exists public.ai_systems');
    expect(migration).toContain('primary_vendor_id uuid');
    expect(migration).toContain('primary_document_id uuid');
    expect(migration).toContain('primary_task_id uuid');
    expect(migration).toContain('primary_risk_id uuid');
    expect(migration).toContain('alter table if exists public.compliance_tasks');
    expect(migration).toContain('add column if not exists ai_system_id uuid');
    expect(migration).toContain('create index if not exists ai_systems_primary_vendor_idx');
    expect(migration).toContain('create index if not exists compliance_tasks_ai_system_idx');
  });
});
