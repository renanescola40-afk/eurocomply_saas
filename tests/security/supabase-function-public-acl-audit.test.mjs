import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('scripts/security/audit-privileged-function-acls.sql', 'utf8');

test('audits PUBLIC via effective ACL metadata instead of treating it as a login role', () => {
  assert.match(sql, /aclexplode\s*\(\s*coalesce\s*\(\s*p\.proacl\s*,\s*acldefault\s*\(\s*'f'\s*,\s*p\.proowner\s*\)\s*\)\s*\)/i);
  assert.match(sql, /grants\.grantee\s*=\s*0/i);
  assert.match(sql, /grants\.privilege_type\s*=\s*'EXECUTE'/i);
  assert.doesNotMatch(sql, /has_function_privilege\s*\(\s*'PUBLIC'/i);
});

test('retains effective anon/authenticated direct EXECUTE inventory', () => {
  assert.match(sql, /has_function_privilege\('anon',p\.oid,'EXECUTE'\)/);
  assert.match(sql, /has_function_privilege\('authenticated',p\.oid,'EXECUTE'\)/);
});

test('keeps catalog query read-only and scoped to privileged application functions', () => {
  assert.match(sql, /where p\.prosecdef and n\.nspname in \('public','app_private'\)/);
  assert.doesNotMatch(sql, /(?:^|\n)\s*(?:alter|revoke|grant|insert|update|delete|drop|create)\s/im);
});
