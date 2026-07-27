import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const migration = new URL('../supabase/migrations/20260726140000_qualified_reviewer_portal.sql', import.meta.url);

describe('qualified reviewer portal migration contract', () => {
  it('is tenant-scoped and backend-only', async () => {
    const sql = await readFile(migration, 'utf8');
    for (const table of ['qualified_reviewer_invites', 'qualified_reviewer_sessions', 'qualified_reviewer_attestations']) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${table} force row level security`, 'i'));
    }
    expect(sql).toMatch(/foreign key \(assignment_id, organization_id\)/i);
    expect(sql).toMatch(/foreign key \(reviewer_id, organization_id\)/i);
    expect(sql).toMatch(/grant execute on function public\.accept_qualified_reviewer_invite[\s\S]*service_role/i);
    expect(sql).toMatch(/grant execute on function public\.expire_qualified_reviewer_access[\s\S]*service_role/i);
    expect(sql).toMatch(/session_expiry_invalid/i);
    expect(sql).toMatch(/reviewer_invite_accepted/i);
  });

  it('stores only token and session hashes', async () => {
    const sql = await readFile(migration, 'utf8');
    expect(sql).toMatch(/token_hash text not null check \(token_hash ~ '\^\[a-f0-9\]\{64\}\$'\)/i);
    expect(sql).toMatch(/session_hash text not null check \(session_hash ~ '\^\[a-f0-9\]\{64\}\$'\)/i);
    expect(sql).not.toMatch(/token_plain|session_plain/i);
  });
});
