import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function migrationCorpus(): string {
  const dir = 'supabase/migrations';
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => readFileSync(join(dir, name), 'utf8'))
    .join('\n');
}

describe('prohibited practices operational migration contract', () => {
  it('persists organisation-scoped assessments, evidence and decisions with RLS', () => {
    const sql = migrationCorpus().toLowerCase();
    expect(sql).toContain('prohibited');
    expect(sql).toContain('organization_id');
    expect(sql).toMatch(/enable\s+row\s+level\s+security/);
    expect(sql).toMatch(/create\s+policy/);
  });

  it('keeps privileged routines search-path hardened and auditable', () => {
    const sql = migrationCorpus().toLowerCase();
    expect(sql).toMatch(/set\s+search_path\s*=/);
    expect(sql).toMatch(/audit|history|decision/);
  });
});
