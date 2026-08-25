#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const MIGRATION_FILE = /^(\d{14})_([a-z0-9_]+)\.sql$/;
const CONFIG_SCHEMA = 'risck-comply.supabase-forward-reconciliation-config.v1';
const MANIFEST_SCHEMA = 'risck-comply.supabase-forward-reconciliation-manifest.v1';
const REHEARSAL_SCHEMA = 'risck-comply.supabase-forward-reconciliation-rehearsal.v1';
const SET_PROOF_SCHEMA = 'risck-comply.supabase-forward-reconciliation-set-proof.v1';
// This ceiling is intentionally bound to the exact current governed package.
// Raising it again requires another reviewed material package change.
const MAX_MIGRATIONS = 33;
const MAX_SQL_BYTES = 2 * 1024 * 1024;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseExpectedSha(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  assert(FULL_SHA.test(normalized), 'expected SHA must be a lowercase 40-character Git SHA');
  return normalized;
}

function immutableSelectionPayload({ targetSha, changeSet, migrations }) {
  return {
    schema: 'risck-comply.supabase-forward-reconciliation-selection.v1',
    targetSha,
    changeSet,
    migrations: migrations.map(({ version, filename, sha256: digest }) => ({
      version,
      filename,
      sha256: digest,
    })),
  };
}

function validateConfig(config) {
  assert(config?.schema === CONFIG_SCHEMA, 'forward reconciliation config schema is invalid');
  assert(typeof config?.changeSet === 'string' && /^[a-z0-9][a-z0-9._-]{3,127}$/i.test(config.changeSet), 'changeSet is invalid');
  assert(Array.isArray(config?.migrations) && config.migrations.length > 0 && config.migrations.length <= MAX_MIGRATIONS, `config migrations must contain 1-${MAX_MIGRATIONS} items`);
  assert(config?.truthBoundary?.automaticClassification === false, 'config must forbid automatic classification');
  assert(config?.truthBoundary?.productionWriteAuthorizedByConfig === false, 'config must not authorize production writes');
  assert(config?.truthBoundary?.migrationHistoryRepairAllowed === false, 'config must forbid migration history repair');
  assert(config?.truthBoundary?.unrestrictedDbPushAllowed === false, 'config must forbid unrestricted db push');
  assert(config?.truthBoundary?.onlyListedForwardMigrationsMayBeRehearsedOrRequested === true, 'config must bind execution to the listed set');
}

export async function compileForwardReconciliationManifest({
  config,
  rootDir,
  subjectSha,
  generatedAt = new Date().toISOString(),
}) {
  validateConfig(config);
  const targetSha = parseExpectedSha(subjectSha);
  const seenVersions = new Set();
  const seenFiles = new Set();
  const migrations = [];

  for (const item of config.migrations) {
    assert(typeof item?.filename === 'string', 'migration filename is required');
    const match = item.filename.match(MIGRATION_FILE);
    assert(match, `migration filename is not canonical: ${item.filename}`);
    const [, version, name] = match;
    assert(!seenVersions.has(version), `duplicate migration version in selected set: ${version}`);
    assert(!seenFiles.has(item.filename), `duplicate migration filename in selected set: ${item.filename}`);
    seenVersions.add(version);
    seenFiles.add(item.filename);

    const filePath = join(rootDir, 'supabase', 'migrations', item.filename);
    let bytes;
    try {
      bytes = await readFile(filePath);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        throw new Error(`selected migration is missing: ${item.filename}`);
      }
      throw error;
    }
    assert(bytes.byteLength > 0 && bytes.byteLength <= MAX_SQL_BYTES, `selected migration size is invalid: ${item.filename}`);
    let sql;
    try {
      sql = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error(`selected migration is not valid UTF-8: ${item.filename}`);
    }
    assert(!sql.includes('\0'), `selected migration contains NUL bytes: ${item.filename}`);
    const trimmed = sql.trim();
    assert(/^begin\s*;/i.test(trimmed), `selected migration must start an explicit transaction: ${item.filename}`);
    assert(/commit\s*;\s*$/i.test(trimmed), `selected migration must end an explicit transaction: ${item.filename}`);

    migrations.push({
      version,
      name,
      filename: item.filename,
      purpose: String(item.purpose ?? '').trim() || null,
      sha256: sha256(bytes),
      sizeBytes: bytes.byteLength,
    });
  }

  migrations.sort((a, b) => a.version.localeCompare(b.version));
  const selection = immutableSelectionPayload({ targetSha, changeSet: config.changeSet, migrations });
  const selectionDigest = `sha256:${sha256(Buffer.from(JSON.stringify(selection)))}`;

  return {
    schema: MANIFEST_SCHEMA,
    evidenceItem: 'supabase-forward-reconciliation-manifest',
    generatedAt,
    targetSha,
    changeSet: config.changeSet,
    selectionDigest,
    migrations,
    checks: {
      exactShaBound: true,
      canonicalMigrationFilenames: true,
      uniqueMigrationVersions: true,
      selectedFilesPresent: true,
      transactionWrapped: true,
      productionWriteAuthorized: false,
      migrationHistoryRepairAuthorized: false,
      unrestrictedDbPushAuthorized: false,
    },
    truthBoundary: 'This manifest binds a small forward-only migration set to an exact Git SHA and file SHA-256 digests. It is non-crediting and does not classify historical migrations, authorize production writes, repair migration history, or permit unrestricted db push.',
  };
}

