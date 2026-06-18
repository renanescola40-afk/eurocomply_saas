#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const workflowPath = path.join('.github', 'workflows', 'p1-sbom-attestation.yml');
const requiredSnippets = [
  'attestations: write',
  'id-token: write',
  '@cyclonedx/cyclonedx-npm',
  'sbom.cdx.json',
  'actions/upload-artifact@v7',
  'p1-sbom-cyclonedx',
  'actions/attest-build-provenance@v3',
  'subject-path: sbom.cdx.json',
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

const forbiddenPatterns = [
  /VERCEL_TOKEN/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /STRIPE_SECRET_KEY/,
  /AUDIT_CHAIN_SIGNING_SECRET/,
];
for (const pattern of forbiddenPatterns) {
  if (pattern.test(workflow)) {
    fail(`workflow must not reference unrelated secret: ${pattern}`);
  }
}

console.log('[p1-sbom-workflow] workflow contract is valid');
