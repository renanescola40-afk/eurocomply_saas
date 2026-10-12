import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Supabase migration drift live-ledger binding', () => {
  it('keeps a reviewed alias fail-closed until the live remote statement digest matches', () => {
    const root = mkdtempSync(join(tmpdir(), 'risck-live-ledger-binding-'));
    const supabaseDir = join(root, 'supabase');
    const migrationsDir = join(supabaseDir, 'migrations');
    const reconciliationDir = join(supabaseDir, 'reconciliation');
    const remotePath = join(root, 'remote.txt');
    const remoteEvidencePath = join(root, 'remote-evidence.json');
    const outputMismatch = join(root, 'mismatch');
    const outputMatch = join(root, 'match');
    const scriptPath = join(process.cwd(), 'scripts/supabase/audit-migration-drift.mjs');

    const sourceFilename = '20261012010101_canonical.sql';
    const sourceContents = '-- canonical source\nselect 1;\n';
    const sourceSha = createHash('sha256').update(sourceContents).digest('hex');
    const remoteVersion = '20261012020202';
    const expectedRemoteSha = '1'.repeat(64);

    mkdirSync(migrationsDir, { recursive: true });
    mkdirSync(reconciliationDir, { recursive: true });
    writeFileSync(join(migrationsDir, sourceFilename), sourceContents);
    writeFileSync(
      join(reconciliationDir, `${remoteVersion}_provider_alias_record.sql`),
      [
        '-- RECONCILIATION RECORD ONLY — DO NOT EXECUTE.',
        `-- version: ${remoteVersion}`,
        '-- canonical source version: 20261012010101',
        `-- local source: supabase/migrations/${sourceFilename}`,
        `-- local source SHA-256: ${sourceSha}`,
        '-- remote ledger name: provider_alias',
        `-- remote statement SHA-256: ${expectedRemoteSha}`,
        '-- reviewed by: owner-authorized-security-review',
        '-- reviewed at: 2026-10-12',
        '-- schema evidence reference: docs/security/evidence/runtime/provider-alias-review.json',
        '-- No DDL. No migration-history repair.',
        '',
      ].join('\n'),
    );
    writeFileSync(
      remotePath,
      [
        'Local | Remote | Time (UTC)',
        `      | ${remoteVersion} | 2026-10-12 02:02:02`,
      ].join('\n'),
    );

    try {
      writeFileSync(
        remoteEvidencePath,
        JSON.stringify([{ version: remoteVersion, name: 'provider_alias', statement_sha256: '2'.repeat(64) }]),
      );
      const mismatch = spawnSync(
        process.execPath,
        [
          scriptPath,
          migrationsDir,
          remotePath,
          outputMismatch,
          `--remote-evidence=${remoteEvidencePath}`,
        ],
        { encoding: 'utf8' },
      );
      expect(mismatch.status).toBe(2);
      const mismatchReport = JSON.parse(readFileSync(join(outputMismatch, 'migration-drift.json'), 'utf8'));
      expect(mismatchReport.remoteOnly).toContain(remoteVersion);

      writeFileSync(
        remoteEvidencePath,
        JSON.stringify([{ version: remoteVersion, name: 'provider_alias', statement_sha256: expectedRemoteSha }]),
      );
      const match = spawnSync(
        process.execPath,
        [
          scriptPath,
          migrationsDir,
          remotePath,
          outputMatch,
          `--remote-evidence=${remoteEvidencePath}`,
        ],
        { encoding: 'utf8' },
      );
      expect(match.status).toBe(0);
      const matchReport = JSON.parse(readFileSync(join(outputMatch, 'migration-drift.json'), 'utf8'));
      expect(matchReport.remoteOnly).not.toContain(remoteVersion);
      expect(matchReport.reconciledRemote).toContain(remoteVersion);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