function validateCompiledManifest(manifest, expectedSha) {
  const targetSha = parseExpectedSha(expectedSha);
  assert(manifest?.schema === MANIFEST_SCHEMA, 'compiled manifest schema is invalid');
  assert(manifest?.targetSha === targetSha, 'compiled manifest target SHA mismatch');
  assert(typeof manifest?.selectionDigest === 'string' && /^sha256:[a-f0-9]{64}$/.test(manifest.selectionDigest), 'compiled manifest selection digest is invalid');
  assert(Array.isArray(manifest?.migrations) && manifest.migrations.length > 0 && manifest.migrations.length <= MAX_MIGRATIONS, 'compiled manifest migration count is invalid');
  const versions = new Set();
  const files = new Set();
  for (const migration of manifest.migrations) {
    assert(MIGRATION_FILE.test(String(migration?.filename ?? '')), 'compiled manifest contains an invalid migration filename');
    assert(/^\d{14}$/.test(String(migration?.version ?? '')), 'compiled manifest contains an invalid migration version');
    assert(/^[a-f0-9]{64}$/.test(String(migration?.sha256 ?? '')), 'compiled manifest contains an invalid migration digest');
    assert(!versions.has(migration.version), `compiled manifest contains duplicate version ${migration.version}`);
    assert(!files.has(migration.filename), `compiled manifest contains duplicate filename ${migration.filename}`);
    versions.add(migration.version);
    files.add(migration.filename);
  }
  const expectedSelection = immutableSelectionPayload({
    targetSha,
    changeSet: manifest.changeSet,
    migrations: manifest.migrations,
  });
  const expectedDigest = `sha256:${sha256(Buffer.from(JSON.stringify(expectedSelection)))}`;
  assert(manifest.selectionDigest === expectedDigest, 'compiled manifest selection digest does not match its contents');
  assert(manifest?.checks?.productionWriteAuthorized === false, 'compiled manifest must remain non-authorizing');
  assert(manifest?.checks?.migrationHistoryRepairAuthorized === false, 'compiled manifest must forbid history repair');
  assert(manifest?.checks?.unrestrictedDbPushAuthorized === false, 'compiled manifest must forbid unrestricted db push');
  return manifest;
}

function validateBackupEvidence(backup, expectedSha) {
  assert(backup?.schema === 'risck-comply.backup-restore-evidence.v2', 'backup/restore evidence schema is invalid');
  assert(backup?.evidenceItem === 'backup-restore-tested', 'backup/restore evidenceItem is invalid');
  assert(backup?.status === 'Complete' && backup?.outcome === 'passed', 'backup/restore evidence must be Complete/passed');
  assert(backup?.targetSha === expectedSha && backup?.observedSha === expectedSha, 'backup/restore exact-SHA binding is invalid');
  for (const check of ['backupExists', 'restoreExecuted', 'dataIntegrity', 'rlsAfterRestore', 'rlsPoliciesPresent', 'rpoMeasured', 'rtoMeasured', 'distinctDatabases', 'protectedMainExecution', 'exactShaBound']) {
    assert(backup?.checks?.[check] === true, `backup/restore check ${check} must pass`);
  }
  assert(backup?.evidenceIntegrity?.containsSensitiveValues === false, 'backup evidence sensitive-value assertion is missing');
  assert(backup?.evidenceIntegrity?.databaseUrlsStored === false, 'backup evidence must not store database URLs');
  assert(backup?.evidenceIntegrity?.dumpStored === false, 'backup evidence must not retain database dumps');
}

