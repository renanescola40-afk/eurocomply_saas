import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync, execFileSync } from 'node:child_process';

const generator = 'scripts/supabase/build-g1-qa-rollback-replay.mjs';
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

test('G1 generates safe rollback-only QA SQL for accepted migration boundaries', async () => {
  await mkdir('artifacts', { recursive: true });
  const dir = await mkdtemp('artifacts/g1qa-rollback-test-');
  try {
    for (const through of [48, 51, 55]) {
      const file = dir + '/rollback-' + through + '.sql';
      const result = spawnSync(process.execPath, [generator, '--through=' + through, '--output=' + file], {
        encoding: 'utf8',
        env: { ...process.env, G1_EXPECTED_SOURCE_SHA: head },
        timeout: 30000,
      });
      assert.equal(result.status, 0, 'Generator failed for ' + through + ': ' + result.stderr);
      const sql = await readFile(file, 'utf8');
      const manifest = JSON.parse(await readFile(file + '.manifest.json', 'utf8'));
      assert.equal((sql.match(/^\s*BEGIN;/gim) || []).length, 1, 'Single transaction BEGIN required');
      assert.equal((sql.match(/^\s*ROLLBACK;/gim) || []).length, 1, 'Single ROLLBACK required');
      assert.equal((sql.match(/^\s*COMMIT;/gim) || []).length, 0, 'COMMIT forbidden');
      assert.match(sql, /QA replay refused: database is not empty/);
      assert.match(sql, /QA_ROLLBACK_REPLAY_OK/);
      assert.match(sql, /G1_QA_MIGRATION_048_CANONICAL_RLS_PREREQUISITE/);
      assert.equal(manifest.through, through);
      assert.equal(manifest.headSha, head);
      assert.equal(manifest.noProductionAuthorization, true);
      assert.equal(manifest.noExecutionByBuilder, true);
      assert.equal(manifest.files.length, through === 48 ? 8 : through === 51 ? 11 : 15);
      if (through >= 55) assert.match(sql, /v19_harden_active_onboarding_enterprise_boundaries/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('G1 rejects unreviewed migration stage and wrong checkout SHA', async () => {
  const invalidStage = spawnSync(process.execPath, [generator, '--through=137'], { encoding: 'utf8', timeout: 30000 });
  assert.notEqual(invalidStage.status, 0);
  assert.match(invalidStage.stderr, /Only reviewed through=48,51,55 supported/);
  const wrongSha = spawnSync(process.execPath, [generator, '--through=48'], {
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, G1_EXPECTED_SOURCE_SHA: '0000000000000000000000000000000000000000' },
  });
  assert.notEqual(wrongSha.status, 0);
  assert.match(wrongSha.stderr, /Source SHA mismatch/);
});
