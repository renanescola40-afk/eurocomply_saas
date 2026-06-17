#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const strict = process.argv.includes('--strict');
const registerPath = path.join('docs', 'security', 'P0_RUNTIME_EVIDENCE_REGISTER.md');
const runtimeDir = path.join('docs', 'security', 'evidence', 'runtime');
const requiredRuntimeItems = [
  {
    label: 'Production secrets configured in provider secret stores',
    evidenceFile: 'production-secrets-provider-stores.json',
  },
  {
    label: 'Supabase live RLS validation completed',
    evidenceFile: 'supabase-live-rls-validation.json',
  },
  {
    label: 'External security review or pentest completed',
    evidenceFile: 'external-security-review-or-pentest.json',
  },
];

function fail(message) {
  console.error(`P0 runtime evidence gap report failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(registerPath)) {
  fail(`missing register: ${registerPath}`);
}

const register = fs.readFileSync(registerPath, 'utf8');
const rows = register
  .split('\n')
  .filter((line) => line.startsWith('|') && !line.includes('---'))
  .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean));

const statusByItem = new Map();
for (const row of rows) {
  const [item, status] = row;
  if (item && status && item !== 'Evidence item') {
    statusByItem.set(item.replace(/`/g, ''), status);
  }
}

const results = requiredRuntimeItems.map((item) => {
  const evidencePath = path.join(runtimeDir, item.evidenceFile);
  const status = statusByItem.get(item.label) || 'Missing from register';
  return {
    item: item.label,
    registerStatus: status,
    evidenceFile: evidencePath,
    evidenceFileExists: fs.existsSync(evidencePath),
    complete: status === 'Complete' && fs.existsSync(evidencePath),
  };
});

const complete = results.filter((entry) => entry.complete).length;
const total = results.length;
const missing = results.filter((entry) => !entry.complete);
const percentComplete = Math.round((complete / total) * 100);
const percentMissing = 100 - percentComplete;

const report = {
  p0RuntimeEvidenceGap: {
    complete,
    total,
    percentComplete,
    percentMissing,
  },
  missing: missing.map((entry) => ({
    item: entry.item,
    registerStatus: entry.registerStatus,
    evidenceFile: entry.evidenceFile,
    evidenceFileExists: entry.evidenceFileExists,
  })),
  results,
};

console.log(JSON.stringify(report, null, 2));

if (strict && missing.length > 0) {
  process.exit(1);
}
