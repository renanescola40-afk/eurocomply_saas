import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { expect, it } from 'vitest';

// Included by existing vitest.config.ts test.include = ['tests/**/*.test.ts',...]
// Exercises the exact-source QA replay builder only. Never connects to Supabase.
const generator = 'scripts/supabase/build-g1-qa-rollback-replay.mjs';
const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

it('builds safe exact-SHA rollback-only SQL for reviewed steps 48, 51 and 55', async () => {
  await mkdir('artifacts', { recursive: true });
  const dir = await mkdtemp('artifacts/g1-qa-rollback-vitest-');
  try {
    for (const stage of [48, 51, 55]) {
      const output = dir + '/step-' + stage + '.sql';
      const completed = spawnSync(process.execPath, [generator, '--through=' + stage, '--output=' + output], {
        encoding: 'utf8',
        timeout: 30000,
        env: { ...process.env, G1_EXPECTED_SOURCE_SHA: headSha },
      });

      expect(completed.status, 'builder failed at step ' + stage + ': ' + completed.stderr).toBe(0);
      const sql = await readFile(output, 'utf8');
      const manifest = JSON.parse(await readFile(output + '.manifest.json', 'utf8')) as {
        headSha: string;
        through: number;
        files: unknown[];
        noProductionAuthorization: boolean;
        noExecutionByBuilder: boolean;
      };
      expect((sql.match(/^\s*BEGIN;/gim) ?? []).length).toBe(1);
      expect((sql.match(/^\s*ROLLBACK;/gim) ?? []).length).toBe(1);
      expect((sql.match(/^\s*COMMIT;/gim) ?? []).length).toBe(0);
      expect(sql).toContain('QA replay refused: database is not empty');
      expect(sql).toContain('QA_ROLLBACK_REPLAY_OK');
      expect(sql).toContain('G1_QA_MIGRATION_048_CANONICAL_RLS_PREREQUISITE');
      expect(manifest.headSha).toBe(headSha);
      expect(manifest.through).toBe(stage);
      expect(manifest.noProductionAuthorization).toBe(true);
      expect(manifest.noExecutionByBuilder).toBe(true);
      expect(manifest.files.length).toBe(stage === 48 ? 8 : stage === 51 ? 11 : 15);
      if (stage === 55) expect(sql).toContain('v19_harden_active_onboarding_enterprise_boundaries');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it('rejects an unreviewed replay stage or wrong source SHA', () => {
  const invalidStage = spawnSync(process.execPath, [generator, '--through=137'], {
    encoding: 'utf8',
    timeout: 30000,
  });
  expect(invalidStage.status).not.toBe(0);
  expect(invalidStage.stderr).toContain('Only reviewed through=48,51,55 supported');

  const badSha = spawnSync(process.execPath, [generator, '--through=48'], {
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, G1_EXPECTED_SOURCE_SHA: '0000000000000000000000000000000000000000' },
  });
  expect(badSha.status).not.toBe(0);
  expect(badSha.stderr).toContain('Source SHA mismatch');
});