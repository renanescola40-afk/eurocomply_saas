#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

const evidencePath = 'docs/security/evidence/runtime/deployment-smoke-validation.json';

const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));

if (evidence.evidenceItem !== 'deployment-smoke-validation') {
  throw new Error(`Unexpected evidenceItem in ${evidencePath}: ${evidence.evidenceItem}`);
}

const targets = Array.isArray(evidence.targets) ? evidence.targets : [];

const passed = targets
  .filter((target) => target?.passed === true)
  .map((target) => target.baseUrl)
  .filter(Boolean);

const failed = targets
  .filter((target) => target?.passed !== true)
  .map((target) => target?.baseUrl || 'unknown-target')
  .filter(Boolean);

evidence.smokeTargets = { passed, failed };

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Normalized ${evidencePath}`);
