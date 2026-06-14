#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

function collect(sectionName, values = {}) {
  return Object.entries(values).map(([name, version]) => ({
    section: sectionName,
    name,
    version,
    needsPin: version === 'latest',
  }));
}

const dependencies = [
  ...collect('dependencies', packageJson.dependencies),
  ...collect('devDependencies', packageJson.devDependencies),
];

const needsPin = dependencies.filter((item) => item.needsPin);

const report = {
  generatedAt: new Date().toISOString(),
  packageName: packageJson.name ?? null,
  packageManager: packageJson.packageManager ?? null,
  totalDependencies: dependencies.length,
  needsPinCount: needsPin.length,
  needsPin,
  recommendedNextSteps: [
    'Replace latest versions with explicit versions.',
    'Generate package-lock.json after dependency versions are fixed.',
    'Run npm ci after package-lock.json is committed.',
    'Run typecheck, tests, and build after npm ci succeeds.',
  ],
};

writeFileSync('dependency-pin-report.json', `${JSON.stringify(report, null, 2)}\n`);

if (needsPin.length > 0) {
  console.error(`Found ${needsPin.length} dependency version(s) using latest. See dependency-pin-report.json.`);
  process.exit(1);
}

console.log('Dependency pin report passed.');
console.log('Report written to dependency-pin-report.json');
