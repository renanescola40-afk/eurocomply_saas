#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const workflowPath = '.github/workflows/ci.yml';

if (!existsSync(workflowPath)) {
  console.error(`Missing CI workflow: ${workflowPath}`);
  process.exit(1);
}

const content = readFileSync(workflowPath, 'utf8');

const requiredSnippets = [
  'pull_request:',
  'push:',
  'main',
  'node-version: 20',
  'npm ci',
  'npm run typecheck',
  'npm run test',
  'npm run build',
];

const forbiddenSnippets = [
  'npm install',
];

const missing = requiredSnippets.filter((snippet) => !content.includes(snippet));
const forbidden = forbiddenSnippets.filter((snippet) => content.includes(snippet));

if (missing.length > 0 || forbidden.length > 0) {
  console.error('CI workflow does not satisfy Phase 2 requirements.');

  if (missing.length > 0) {
    console.error('\nMissing required snippets:');
    for (const snippet of missing) {
      console.error(`- ${snippet}`);
    }
  }

  if (forbidden.length > 0) {
    console.error('\nForbidden snippets found:');
    for (const snippet of forbidden) {
      console.error(`- ${snippet}`);
    }
  }

  process.exit(1);
}

console.log('Phase 2 CI/CD foundation check passed.');
