import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.resolve('scripts/supabase/audit-migration-drift.mjs');
const temporaryRoots = [];

function writeMigration(directory, filename, sql = 'select 1;\n') {
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, filename), sql);
}

function remoteList(...versions) {
  return [
    '  Local          | Remote         | Time (UTC)',
    '-----------------|----------------|---------------------',
    ...versions.map((version) => `                 | ${version} |`),
    '',
  ].join('\n');
}

function runAudit({ localFiles = [], remoteVersions = [], reconciliationFiles = [] }) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'supabase-drift-gate-'));
  temporaryRoots.push(root);
  const migrationsDir = path.join(root, 'supabase', 'migrations');
  const reconciliationDir = path.join(root, 'supabase', 'reconciliation');
  const remotePath = path.join(root, 'remote.txt');
  const outputDir = path.join(root, 'artifacts');

  for (const filename of localFiles) writeMigration(migrationsDir, filename);
  for (const filename of reconciliationFiles) writeMigration(reconciliationDir, filename);
  mkdirSync(migrationsDir, { recursive: true });
  writeFileSync(remotePath, remoteList(...remoteVersions));

  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      migrationsDir,
      remotePath,
      outputDir,
      '--require-deployable',
    ],
    { encoding: 'utf8' },
  );
  const report = JSON.parse(
    readFileSync(path.join(outputDir, 'migration-drift.json'), 'utf8'),
  );

  return { result, report };
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    rmSync(temporaryRoots.pop(), { recursive: true, force: true });
  }
});

describe('Supabase migration deployability gate', () => {
  it('authorizes only a dry-run when local and remote history are aligned', () => {
    const version = '20260730120000';
    const { result, report } = runAudit({
      localFiles: [`${version}_aligned.sql`],
      remoteVersions: [version],
    });

    expect(result.status).toBe(0);
    expect(report.status).toBe('ALIGNED');
    expect(report.deploymentAuthorization).toBe('AUTHORIZED_FOR_DRY_RUN');
    expect(report.safety.generalDbPushAuthorized).toBe(true);
    expect(report.deployabilityBlockers).toEqual([]);
    expect(report.safety.recommendation).toContain('dry-run');
    expect(report.safety.recommendation).toContain('does not authorize a production write');
  });

  it('blocks pending local migrations with exit code 3', () => {
    const { result, report } = runAudit({
      localFiles: ['20260730120100_pending.sql'],
      remoteVersions: [],
    });

    expect(result.status).toBe(3);
    expect(report.status).toBe('PENDING_LOCAL_MIGRATIONS');
    expect(report.deploymentAuthorization).toBe('BLOCKED');
    expect(report.deployabilityBlockers).toContain('pending_local_versions');
  });

  it('blocks invalid timestamps and duplicate versions with exit code 3', () => {
    const version = '20260730120200';
    const { result, report } = runAudit({
      localFiles: [
        `${version}_first.sql`,
        `${version}_duplicate.sql`,
        '20261301120000_invalid_month.sql',
      ],
      remoteVersions: [version],
    });

    expect(result.status).toBe(3);
    expect(report.deployabilityBlockers).toContain('invalid_local_filenames_or_timestamps');
    expect(report.deployabilityBlockers).toContain('duplicate_local_versions');
    expect(report.summary.invalidLocal).toBe(1);
    expect(report.summary.duplicateVersions).toBe(1);
  });

  it('treats an unknown remote-only version as critical drift with exit code 2', () => {
    const { result, report } = runAudit({
      localFiles: [],
      remoteVersions: ['20260730120300'],
    });

    expect(result.status).toBe(2);
    expect(report.status).toBe('CRITICAL_DRIFT');
    expect(report.deploymentAuthorization).toBe('BLOCKED');
    expect(report.deployabilityBlockers).toContain('unknown_remote_versions');
  });

  it('accepts a remote version represented by a controlled reconciliation file', () => {
    const version = '20260730120400';
    const { result, report } = runAudit({
      localFiles: [],
      reconciliationFiles: [`${version}_controlled_hotfix.sql`],
      remoteVersions: [version],
    });

    expect(result.status).toBe(0);
    expect(report.status).toBe('ALIGNED');
    expect(report.summary.reconciledRemote).toBe(1);
    expect(report.deploymentAuthorization).toBe('AUTHORIZED_FOR_DRY_RUN');
  });
});
