#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const strict = process.argv.includes('--strict');
const registerPath = path.join('docs', 'security', 'P1_ENTERPRISE_SECURITY_REGISTER.md');
const allowedStatuses = new Set(['Open', 'In Progress', 'Complete', 'Exception']);
const satisfiedStatuses = new Set(['Complete', 'Exception']);
const requiredControls = [
  'SSO/SAML/OIDC',
  'MFA obrigatório para admins',
  'Step-up real para billing, exports, team management, GDPR delete',
  'Rate limit distribuído em todos endpoints sensíveis',
  'DAST automatizado',
  'SBOM + artifact attestation',
  'Backup/restore testado',
  'Logs centralizados e alertas',
  'Audit chain verificável em produção',
  'WAF/CDN/DDoS',
];

function fail(message) {
  console.error(`P1 enterprise security register check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(registerPath)) {
  fail(`missing register: ${registerPath}`);
}

const register = fs.readFileSync(registerPath, 'utf8');
const rows = register
  .split('\n')
  .filter((line) => line.startsWith('|') && !line.includes('---'))
  .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
  .filter((row) => row[0] && row[0] !== 'Control');

const controls = new Map();
for (const row of rows) {
  const [control, status, evidenceTarget] = row;
  if (!control || !status || !evidenceTarget) continue;
  controls.set(control.replace(/`/g, ''), {
    status: status.replace(/`/g, ''),
    evidenceTarget,
  });
}

for (const control of requiredControls) {
  if (!controls.has(control)) {
    fail(`missing required control: ${control}`);
  }
}

const invalid = [];
const missingEvidenceTarget = [];
const unsatisfied = [];

for (const [control, entry] of controls.entries()) {
  if (!allowedStatuses.has(entry.status)) {
    invalid.push(`${control}: ${entry.status}`);
  }

  if (!entry.evidenceTarget.includes('docs/security/evidence/p1/')) {
    missingEvidenceTarget.push(control);
  }

  if (!satisfiedStatuses.has(entry.status)) {
    unsatisfied.push(control);
  }
}

if (invalid.length > 0) {
  fail(`invalid statuses: ${invalid.join(', ')}`);
}

if (missingEvidenceTarget.length > 0) {
  fail(`missing P1 evidence target path for: ${missingEvidenceTarget.join(', ')}`);
}

const complete = controls.size - unsatisfied.length;
const total = controls.size;
const percentComplete = Math.round((complete / total) * 100);
const percentMissing = 100 - percentComplete;

const report = {
  p1EnterpriseSecurity: {
    complete,
    total,
    percentComplete,
    percentMissing,
  },
  unsatisfied,
};

console.log(JSON.stringify(report, null, 2));

if (strict && unsatisfied.length > 0) {
  process.exit(1);
}
