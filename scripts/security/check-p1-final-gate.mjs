import fs from 'node:fs';
import path from 'node:path';

const registerPath = path.join('docs', 'security', 'P1_ENTERPRISE_SECURITY_REGISTER.md');

const expected = [
  ['SSO/SAML/OIDC', 'docs/security/evidence/p1/sso-saml-oidc.json'],
  ['MFA obrigatório para admins', 'docs/security/evidence/p1/admin-mfa-required.json'],
  ['Step-up real para billing, exports, team management, GDPR delete', 'docs/security/evidence/p1/step-up-sensitive-actions.json'],
  ['Rate limit distribuído em todos endpoints sensíveis', 'docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.json'],
  ['DAST automatizado', 'docs/security/evidence/p1/dast-automated.json'],
  ['SBOM + artifact attestation', 'docs/security/evidence/p1/sbom-artifact-attestation.json'],
  ['Backup/restore testado', 'docs/security/evidence/p1/backup-restore-tested.json'],
  ['Logs centralizados e alertas', 'docs/security/evidence/p1/centralized-logs-alerts.json'],
  ['Audit chain verificável em produção', 'docs/security/evidence/p1/verifiable-production-audit-chain.json'],
  ['WAF/CDN/DDoS', 'docs/security/evidence/p1/waf-cdn-ddos.json'],
];

function fail(message) {
  console.error(`[p1-final-gate] ${message}`);
  process.exitCode = 1;
}

function parseRows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('|') && !line.includes('---'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 4 && cells[0] !== 'Control')
    .map(([control, status, evidence]) => ({
      control,
      status,
      evidence: evidence.replaceAll('`', '').trim(),
    }));
}

if (!fs.existsSync(registerPath)) {
  fail(`Missing register: ${registerPath}`);
  process.exit(process.exitCode ?? 0);
}

const rows = parseRows(fs.readFileSync(registerPath, 'utf8'));
const byControl = new Map(rows.map((row) => [row.control, row]));

for (const [control, evidencePath] of expected) {
  const row = byControl.get(control);
  if (!row) {
    fail(`Missing register row for ${control}`);
    continue;
  }

  if (row.evidence !== evidencePath) {
    fail(`${control} evidence target mismatch: expected ${evidencePath}, got ${row.evidence}`);
  }

  if (row.status === 'Complete' && !fs.existsSync(evidencePath)) {
    fail(`${control} is Complete but final evidence is missing: ${evidencePath}`);
  }

  console.log(`[p1-final-gate] ${control}: ${row.status}`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[p1-final-gate] Register paths are aligned and no Complete control is missing final evidence.');