export function buildForwardReconciliationRehearsalAttestation({
  manifest,
  backupEvidence,
  expectedSha,
  repository,
  runId,
  postconditionsPassed,
  generatedAt = new Date().toISOString(),
}) {
  const targetSha = parseExpectedSha(expectedSha);
  validateCompiledManifest(manifest, targetSha);
  validateBackupEvidence(backupEvidence, targetSha);
  assert(String(repository ?? '').includes('/'), 'repository provenance is required');
  assert(/^\d+$/.test(String(runId ?? '')), 'workflow run ID must be numeric');
  assert(postconditionsPassed === true, 'selected migration postconditions must pass before attestation');

  return {
    schema: REHEARSAL_SCHEMA,
    evidenceItem: 'supabase-forward-reconciliation-rehearsal',
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    repository,
    runId: String(runId),
    targetSha,
    selectionDigest: manifest.selectionDigest,
    changeSet: manifest.changeSet,
    migrations: manifest.migrations.map(({ version, filename, sha256: digest }) => ({ version, filename, sha256: digest })),
    checks: {
      exactShaBound: true,
      selectedMigrationSetBound: true,
      productionSnapshotRestorePassed: true,
      selectedMigrationsAppliedToIsolatedTarget: true,
      migrationPostconditionsPassed: true,
      productionWritePerformed: false,
      migrationHistoryRepairPerformed: false,
      unrestrictedDbPushPerformed: false,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      databaseUrlsStored: false,
      databaseDumpStored: false,
      rowDataStored: false,
    },
    truthBoundary: 'This attestation proves only that the exact selected migration bytes were exercised successfully against an isolated restore of the production database and their postconditions passed. It does not authorize a production write or classify any migration outside the selected set.',
  };
}

export function validateForwardReconciliationRehearsal({ manifest, attestation, expectedSha }) {
  const targetSha = parseExpectedSha(expectedSha);
  validateCompiledManifest(manifest, targetSha);
  assert(attestation?.schema === REHEARSAL_SCHEMA, 'rehearsal attestation schema is invalid');
  assert(attestation?.status === 'Complete' && attestation?.outcome === 'passed', 'rehearsal attestation must be Complete/passed');
  assert(attestation?.targetSha === targetSha, 'rehearsal target SHA mismatch');
  assert(attestation?.selectionDigest === manifest.selectionDigest, 'rehearsal selection digest mismatch');
  assert(JSON.stringify(attestation?.migrations) === JSON.stringify(manifest.migrations.map(({ version, filename, sha256: digest }) => ({ version, filename, sha256: digest }))), 'rehearsal migration set mismatch');
  for (const check of ['exactShaBound', 'selectedMigrationSetBound', 'productionSnapshotRestorePassed', 'selectedMigrationsAppliedToIsolatedTarget', 'migrationPostconditionsPassed']) {
    assert(attestation?.checks?.[check] === true, `rehearsal check ${check} must pass`);
  }
  assert(attestation?.checks?.productionWritePerformed === false, 'rehearsal must not claim a production write');
  assert(attestation?.checks?.migrationHistoryRepairPerformed === false, 'rehearsal must not repair migration history');
  assert(attestation?.checks?.unrestrictedDbPushPerformed === false, 'rehearsal must not use unrestricted db push');
  assert(attestation?.evidenceIntegrity?.containsSensitiveValues === false, 'rehearsal sensitive-value assertion is missing');
  return true;
}

function normalizeVersionArray(values, label) {
  assert(Array.isArray(values), `${label} must be an array`);
  const normalized = values.map((value) => String(value ?? '').trim());
  for (const value of normalized) assert(/^\d{14}$/.test(value), `${label} contains invalid migration version ${value}`);
  assert(new Set(normalized).size === normalized.length, `${label} contains duplicate migration versions`);
  return normalized.sort();
}

export async function readMigrationVersionsFromDirectory(migrationsDir) {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const versions = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.sql')) continue;
    const match = entry.name.match(MIGRATION_FILE);
    assert(match, `filtered workdir contains noncanonical migration file ${entry.name}`);
    versions.push(match[1]);
  }
  return normalizeVersionArray(versions, 'local migration versions');
}

