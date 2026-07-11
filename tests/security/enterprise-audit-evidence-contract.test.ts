import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checker = readFileSync('scripts/security/check-p0-runtime-evidence-files.mjs', 'utf8');
const evidence = JSON.parse(
  readFileSync('docs/security/evidence/runtime/enterprise-10-10-audit-2026-07-11.json', 'utf8'),
);

describe('enterprise audit runtime evidence contract', () => {
  it('registers the audit evidence type without treating it as completed runtime proof', () => {
    expect(checker).toContain("'enterprise-10-10-audit'");
    expect(checker).toMatch(/function checkEnterpriseAuditOpen(?:Evidence|Placeholder)\(/);
    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('no_go');
    expect(evidence.decision).toBe('No-Go');
    expect(evidence.evidenceIntegrity.placeholderOnly).toBe(true);
    expect(evidence.evidenceIntegrity.runtimeProofInvented).toBe(false);
    expect(evidence.evidenceIntegrity.customerFacingProof).toBe(false);
  });

  it('keeps the enterprise release explicitly blocked and redacted', () => {
    expect(evidence.releaseGate.toLowerCase()).toContain('blocked');
    expect(evidence.redactionConfirmation).toBe('Redaction confirmed for runtime evidence.');
    expect(evidence.evidenceIntegrity.containsSensitiveValues).toBe(false);
    expect(evidence.evidenceIntegrity.customerDataStored).toBe(false);
  });
});
