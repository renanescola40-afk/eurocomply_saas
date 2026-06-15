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
  'npm ci',
  'npm run typecheck',
  'npm run test',
  'npm run build',
];

const missing = requiredSnippets.filter((snippet) => !content.includes(snippet));

if (missing.length > 0) {
  console.error('CI workflow is missing required Phase 2 snippets:');
  for (const snippet of missing) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

console.log('Phase 2 CI/CD foundation check passed.');
