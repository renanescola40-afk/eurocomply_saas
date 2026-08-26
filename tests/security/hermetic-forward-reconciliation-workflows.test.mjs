import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rehearsal = readFileSync('.github/workflows/supabase-forward-reconciliation-rehearsal.yml', 'utf8');
const dryRun = readFileSync('.github/workflows/supabase-forward-reconciliation-dry-run.yml', 'utf8');
const dataPlane = readFileSync('.github/workflows/supabase-enterprise-data-plane-qa.yml', 'utf8');

function before(source, first, second) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0, `${first} must exist`);
  assert.ok(secondIndex >= 0, `${second} must exist`);
  assert.ok(firstIndex < secondIndex, `${first} must run before ${second}`);
}

function jobHeader(source, jobName) {
  const jobIndex = source.indexOf(`  ${jobName}:`);
  assert.ok(jobIndex >= 0, `${jobName} job must exist`);
  const stepsIndex = source.indexOf('    steps:', jobIndex);
  assert.ok(stepsIndex > jobIndex, `${jobName} steps must exist`);
  return source.slice(jobIndex, stepsIndex);
}

test('forward rehearsal keeps Production row data inside Supabase provider boundary', () => {
  before(rehearsal, 'Compile immutable selected migration manifest', 'Verify Supabase provider-managed Production restore without exporting row data');
  before(rehearsal, 'Verify Supabase provider-managed Production restore without exporting row data', 'Apply only selected exact-byte migrations to isolated Supabase restore project');
  assert.doesNotMatch(rehearsal, /SUPABASE_DB_POOLER_URL/);
  assert.doesNotMatch(rehearsal, /run-backup-restore-exercise\.mjs/);
  assert.doesNotMatch(rehearsal, /supabase db dump|pg_dump|production-data\.sql|production-backup\.dump/);
  assert.match(rehearsal, /verify-supabase-provider-managed-restore\.mjs/);
  assert.match(rehearsal, /SUPABASE_RESTORE_TO_NEW_PROJECT_CONFIRMED/);
  assert.match(rehearsal, /SUPABASE_ACCESS_TOKEN/);
  assert.doesNotMatch(jobHeader(rehearsal, 'rehearse'), /SUPABASE_ACCESS_TOKEN|NEXT_PUBLIC_SUPABASE_URL/);
});

test('bounded production dry-run uses the hermetic client and limits the pooler secret to remote-observation steps', () => {
  before(dryRun, 'Verify runner PostgreSQL client without network installation', 'Build filtered workdir from remote migration history');
  before(dryRun, 'Build filtered workdir from remote migration history', 'Execute filtered Supabase migration dry run only');
  assert.doesNotMatch(dryRun, /apt-get|apt install|Install PostgreSQL client/);
  assert.doesNotMatch(jobHeader(dryRun, 'dry-run'), /secrets\.SUPABASE_DB_POOLER_URL/);
  assert.equal((dryRun.match(/secrets\.SUPABASE_DB_POOLER_URL/g) ?? []).length, 3);
  assert.match(dryRun, /db push --dry-run --db-url/);
  assert.doesNotMatch(dryRun, /db push --db-url/);
});

test('enterprise data-plane QA verifies the hosted client before exact-SHA disposable database work', () => {
  before(dataPlane, 'Verify runner PostgreSQL client without network installation', 'Start reviewed exact-SHA disposable database');
  assert.doesNotMatch(dataPlane, /apt-get|apt install|Install PostgreSQL client/);
  assert.match(dataPlane, /tests\/security\/recovery-postgresql-client\.test\.mjs/);
  assert.match(dataPlane, /verify-postgresql-client\.mjs/);
});
