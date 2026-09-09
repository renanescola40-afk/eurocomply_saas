#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

const root = process.cwd();
const baseReplayPath = join(root, 'scripts', 'recovery', 'run-ephemeral-project-schema-replay.mjs');
const reviewedBoundaryPath = join(root, 'scripts', 'recovery', 'run-reviewed-ephemeral-schema-boundary-v4.mjs');
const bundlePath = resolve(String(process.env.RECOVERY_BEAGLE_REPLAY_BUNDLE_PATH ?? '').trim());
const manifestPath = resolve(String(process.env.RECOVERY_BEAGLE_REPLAY_MANIFEST_PATH ?? '').trim());
const runnerTemp = process.env.RUNNER_TEMP ? resolve(process.env.RUNNER_TEMP) : null;

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readRequiredFile(path, label) {
  try {
    return readFileSync(path);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`${label} is not readable: ${detail}`);
  }
}

function assertRunnerLocalPath(path, label) {
  if (!runnerTemp) fail('RUNNER_TEMP is required');
  const candidate = relative(runnerTemp, path);
  if (!candidate || candidate.startsWith('..') || isAbsolute(candidate)) {
    fail(`${label} must remain under RUNNER_TEMP`);
  }
}

function isSeedReplayFileName(name) {
  return /(?:^|_)seed(?:_|\.|$)/i.test(name);
}

if (process.env.GITHUB_ACTIONS !== 'true') {
  fail('Beagle replay bundle capture is restricted to GitHub Actions');
}
if (!runnerTemp) fail('RUNNER_TEMP is required');
if (!bundlePath || bundlePath === resolve('.')) fail('RECOVERY_BEAGLE_REPLAY_BUNDLE_PATH is required');
if (!manifestPath || manifestPath === resolve('.')) fail('RECOVERY_BEAGLE_REPLAY_MANIFEST_PATH is required');
assertRunnerLocalPath(bundlePath, 'Beagle replay bundle');
assertRunnerLocalPath(manifestPath, 'Beagle replay manifest');

const originalBytes = readRequiredFile(baseReplayPath, 'Base replay runner');
readRequiredFile(reviewedBoundaryPath, 'Reviewed recovery replay boundary');
const originalSource = originalBytes.toString('utf8');
const marker = "    execFileSync(process.execPath, ['scripts/recovery/manage-ephemeral-recovery-database.mjs', 'start-project'], { stdio: 'inherit', env: process.env });";
const markerCount = originalSource.split(marker).length - 1;
if (markerCount !== 1) fail(`Expected exactly one replay start marker, found ${markerCount}`);

const injected = `${marker}\n\n    // Beagle pentest preparation: capture only the reviewed disposable schema\n    // migration set after the local replay succeeds. Seed migrations are\n    // explicitly excluded from the transient bundle and never uploaded.\n    {\n      const target = String(process.env.RECOVERY_BEAGLE_REPLAY_BUNDLE_PATH ?? '').trim();\n      if (!target) throw new Error('RECOVERY_BEAGLE_REPLAY_BUNDLE_PATH is required');\n      const seedReplayNamePattern = /(?:^|_)seed(?:_|\\.|$)/i;\n      let excludedSeedReplayFileCount = 0;\n      rmSync(target, { force: true });\n      appendFileSync(target, '-- RISCK COMPLY reviewed disposable schema replay bundle\\n', 'utf8');\n      appendFileSync(target, '-- Generated only after exact reviewed local replay succeeded. Seed/customer data excluded.\\n', 'utf8');\n      for (const replayFile of migrationFiles(dir)) {\n        if (seedReplayNamePattern.test(replayFile)) {\n          excludedSeedReplayFileCount += 1;\n          continue;\n        }\n        appendFileSync(target, '\\n-- BEGIN REVIEWED REPLAY FILE: ' + replayFile + '\\n', 'utf8');\n        appendFileSync(target, readFileSync(join(dir, replayFile)));\n        appendFileSync(target, '\\n-- END REVIEWED REPLAY FILE: ' + replayFile + '\\n', 'utf8');\n      }\n      appendFileSync(target, '\\n-- BEAGLE EXCLUDED SEED REPLAY FILE COUNT: ' + excludedSeedReplayFileCount + '\\n', 'utf8');\n    }`;

