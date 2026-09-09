import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-migration-drift-audit.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const normalized = workflow.toLowerCase();
const prJobStart = workflow.indexOf('  pr-contract:');
const liveJobStart = workflow.indexOf('  audit:');
const prJob = workflow.slice(prJobStart, liveJobStart);
const liveJob = workflow.slice(liveJobStart);

describe('Supabase migration drift audit workflow', () => {
  it('runs on its intended triggers with read-only repository permissions', () => {
    expect(normalized).toContain('workflow_dispatch:');
    expect(normalized).toContain('schedule:');
    expect(normalized).toContain('pull_request:');
    expect(normalized).toContain('permissions:\n  contents: read');
    expect(normalized).not.toContain('contents: write');
  });

  it('keeps pull-request validation completely outside the production environment', () => {
    expect(prJob).toContain("if: github.event_name == 'pull_request'");
    expect(prJob).toContain('Validate drift-audit contract without production access');
    expect(prJob).not.toContain('environment: production');
    expect(prJob).not.toContain('${{ secrets.');
    expect(prJob).not.toContain('SUPABASE_DB_POOLER_URL');
    expect(prJob).not.toContain('SUPABASE_PROJECT_ID');
    expect(prJob).not.toContain('supabase migration list');
    expect(prJob).toContain('tests/security/supabase-migration-drift-audit-workflow.test.ts');
    expect(prJob).toContain('No production database secret or connection is available to this job.');
  });

  it('protects live drift inspection behind the production environment', () => {
    expect(liveJob).toContain("if: github.event_name != 'pull_request'");
    expect(liveJob).toContain('environment: production');
    expect(liveJob).toContain(
      'SUPABASE_DB_POOLER_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}',
    );
    expect(liveJob).toContain(
      'SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}',
    );
    expect(liveJob).toContain(
      'SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}',
    );
    expect(liveJob).toContain(
      'for name in SUPABASE_DB_POOLER_URL SUPABASE_PROJECT_ID; do',
    );
    expect(workflow).not.toContain('secrets.SUPABASE_DB_URL');
    expect(workflow).not.toContain('SUPABASE_DB_PASSWORD');
  });

  it('passes the canonical URL only through live step environment and a mode-600 file', () => {
    const poolerBindings = workflow.match(/secrets\.SUPABASE_DB_POOLER_URL/g);
    expect(poolerBindings).toHaveLength(2);
    expect(workflow).not.toMatch(/--password\s/);
    expect(workflow).not.toMatch(/echo\s+.*SUPABASE_DB_POOLER_URL/i);
    expect(liveJob).toContain(
      'test "$(stat -c \'%a\' "$SUPABASE_DB_URL_FILE")" = \'600\'',
    );
  });

  it('pins the Supabase CLI and avoids linked-project pooler discovery', () => {
    expect(liveJob).toContain("SUPABASE_CLI_VERSION: '2.101.0'");
    expect(liveJob).toContain('version: ${{ env.SUPABASE_CLI_VERSION }}');
    expect(liveJob).toContain('supabase migration list --db-url "$DB_URL"');
    expect(normalized).not.toContain('supabase link');
    expect(normalized).not.toContain('migration list --linked');
    expect(normalized).not.toContain('version: latest');
  });

  it('validates and removes temporary production connection material', () => {
    expect(liveJob).toContain('prepare-production-db-connection.mjs');
    expect(liveJob).toContain('connection-diagnostics.json');
    expect(liveJob).toContain(
      'test "$(stat -c \'%a\' "$SUPABASE_DB_URL_FILE")" = \'600\'',
    );
    expect(liveJob).toContain('rm -f "$SUPABASE_DB_URL_FILE"');
  });

  it('retains live evidence before enforcing drift failure', () => {
    expect(liveJob.indexOf('Generate drift evidence')).toBeLessThan(
      liveJob.indexOf('Upload migration drift evidence'),
    );
    expect(liveJob.indexOf('Upload migration drift evidence')).toBeLessThan(
      liveJob.indexOf('Enforce critical drift gate'),
    );
    expect(liveJob).toContain('if: always()');
    expect(liveJob).toContain('migration-state-remote.txt');
    expect(liveJob).toContain('migration-drift-summary.md');
  });

  it('never executes production mutation commands', () => {
    expect(normalized).not.toContain('supabase db push');
    expect(normalized).not.toContain('supabase db reset');
    expect(normalized).not.toContain('migration repair');
  });

  it('accepts a non-calendar remote ledger id only through a comment-only digest-bound record', () => {
    const root = mkdtempSync(join(tmpdir(), 'risck-drift-contract-'));
    const supabaseDir = join(root, 'supabase');
    const migrationsDir = join(supabaseDir, 'migrations');
    const reconciliationDir = join(supabaseDir, 'reconciliation');
    const remotePath = join(root, 'remote.txt');
    const firstOutput = join(root, 'first');
    const secondOutput = join(root, 'second');
    const thirdOutput = join(root, 'third');
    const scriptPath = join(process.cwd(), 'scripts/supabase/audit-migration-drift.mjs');
    const pseudoFilename = '20260908006000_v40_provider_version.sql';
    const pseudoContents = '-- intentionally non-calendar legacy version identifier\n';
    const pseudoSha = createHash('sha256').update(pseudoContents).digest('hex');

    mkdirSync(migrationsDir, { recursive: true });
    mkdirSync(reconciliationDir, { recursive: true });
    writeFileSync(join(migrationsDir, '20260909010101_baseline.sql'), '-- baseline\n');
    writeFileSync(join(migrationsDir, pseudoFilename), pseudoContents);
    writeFileSync(
      remotePath,
      [
        'Local | Remote | Time (UTC)',
        '20260909010101 | 20260909010101 | 2026-09-09 01:01:01',
        '                 | 20260908006000 | 2026-09-08',
      ].join('\n'),
    );

    const recordLines = (sha: string) => [
      '-- RECONCILIATION RECORD ONLY — DO NOT EXECUTE.',
      '--   version: 20260908006000',
      `--   local source: supabase/migrations/${pseudoFilename}`,
      `--   local source SHA-256: ${sha}`,
      '-- No DDL. No migration-history repair.',
    ];

    try {
      writeFileSync(
        join(reconciliationDir, '20260908006000_executable_record.sql'),
        [...recordLines(pseudoSha), 'select 1;', ''].join('\n'),
      );
      const executableRecord = spawnSync(
        process.execPath,
        [scriptPath, migrationsDir, remotePath, firstOutput],
        { encoding: 'utf8' },
      );
      expect(executableRecord.status).toBe(2);
      const firstReport = JSON.parse(readFileSync(join(firstOutput, 'migration-drift.json'), 'utf8'));
      expect(firstReport.status).toBe('CRITICAL_DRIFT');
      expect(firstReport.remoteOnly).toContain('20260908006000');

      rmSync(reconciliationDir, { recursive: true, force: true });
      mkdirSync(reconciliationDir, { recursive: true });
      writeFileSync(
        join(reconciliationDir, '20260908006000_wrong_digest_record.sql'),
        [...recordLines('0'.repeat(64)), ''].join('\n'),
      );
      const wrongDigestRecord = spawnSync(
        process.execPath,
        [scriptPath, migrationsDir, remotePath, secondOutput],
        { encoding: 'utf8' },
      );
      expect(wrongDigestRecord.status).toBe(2);
      const secondReport = JSON.parse(readFileSync(join(secondOutput, 'migration-drift.json'), 'utf8'));
      expect(secondReport.remoteOnly).toContain('20260908006000');

      rmSync(reconciliationDir, { recursive: true, force: true });
      mkdirSync(reconciliationDir, { recursive: true });
      writeFileSync(
        join(reconciliationDir, '20260908006000_v40_provider_record.sql'),
        [...recordLines(pseudoSha), ''].join('\n'),
      );
      const validRecord = spawnSync(
        process.execPath,
        [scriptPath, migrationsDir, remotePath, thirdOutput],
        { encoding: 'utf8' },
      );
      expect(validRecord.status).toBe(0);
      const thirdReport = JSON.parse(readFileSync(join(thirdOutput, 'migration-drift.json'), 'utf8'));
      expect(thirdReport.remoteOnly).not.toContain('20260908006000');
      expect(thirdReport.reconciledRemote).toContain('20260908006000');
      expect(thirdReport.deployabilityBlockers).toContain('invalid_local_filenames_or_timestamps');
      expect(thirdReport.safety.generalDbPushAuthorized).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
