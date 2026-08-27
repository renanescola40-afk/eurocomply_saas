import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const path = 'supabase/reconciliation/post-v23-public-acl-hardening.sql';
const sql = readFileSync(path, 'utf8');
const normalized = sql.toLowerCase().replace(/\s+/g, ' ');

test('keeps the ACL canonicalization outside the governed V23 migration set', () => {
  assert.match(normalized, /intentionally outside supabase\/migrations/);
  assert.match(normalized, /not part of the governed v23\/33 manifest/);
  assert.match(normalized, /must not be injected into v23/);
});

test('reproduces the restrictive live public schema CREATE boundary', () => {
  assert.match(
    normalized,
    /revoke create on schema public from public, anon, authenticated;/,
  );
});

test('makes future postgres-owned public objects opt-in for untrusted API roles', () => {
  for (const objectType of ['tables', 'sequences', 'functions']) {
    assert.match(
      normalized,
      new RegExp(`alter default privileges for role postgres in schema public revoke all privileges on ${objectType} from public, anon, authenticated;`),
    );
  }
});

test('never broadens anon/authenticated access', () => {
  assert.doesNotMatch(normalized, /grant\s+[^;]+\s+to\s+(?:public|anon|authenticated)/);
  assert.doesNotMatch(normalized, /grant\s+create\s+on\s+schema\s+public/);
});

test('contains fail-closed postconditions for schema CREATE and default ACLs', () => {
  assert.match(normalized, /forbidden_schema_create/);
  assert.match(normalized, /forbidden_default_acl/);
  assert.match(normalized, /defaclobjtype in \('r', 's', 'f'\)/);
  assert.match(normalized, /raise exception 'public schema create remains available/);
  assert.match(normalized, /raise exception 'postgres public-schema default acl still exposes future objects/);
});
