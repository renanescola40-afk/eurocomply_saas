#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = ['docs/PHASE2_EXECUTION_PLAN.md', 'package.json'];
for (const file of requiredFiles) {
  if (!existsSync(file)) {
    console.error('Missing required file: ' + file);
    process.exit(1);
  }
}

const pkg = readFileSync('package.json', 'utf8');
const plan = readFileSync('docs/PHASE2_EXECUTION_PLAN.md', 'utf8');

for (const script of ['phase2:day1', 'phase2:ci', 'security:ci']) {
  if (!pkg.includes('"' + script + '"')) {
    console.error('Missing package script: ' + script);
    process.exit(1);
  }
}

for (const command of ['npm ci', 'npm run lint', 'npm run typecheck', 'npm run test', 'npm run build', 'npm run security:ci']) {
  if (!plan.includes(command)) {
    console.error('Missing Phase 2 plan command: ' + command);
    process.exit(1);
  }
}

console.log('Phase 2 plan is wired.');
