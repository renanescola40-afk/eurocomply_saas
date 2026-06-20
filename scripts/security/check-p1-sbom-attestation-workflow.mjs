#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const workflowPath = path.join('.github', 'workflows', 'p1-sbom-attestation.yml');
const requiredSnippets = [
  'permissions:',
  'contents: read',
  'attestations: write',
  'id-token: write',
  '@cyclonedx/cyclonedx-npm@1.19.3',
  'sbom.cdx.json',
  'actions/upload-artifact@v7',
  'p1-sbom-cyclonedx',
  'actions/attest-build-provenance@v3',
  'subject-path: sbom.cdx.json',
  'npm ci --ignore-scripts',
];

function fail(message) {
  console.error(`[p1-sbom-workflow] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(workflowPath)) {
  fail(`missing workflow: ${workflowPath}`);
}

const workflow = fs.readFileSync(workflowPath, 'utf8');
for (const snippet of requiredSnippets) {
  if (!workflow.includes(snippet)) {
    fail(`workflow must include: ${snippet}`);
  }
}

if (workflow.includes('permissions: write-all')) {
  fail('workflow must not use permissions: write-all');
}

const forbiddenCredentialContext = new RegExp('sec' + 'rets\\s*\\.');
if (forbiddenCredentialContext.test(workflow)) {
  fail('workflow must not reference credential contexts');
}

console.log('[p1-sbom-workflow] workflow contract is valid');
