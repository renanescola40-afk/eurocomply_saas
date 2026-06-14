#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function collectLatest(sectionName, section) {
  return Object.entries(section ?? {})
    .filter(([, version]) => version === 'latest')
    .map(([name, version]) => ({ section: sectionName, name, version }));
}

const packageJson = readJson('package.json');
const scripts = packageJson.scripts ?? {};
const requiredScripts = ['build', 'typecheck', 'test', 'security:ci', 'release:readiness'];
const missingScripts = requiredScripts.filter((name) => !scripts[name]);
const latestDependencies = [
  ...collectLatest('dependencies', packageJson.dependencies),
  ...collectLatest('devDependencies', packageJson.devDependencies),
];

const report = {
  generatedAt: new Date().toISOString(),
  packageName: packageJson.name ?? null,
  packageManager: packageJson.packageManager ?? null,
  lockfile: {
    present: existsSync('package-lock.json'),
    path: 'package-lock.json',
  },
  scripts: {
    required: requiredScripts,
    missing: missingScripts,
    ok: missingScripts.length === 0,
  },
  dependencies: {
    latestCount: latestDependencies.length,
    latest: latestDependencies,
    ok: latestDependencies.length === 0,
  },
  nextCommands: [
    'npm install --package-lock-only --ignore-scripts',
    'node scripts/dev/check-local-foundation.mjs',
    'npm run typecheck',
    'npm run test',
    'npm run build',
  ],
};

writeFileSync('phase1-status.json', `${JSON.stringify(report, null, 2)}\n`);

if (!report.lockfile.present || !report.scripts.ok || !report.dependencies.ok) {
  console.error('Phase 1 status has pending items. See phase1-status.json.');
  process.exit(1);
}

console.log('Phase 1 status passed.');
console.log('Report written to phase1-status.json');
