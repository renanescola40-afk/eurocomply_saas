import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = join(process.cwd(), 'scripts/supabase/audit-migration-drift.mjs');

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'risck-remote-canonical-drift-'));
  const supabaseDir = join(root, 'supabase');
  const migrationsDir = join(supabaseDir, 'migrations');
  const reconciliationDir = join(supabaseDir, 'reconciliation');
  const remotePath = join(root, 'migration-state-remote.txt');
  const canonicalFilename = '20260909142500_canonical_hotfix.sql';
  const canonicalContents = '-- canonical reviewed source bytes\n';
  const canonicalSha256 = createHash('sha256').update(canonicalContents).digest('hex');
  const remoteVersion = '20260909230946';

  mkdirSync(migrationsDir, { recursive: true });
  mkdirSync(reconciliationDir, { recursive: true });
  writeFileSync(join(migrationsDir, canonicalFilename), canonicalContents);
  writeFileSync(
    remotePath,
    [
      'Local | Remote | Time (UTC)',
      `      | ${remoteVersion} | 2026-09-09 23:09:46`,
    ].join('\n'),
  );

  return {
    root,
    migrationsDir,
    reconciliationDir,
    remotePath,
    canonicalFilename,
    canonicalSha256,
    remoteVersion,
  };
}

function recordLines(fixture: ReturnType<typeof createFixture>, includeCanonicalVersion: boolean) {
  return [
    '-- RECONCILIATION RECORD ONLY — DO NOT EXECUTE.',
    `--   version: ${fixture.remoteVersion}`,
    ...(includeCanonicalVersion ? ['--   canonical source version: 20260909142500'] : []),
    `--   local source: supabase/migrations/${fixture.canonicalFilename}`,
    `--   local source SHA-256: ${fixture.canonicalSha256}`,
    '-- No DDL. No migration-history repair. No database write.',
    '',
  ].join('\n');
}

describe('Supabase remote-to-canonical migration reconciliation', () => {
  it('accepts a digest-bound remote ledger version mapped explicitly to a different canonical source version', () => {
    const fixture = createFixture();
    const outputDir = join(fixture.root, 'valid-output');

    try {
      writeFileSync(
        join(fixture.reconciliationDir, `${fixture.remoteVersion}_provider_record.sql`),
        recordLines(fixture, true),
      );

      const result = spawnSync(
        process.execPath,
        [scriptPath, fixture.migrationsDir, fixture.remotePath, outputDir],
        { encoding: 'utf8' },
      );

      expect(result.status).toBe(0);
      const report = JSON.parse(readFileSync(join(outputDir, 'migration-drift.json'), 'utf8'));
      const inventory = JSON.parse(
        readFileSync(join(outputDir, 'migration-reconciliation-inventory.json'), 'utf8'),
      );

      expect(report.status).toBe('PENDING_LOCAL_MIGRATIONS');
      expect(report.remoteOnly).not.toContain(fixture.remoteVersion);
      expect(report.reconciledRemote).toContain(fixture.remoteVersion);
      expect(report.safety.generalDbPushAuthorized).toBe(false);
      expect(report.deployabilityBlockers).toContain('pending_local_versions');

      const record = inventory.reconciliationInventory.find(
        (entry: { version: string }) => entry.version === fixture.remoteVersion,
      );
      expect(record.recordValidation.valid).toBe(true);
      expect(record.recordValidation.sourceVersion).toBe('20260909142500');
      expect(record.recordValidation.canonicalSourceVersion).toBe('20260909142500');
      expect(record.recordValidation.sourceSha256Matches).toBe(true);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('keeps a valid-timestamp provider record in CRITICAL_DRIFT when the distinct canonical source version is not declared', () => {
    const fixture = createFixture();
    const outputDir = join(fixture.root, 'invalid-output');

    try {
      writeFileSync(
        join(fixture.reconciliationDir, `${fixture.remoteVersion}_provider_record.sql`),
        recordLines(fixture, false),
      );

      const result = spawnSync(
        process.execPath,
        [scriptPath, fixture.migrationsDir, fixture.remotePath, outputDir],
        { encoding: 'utf8' },
      );

      expect(result.status).toBe(2);
      const report = JSON.parse(readFileSync(join(outputDir, 'migration-drift.json'), 'utf8'));
      const inventory = JSON.parse(
        readFileSync(join(outputDir, 'migration-reconciliation-inventory.json'), 'utf8'),
      );

      expect(report.status).toBe('CRITICAL_DRIFT');
      expect(report.remoteOnly).toContain(fixture.remoteVersion);

      const record = inventory.reconciliationInventory.find(
        (entry: { version: string }) => entry.version === fixture.remoteVersion,
      );
      expect(record.recognizedVersionIdentifier).toBe(false);
      expect(record.recordValidation.valid).toBe(false);
      expect(record.recordValidation.failures).toContain('missing_canonical_source_version');
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