export function verifyFilteredMigrationSet({ manifest, expectedSha, remoteVersions, localVersions }) {
  const targetSha = parseExpectedSha(expectedSha);
  validateCompiledManifest(manifest, targetSha);
  const remote = normalizeVersionArray(remoteVersions, 'remote migration versions');
  const local = normalizeVersionArray(localVersions, 'local migration versions');
  const selected = normalizeVersionArray(manifest.migrations.map((migration) => migration.version), 'selected migration versions');
  const remoteSet = new Set(remote);
  const localSet = new Set(local);

  for (const version of selected) assert(!remoteSet.has(version), `selected migration is already present in remote history: ${version}`);
  for (const version of remote) assert(localSet.has(version), `filtered workdir is missing remote migration version ${version}`);

  const expectedLocal = new Set([...remote, ...selected]);
  assert(local.length === expectedLocal.size, 'filtered workdir migration count does not equal remote plus selected migrations');
  for (const version of local) assert(expectedLocal.has(version), `filtered workdir contains unauthorized pending migration ${version}`);

  const pending = local.filter((version) => !remoteSet.has(version));
  assert(JSON.stringify(pending) === JSON.stringify(selected), 'filtered workdir pending set is not exactly the selected reconciliation set');

  return {
    schema: SET_PROOF_SCHEMA,
    status: 'PASS',
    outcome: 'passed',
    targetSha,
    selectionDigest: manifest.selectionDigest,
    remoteMigrationCount: remote.length,
    localMigrationCount: local.length,
    pendingMigrationCount: pending.length,
    pendingVersions: pending,
    checks: {
      remoteHistoryFullyRepresented: true,
      selectedMigrationsNotAlreadyApplied: true,
      pendingSetEqualsSelectedSet: true,
      unauthorizedPendingMigrations: false,
      migrationHistoryRepairRequired: false,
      includeAllRequired: false,
    },
    truthBoundary: 'PASS proves only that the temporary Supabase workdir contains every remote migration version plus exactly the selected forward reconciliation versions. It does not authorize or perform a production write.',
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function option(args, prefix) {
  const found = args.find((value) => value.startsWith(`${prefix}=`));
  return found ? found.slice(prefix.length + 1) : null;
}

async function cli(argv) {
  const [command, ...args] = argv;
  if (command === 'compile') {
    const [configPath, outputPath] = args;
    const expectedSha = option(args, '--expected-sha');
    assert(configPath && outputPath && expectedSha, 'compile requires config, output, and --expected-sha');
    const config = JSON.parse(await readFile(resolve(configPath), 'utf8'));
    const manifest = await compileForwardReconciliationManifest({
      config,
      rootDir: process.cwd(),
      subjectSha: expectedSha,
    });
    await writeJson(resolve(outputPath), manifest);
    return;
  }
  if (command === 'build-rehearsal-attestation') {
    const [manifestPath, backupPath, outputPath] = args;
    const expectedSha = option(args, '--expected-sha');
    const repository = option(args, '--repository');
    const runId = option(args, '--run-id');
    const postconditions = option(args, '--postconditions');
    assert(manifestPath && backupPath && outputPath && expectedSha && repository && runId, 'build-rehearsal-attestation requires manifest, backup evidence, output, expected SHA, repository, and run ID');
    const manifest = await readJson(resolve(manifestPath));
    const backupEvidence = await readJson(resolve(backupPath));
    const attestation = buildForwardReconciliationRehearsalAttestation({
      manifest,
      backupEvidence,
      expectedSha,
      repository,
      runId,
      postconditionsPassed: postconditions === 'true',
    });
    await writeJson(resolve(outputPath), attestation);
    return;
  }
  if (command === 'validate-rehearsal') {
    const [manifestPath, rehearsalPath] = args;
    const expectedSha = option(args, '--expected-sha');
    assert(manifestPath && rehearsalPath && expectedSha, 'validate-rehearsal requires manifest, rehearsal evidence, and expected SHA');
    const manifest = await readJson(resolve(manifestPath));
    const rehearsal = await readJson(resolve(rehearsalPath));
    validateForwardReconciliationRehearsal({ manifest, attestation: rehearsal, expectedSha });
    return;
  }
  if (command === 'verify-filtered-set') {
    const [manifestPath, remotePath, migrationsDir, outputPath] = args;
    const expectedSha = option(args, '--expected-sha');
    assert(manifestPath && remotePath && migrationsDir && outputPath && expectedSha, 'verify-filtered-set requires manifest, remote evidence, migrations dir, output, and expected SHA');
    const manifest = await readJson(resolve(manifestPath));
    const remote = await readJson(resolve(remotePath));
    assert(remote?.schema === 'risck-comply.supabase-remote-migration-history.v1', 'remote migration history schema is invalid');
    assert(Array.isArray(remote?.versions), 'remote migration history versions are missing');
    const localVersions = await readMigrationVersionsFromDirectory(resolve(migrationsDir));
    const proof = verifyFilteredMigrationSet({ manifest, expectedSha, remoteVersions: remote.versions, localVersions });
    await writeJson(resolve(outputPath), proof);
    return;
  }
  throw new Error(`Unknown command: ${command ?? '<none>'}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  cli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
