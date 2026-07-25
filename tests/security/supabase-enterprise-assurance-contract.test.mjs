import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/supabase-enterprise-assurance.yml', 'utf8');
const audit = readFileSync('scripts/database/audit-supabase-enterprise.mjs', 'utf8');

test('workflow is exact-SHA, bounded and secret-free', () => {
  assert.match(workflow, /name: Supabase Enterprise Assurance/);
  assert.match(workflow, /timeout-minutes: 15/);
  assert.match(workflow, /node-version: '22'/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /retention-days: 30/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflow, /DATABASE_URL/);
});

test('audit detects migration identity and destructive changes', () => {
  assert.match(audit, /duplicate-timestamp/);
  assert.match(audit, /migration-name/);
  assert.match(audit, /drop-table/);
  assert.match(audit, /drop-column/);
  assert.match(audit, /alter-column-type/);
  assert.match(audit, /enterprise-migration-review:\\s\*approved/);
});

test('audit enforces database security invariants', () => {
  assert.match(audit, /security-definer-search-path/);
  assert.match(audit, /enable\\s\+row\\s\+level\\s\+security/);
  assert.match(audit, /force\\s\+row\\s\+level\\s\+security/);
  assert.match(audit, /create\\s\+policy/);
  assert.match(audit, /productionApplicationClaimed: false/);
  assert.match(audit, /backupRestoreClaimed: false/);
});

test('runtime evidence is generated from repository state', () => {
  assert.match(audit, /supabase-enterprise-assurance\.json/);
  assert.match(audit, /sha256/);
  assert.match(audit, /GITHUB_SHA/);
  assert.match(audit, /ReviewRequired/);
  assert.match(audit, /Blocked/);
});
