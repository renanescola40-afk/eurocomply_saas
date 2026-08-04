import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  activeP0RuntimeEvidenceItems,
  p0EvidenceCatalog,
} from './p0-runtime-evidence-catalog.mjs';

const reportSource = fs.readFileSync(
  new URL('./report-p0-runtime-evidence-gap.mjs', import.meta.url),
  'utf8',
);
const evaluatorSource = fs.readFileSync(
  new URL('./evaluate-p0-runtime-evidence.mjs', import.meta.url),
  'utf8',
);
const generatorSource = fs.readFileSync(
  new URL('./generate-p0-runtime-evidence-register.mjs', import.meta.url),
  'utf8',
);

describe('P0 runtime evidence gap report', () => {
  it('uses the shared canonical P0 runtime evaluator', () => {
    expect(reportSource).toContain(
      "import { evaluateP0RuntimeEvidence } from './evaluate-p0-runtime-evidence.mjs';",
    );
    expect(reportSource).toContain('requireRegisterStatus: false');
    expect(evaluatorSource).toContain(
      "import { activeP0RuntimeEvidenceItems } from './p0-runtime-evidence-catalog.mjs';",
    );
  });

  it('requires validator success before counting evidence as satisfied', () => {
    expect(evaluatorSource).toContain('validatorFailures.length === 0');
    expect(evaluatorSource).toContain('validatorFailures: evidence.validatorFailures');
    expect(evaluatorSource).toContain("return ['canonical validator is missing'];");
  });

  it('treats versioned Markdown status as advisory rather than proof', () => {
    expect(evaluatorSource).toContain('requireRegisterStatus = false');
    expect(evaluatorSource).toContain('derivedStatus = evidence.evidenceSatisfied');
    expect(evaluatorSource).toContain('registerDrift = registerStatus !== derivedStatus');
    expect(reportSource).toContain('registerAdvisoryOnly: true');
    expect(reportSource).toContain('legacy Markdown status, exceptions and placeholders do not pass');
  });

  it('generates an exact-SHA register from canonical evidence', () => {
    expect(generatorSource).toContain('risck-comply.p0-runtime-evidence-register.v1');
    expect(generatorSource).toContain('evaluateP0RuntimeEvidence({');
    expect(generatorSource).toContain('requireRegisterStatus: false');
    expect(generatorSource).toContain("decision = blocked === 0 ? 'GO' : 'NO_GO'");
  });

  it('includes Auth/RBAC as a required runtime control', () => {
    const authRbac = p0EvidenceCatalog.find(
      (entry) => entry.item === 'Auth/RBAC final runtime validation',
    );

    expect(authRbac).toBeDefined();
    expect(authRbac?.kind).toBe('runtime');
    expect(authRbac?.file).toBe('auth-rbac-final-validation.json');
    expect(typeof authRbac?.validator).toBe('function');
  });

  it('requires every active runtime control to have a file and validator', () => {
    const runtimeItems = activeP0RuntimeEvidenceItems();
    expect(runtimeItems.length).toBeGreaterThan(0);

    for (const entry of runtimeItems) {
      expect(entry.file).toMatch(/\.json$/);
      expect(typeof entry.validator).toBe('function');
    }
  });
});
