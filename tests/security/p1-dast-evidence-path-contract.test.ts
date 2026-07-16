import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const canonicalPath = 'docs/security/evidence/p1/dast-automated.json';

describe('P1 DAST evidence path contract', () => {
  it('uses the canonical evidence path in the register, index and final gate', () => {
    const register = fs.readFileSync('docs/security/P1_ENTERPRISE_SECURITY_REGISTER.md', 'utf8');
    const index = JSON.parse(fs.readFileSync('docs/security/evidence/p1/P1_EVIDENCE_INDEX.json', 'utf8')) as {
      controls: Array<{ controlId: string; evidencePath: string }>;
    };
    const finalGate = fs.readFileSync('scripts/security/check-p1-final-gate.mjs', 'utf8');

    expect(register).toContain(`| DAST automatizado | Open | \\`${canonicalPath}\\``);
    expect(index.controls.find((control) => control.controlId === 'P1-05')?.evidencePath).toBe(canonicalPath);
    expect(finalGate).toContain(`['DAST automatizado', '${canonicalPath}']`);
    expect(register).not.toContain('docs/security/evidence/p1/automated-dast.json');
  });
});
