#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const packageJsonPath = join(root, 'package.json');
const lockfilePath = join(root, 'package-lock.json');

function fail(message) {
  console.error(`- ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`✓ ${message}`);
}

if (!existsSync(packageJsonPath)) {
  fail('package.json not found');
  process.exit();
}

const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const scripts = pkg.scripts ?? {};
const dependencies = pkg.dependencies ?? {};
const devDependencies = pkg.devDependencies ?? {};

const requiredScripts = [
  'build',
  'typecheck',
  'test',
  'security:ci',
  'release:readiness',
];

if (existsSync(lockfilePath)) {
  pass('package-lock.json found');
} else {
  fail('package-lock.json missing; run npm install --package-lock-only --ignore-scripts');
}

for (const script of requiredScripts) {
  if (typeof scripts[script] === 'string' && scripts[script].trim()) {
    pass(`script ${script} found`);
  } else {
    fail(`script ${script} missing`);
  }
}

const floating = [];
for (const [name, version] of Object.entries({ ...dependencies, ...devDependencies })) {
  if (version === 'latest') {
    floating.push(name);
  }
}

if (floating.length === 0) {
  pass('no dependencies use latest');
} else {
  fail(`dependencies using latest: ${floating.join(', ')}`);
}

if (process.exitCode) {
  console.error('\nLocal foundation check failed.');
} else {
  console.log('\nLocal foundation check passed.');
}
