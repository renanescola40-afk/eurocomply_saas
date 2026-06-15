#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const declared = String(pkg.packageManager ?? '');
const match = declared.match(/^npm@(\d+)\.(\d+)\.(\d+)$/);

if (!match) {
  console.error('packageManager must be declared as npm@x.y.z in package.json.');
  process.exit(1);
}

const expectedMajor = Number(match[1]);
const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
const currentMajor = Number(npmVersion.split('.')[0]);

if (currentMajor !== expectedMajor) {
  console.error(`Expected npm major ${expectedMajor}, but found npm ${npmVersion}.`);
  console.error(`Install or activate ${declared} before running Phase 1.`);
  process.exit(1);
}

console.log(`Package manager check passed: ${declared} / current npm ${npmVersion}`);
