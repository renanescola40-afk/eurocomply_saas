import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const install = readFileSync(new URL('../../scripts/qa/qa-bil02-restricted-event-writer-install.sql', import.meta.url), 'utf8');
const rehearsal = readFileSync(new URL('../../scripts/qa/qa-bil02-restricted-event-writer-rollback.sql', import.meta.url), 'utf8');
const sourceBegin = rehearsal.indexOf('BEGIN;\nDO $guard$');
const sourceStop = rehearsal.indexOf('SET LOCAL ROLE risck_qa_stripe_event_writer;');
const expectedCore = rehearsal.slice(sourceBegin, sourceStop).replace('GRANT risck_qa_stripe_event_writer TO postgres;\n', '');

test('persistent installer retains the previously rehearsed restricted grant/policy SQL', () => {
  assert.ok(sourceBegin >= 0 && sourceStop > sourceBegin, 'reviewed rehearsal missing');
  assert.ok(install.includes(expectedCore), 'role and policy content must match the rollback-tested source');
  assert.equal(install.split('CREATE ROLE risck_qa_stripe_event_writer').length - 1, 1);
});

test('installer is transaction-protected and is not an automatic Production migration', () => {
  assert.match(install, /BEGIN;\s*DO \$guard\$/);
  assert.match(install, /END \$install_verify\$;\s*COMMIT;\s*$/);
  assert.doesNotMatch(install, /\bROLLBACK;|SET LOCAL ROLE|GRANT risck_qa_stripe_event_writer TO postgres;/);
  assert.match(install, /Target exclusively: Supabase QA project/i);
});

test('role is no-login no-inheritance and RLS stays enforced', () => {
  assert.match(install, /NOLOGIN NOINHERIT NOBYPASSRLS/);
  assert.match(install, /relrowsecurity AND relforcerowsecurity/);
  assert.match(install, /FOR INSERT TO risck_qa_stripe_event_writer/);
  assert.match(install, /FOR SELECT TO risck_qa_stripe_event_writer/);
  assert.doesNotMatch(install, /SECURITY DEFINER|DISABLE ROW LEVEL SECURITY|GRANT .* TO (?:anon|authenticated|PUBLIC)/i);
});

test('intake cannot process events or alter subscriptions and entitlements', () => {
  assert.match(install, /INSERT \(id, type, stripe_created_at, livemode, api_version, payload\)/);
  assert.doesNotMatch(install, /GRANT UPDATE|GRANT DELETE|INSERT \(id, type, status/);
  assert.match(install, /status = 'processing'/);
  assert.match(install, /has_column_privilege\('risck_qa_stripe_event_writer',[\s\S]*'status','UPDATE'\)/);
  assert.match(install, /has_table_privilege\('risck_qa_stripe_event_writer',[\s\S]*'public.organization_entitlements','UPDATE'\)/);
});