const instrumented = originalSource.replace(marker, injected);
mkdirSync(dirname(bundlePath), { recursive: true });
mkdirSync(dirname(manifestPath), { recursive: true });

let runError = null;
let restoreError = null;
try {
  writeFileSync(baseReplayPath, instrumented, 'utf8');
  execFileSync(process.execPath, [reviewedBoundaryPath], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      RECOVERY_BEAGLE_REPLAY_BUNDLE_PATH: bundlePath,
    },
  });
} catch (error) {
  runError = error;
} finally {
  try {
    writeFileSync(baseReplayPath, originalBytes);
    const restored = readRequiredFile(baseReplayPath, 'Restored base replay runner');
    if (!restored.equals(originalBytes)) fail('Base replay runner restoration digest mismatch');
  } catch (error) {
    restoreError = error;
  }
}

if (restoreError) throw restoreError;
if (runError) throw runError;

const bundleBytes = readRequiredFile(bundlePath, 'Reviewed Beagle replay bundle');
const bundleText = bundleBytes.toString('utf8');
const replayFiles = [...bundleText.matchAll(/^-- BEGIN REVIEWED REPLAY FILE: ([^\r\n]+)$/gm)]
  .map((match) => match[1].trim());
const fileCount = replayFiles.length;
if (fileCount < 1) fail('Beagle bundle contains no reviewed replay files');

const excludedSeedMatch = bundleText.match(/^-- BEAGLE EXCLUDED SEED REPLAY FILE COUNT: (\d+)$/m);
if (!excludedSeedMatch) fail('Beagle bundle is missing its seed-exclusion evidence marker');
const excludedSeedReplayFileCount = Number(excludedSeedMatch[1]);
if (!Number.isSafeInteger(excludedSeedReplayFileCount) || excludedSeedReplayFileCount < 1) {
  fail('Beagle bundle did not prove exclusion of the reviewed seed migration');
}

const seedReplayFiles = replayFiles.filter(isSeedReplayFileName);
const seedSqlDetected = /\binsert\s+into\s+(?:public\.)?intelligence_items\b/i.test(bundleText);
const containsSeedData = seedReplayFiles.length > 0 || seedSqlDetected;
if (containsSeedData) {
  fail(`Seed data detected in Beagle schema-only bundle: files=${seedReplayFiles.join(',') || 'sql-content-indicator'}`);
}
if (/postgres(?:ql)?:\/\//i.test(bundleText)) fail('Database URL detected in Beagle replay bundle');
if (/SUPABASE_(?:SERVICE_ROLE_KEY|DB_PASSWORD)\s*=/i.test(bundleText)) {
  fail('Runtime credential assignment detected in Beagle replay bundle');
}

const subjectSha = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
if (!/^[a-f0-9]{40}$/.test(subjectSha)) fail('Unable to bind replay bundle to exact Git SHA');

const manifest = {
  schema: 'risck-comply.beagle-reviewed-replay-bundle.v2',
  generatedAt: new Date().toISOString(),
  subjectSha,
  bundleSha256: sha256(bundleBytes),
  bundleBytes: bundleBytes.length,
  replayFileCount: fileCount,
  containsSeedData,
  seedDetectionMode: 'derived-from-bundle-filenames-and-sql-content',
  seedReplayFiles,
  excludedSeedReplayFileCount,
  containsProductionRows: false,
  productionWriteAuthorized: false,
  intendedTarget: 'isolated-beagle-pentest-supabase-only',
  canonicalMigrationHistory: false,
  sourceBoundary: 'scripts/recovery/run-reviewed-ephemeral-schema-boundary-v4.mjs',
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

process.stdout.write(`Beagle reviewed replay bundle captured: files=${fileCount} bytes=${bundleBytes.length} sha256=${manifest.bundleSha256}\n`);
process.stdout.write(`Excluded seed replay files: ${excludedSeedReplayFileCount}\n`);
process.stdout.write(`Exact subject SHA: ${subjectSha}\n`);
process.stdout.write('Production write authorization: false\n');
