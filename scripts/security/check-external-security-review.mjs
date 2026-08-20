#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

import {
  resolveExternalAssuranceExpectedSha,
  validateExternalSecurityAssurance,
} from './external-security-assurance-contract.mjs';

const evidencePath = 'docs/security/evidence/runtime/external-security-review-or-pentest.json';
const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';

const requiredDocs = {
  'docs/security/PENTEST_SCOPE.md': [
    'auth',
    'RBAC',
    'tenant isolation',
    'APIs',
    'BOLA/IDOR',
    'uploads',
    'malware scanner',
    'billing Stripe',
    'webhooks',
    'audit chain',
    'exports',
    'GDPR delete',
    'rate limiting',
    'observability',
    'secrets',
  ],
  'docs/security/PRE_PENTEST_CHECKLIST.md': [
    'tenant A/B',
    'owner/admin/editor/viewer',
    'Stripe test mode',
    'Supabase test project',
    'upload scanner test mode',
    'seed data',
  ],
  'docs/security/PENTEST_FINDINGS_TRIAGE.md': [
    'Owner',
    'Severity',
    'Mitigation',
    'Due date',
    'critical/high',
    'formally accepted',
  ],
  'docs/security/PENTEST_RETEST_RECORD.md': [
    'Retest outcome',
    'Critical',
    'High',
    'retest evidence',
    'vendor retest',
  ],
};

const failures = [];

function readText(filePath) {
  if (!existsSync(filePath)) {
    failures.push(`${filePath} is missing`);
    return '';
  }
  return readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  const content = readText(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    failures.push(`${filePath} is invalid JSON: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function validateRequiredDocs() {
  for (const [filePath, tokens] of Object.entries(requiredDocs)) {
    const content = readText(filePath);
    if (!content) continue;
    for (const token of tokens) {
      if (!content.includes(token)) failures.push(`${filePath} missing required token: ${token}`);
    }
  }
}

function registerStatus(row) {
  const cells = row.split('|').map((cell) => cell.trim()).filter(Boolean);
  return cells[1] ?? '';
}

function validateRegister(evidence) {
  const register = readText(registerPath);
  if (!register) return;
  const row = register
    .split('\n')
    .find((line) => line.startsWith('| External security review or pentest completed |'));
  if (!row) {
    failures.push(`${registerPath} missing External security review or pentest row`);
    return;
  }
  if (!row.includes(evidencePath)) failures.push(`${registerPath} external review row must reference ${evidencePath}`);
  const p0Status = registerStatus(row);
  if (evidence?.status === 'Complete' && p0Status !== 'Complete') {
    failures.push(`${registerPath} external review row must be Complete when accepted external assurance evidence is Complete`);
  }
  if (evidence?.status !== 'Complete' && p0Status === 'Complete') {
    failures.push(`${registerPath} cannot mark external review Complete while ${evidencePath} is not Complete`);
  }
}

validateRequiredDocs();
const evidence = readJson(evidencePath);
validateRegister(evidence);

if (evidence) {
  const validation = validateExternalSecurityAssurance(evidence, {
    enterprise: true,
    expectedSha: resolveExternalAssuranceExpectedSha(process.cwd()),
    now: new Date(),
  });
  for (const failure of validation.failures) failures.push(`${evidencePath}:${failure}`);
  if (!validation.accepted) failures.push(`${evidencePath}:independent external assurance is not accepted`);
}

if (failures.length > 0) {
  console.error('External security review gate failed:');
  for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('External security review gate passed. Exact-SHA independent external assurance is attributable, authorized, integrity-bound, scoped, triaged, and High/Critical retest closure is evidenced.');
