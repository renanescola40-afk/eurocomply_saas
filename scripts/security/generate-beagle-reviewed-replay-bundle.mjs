#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const baseReplayPath = join(root, 'scripts', 'recovery', 'run-ephemeral-project-schema-replay.mjs');
const reviewedBoundaryPath = join(root, 'scripts', 'recovery', 'run-reviewed-ephemeral-schema-boundary-v4.mjs');
const bundlePath = resolve(String(process.env.RECOVERY_BEAGLE_REPLAY_BUNDLE_PATH ?? '').trim());
const manifestPath = resolve(String(process.env.RECOVERY_BEAGLE_REPLAY_MANIFEST_PATH ?? '').trim());

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

if (process.env.GITHUB_ACTIONS !== 'true') {
  fail('Beagle replay bundle capture is restricted to GitHub Actions');
}
if (!process.env.RUNNER_TEMP) fail('RUNNER_TEMP is required');
if (!bundlePath || bundlePath === resolve('.')) fail('RECOVERY_BEAGLE_REPLAY_BUNDLE_PATH is required');
if (!manifestPath || manifestPath === resolve('.')) fail('RECOVERY_BEAGLE_REPLAY_MANIFEST_PATH is required');
if (!bundlePath.startsWith(resolve(process.env.RUNNER_TEMP))) {
  fail('Beagle replay bundle must remain under RUNNER_TEMP');
}
if (!manifestPath.startsWith(resolve(process.env.RUNNER_TEMP))) {
  fail('Beagle replay manifest must remain under RUNNER_TEMP');
}
if (!existsSync(baseReplayPath) || !existsSync(reviewedBoundaryPath)) {
  fail('Reviewed recovery replay sources are missing');
}

const originalBytes = readFileSync(baseReplayPath);
const originalSource = originalBytes.toString('utf8');
const marker = "    execFileSync(process.execPath, ['scripts/recovery/manage-ephemeral-recovery-database.mjs', 'start-project'], { stdio: 'inherit', env: process.env });";
const markerCount = originalSource.split(marker).length - 1;
if (markerCount !== 1) fail(`Expected exactly one replay start marker, found ${markerCount}`);

const injected = `${marker}\n\n    // Beagle pentest preparation: capture the exact reviewed disposable migration\n    // set only after the local replay succeeds. This block exists solely in the\n    // transient instrumented copy of this runner and is restored immediately.\n    {\n      const target = String(process.env.RECOVERY_BEAGLE_REPLAY_BUNDLE_PATH ?? '').trim();\n      if (!target) throw new Error('RECOVERY_BEAGLE_REPLAY_BUNDLE_PATH is required');\n      rmSync(target, { force: true });\n      appendFileSync(target, '-- RISCK COMPLY reviewed disposable schema replay bundle\\n', 'utf8');\n      appendFileSync(target, '-- Generated only after exact reviewed local replay succeeded. No seed/customer data.\\n', 'utf8');\n      for (const replayFile of migrationFiles(dir)) {\n        appendFileSync(target, '\\n-- BEGIN REVIEWED REPLAY FILE: ' + replayFile + '\\n', 'utf8');\n        appendFileSync(target, readFileSync(join(dir, replayFile)));\n        appendFileSync(target, '\\n-- END REVIEWED REPLAY FILE: ' + replayFile + '\\n', 'utf8');\n      }\n    }`;

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
    const restored = readFileSync(baseReplayPath);
    if (!restored.equals(originalBytes)) fail('Base replay runner restoration digest mismatch');
  } catch (error) {
    restoreError = error;
  }
}

if (restoreError) throw restoreError;
if (runError) throw runError;
if (!existsSync(bundlePath)) fail('Reviewed replay completed without producing a Beagle bundle');

const bundleBytes = readFileSync(bundlePath);
const bundleText = bundleBytes.toString('utf8');
const fileCount = (bundleText.match(/^-- BEGIN REVIEWED REPLAY FILE:/gm) ?? []).length;
if (fileCount < 1) fail('Beagle bundle contains no reviewed replay files');
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
  schema: 'risck-comply.beagle-reviewed-replay-bundle.v1',
  generatedAt: new Date().toISOString(),
  subjectSha,
  bundleSha256: sha256(bundleBytes),
  bundleBytes: bundleBytes.length,
  replayFileCount: fileCount,
  containsSeedData: false,
  containsProductionRows: false,
  productionWriteAuthorized: false,
  intendedTarget: 'isolated-beagle-pentest-supabase-only',
  canonicalMigrationHistory: false,
  sourceBoundary: 'scripts/recovery/run-reviewed-ephemeral-schema-boundary-v4.mjs',
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

process.stdout.write(`Beagle reviewed replay bundle captured: files=${fileCount} bytes=${bundleBytes.length} sha256=${manifest.bundleSha256}\n`);
process.stdout.write(`Exact subject SHA: ${subjectSha}\n`);
process.stdout.write('Production write authorization: false\n');
