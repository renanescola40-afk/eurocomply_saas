#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const workflowPath = path.join('.github', 'workflows', 'p1-sbom-attestation.yml');
const pinnedActions = [
  'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
  'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a',
  'actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8',
];
const requiredSnippets = [
  'permissions:',
  'contents: read',
  'attestations: write',
  'id-token: write',
  'runs-on: ubuntu-24.04',
  '@cyclonedx/cyclonedx-npm@1.19.3',
  'sbom.cdx.json',
  'p1-sbom-cyclonedx',
  'subject-path: sbom.cdx.json',
  'npm ci --ignore-scripts',
  ...pinnedActions,
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

const floatingAction = /^\s*uses:\s+[^\s#]+@v\d+(?:\.\d+){0,2}\s*(?:#.*)?$/m;
if (floatingAction.test(workflow)) {
  fail('workflow actions must be pinned to immutable commit SHAs');
}

const actionUses = [...workflow.matchAll(/^\s*uses:\s+([^\s#]+)/gm)].map((match) => match[1]);
for (const action of actionUses) {
  const reference = action.split('@')[1] ?? '';
  if (!/^[a-f0-9]{40}$/.test(reference)) {
    fail(`action is not pinned to a full commit SHA: ${action}`);
  }
}

console.log('[p1-sbom-workflow] workflow contract is valid');
