import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const projectSmoke = readFileSync('.github/workflows/ephemeral-supabase-project-smoke.yml', 'utf8');
const restoreSmoke = readFileSync('.github/workflows/ephemeral-supabase-restore-smoke.yml', 'utf8');
const finalTechnical = readFileSync('.github/workflows/final-technical-controls-proof.yml', 'utf8');

function before(source, first, second) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0, `${first} must exist`);
  assert.ok(secondIndex >= 0, `${second} must exist`);
  assert.ok(firstIndex < secondIndex, `${first} must run before ${second}`);
}

test('exact-SHA project schema smoke verifies the hosted client before disposable database work', () => {
  before(
    projectSmoke,
    'Verify runner PostgreSQL client without network installation',
    'Start exact-SHA disposable project database and capture bounded diagnostics',
  );
  assert.match(projectSmoke, /scripts\/recovery\/verify-postgresql-client\.mjs/);
  assert.doesNotMatch(projectSmoke, /apt-get|apt install|Install PostgreSQL client/);
});

test('synthetic restore smoke verifies the hosted client before creating either disposable database', () => {
  before(
    restoreSmoke,
    'Verify runner PostgreSQL client without network installation',
    'Start clean disposable synthetic source',
  );
  assert.match(restoreSmoke, /scripts\/recovery\/verify-postgresql-client\.mjs/);
  assert.doesNotMatch(restoreSmoke, /apt-get|apt install|Install PostgreSQL client/);
  assert.doesNotMatch(restoreSmoke, /secrets\./);
});

test('final technical proof verifies the hosted client before exact-SHA disposable database work', () => {
  before(
    finalTechnical,
    'Verify runner PostgreSQL client without network installation',
    'Start exact-SHA disposable Supabase project database',
  );
  assert.match(finalTechnical, /scripts\/recovery\/verify-postgresql-client\.mjs/);
  assert.doesNotMatch(finalTechnical, /apt-get|apt install|Install PostgreSQL client/);
  assert.doesNotMatch(finalTechnical, /secrets\.RECOVERY_ISOLATED_DATABASE_URL/);
});
