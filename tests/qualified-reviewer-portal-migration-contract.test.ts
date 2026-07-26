import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = new URL('../supabase/migrations/20260726140000_qualified_reviewer_portal.sql', import.meta.url);

test('reviewer portal migration is tenant-scoped and backend-only', async () => {
  const sql = await readFile(migration, 'utf8');
  for (const table of ['qualified_reviewer_invites','qualified_reviewer_sessions','qualified_reviewer_attestations']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
  }
  assert.match(sql, /foreign key \(assignment_id, organization_id\)/i);
  assert.match(sql, /foreign key \(reviewer_id, organization_id\)/i);
  assert.match(sql, /grant execute on function public\.accept_qualified_reviewer_invite[\s\S]*service_role/i);
  assert.match(sql, /grant execute on function public\.expire_qualified_reviewer_access[\s\S]*service_role/i);
  assert.match(sql, /session_expiry_invalid/i);
  assert.match(sql, /reviewer_invite_accepted/i);
});

test('reviewer access stores only token and session hashes', async () => {
  const sql = await readFile(migration, 'utf8');
  assert.match(sql, /token_hash text not null check \(token_hash ~ '\^\[a-f0-9\]\{64\}\$'\)/i);
  assert.match(sql, /session_hash text not null check \(session_hash ~ '\^\[a-f0-9\]\{64\}\$'\)/i);
  assert.doesNotMatch(sql, /token_plain|session_plain/i);
});
