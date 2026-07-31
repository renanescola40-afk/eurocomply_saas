import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  activeP0RuntimeEvidenceItems,
  p0EvidenceCatalog,
} from './p0-runtime-evidence-catalog.mjs';

const source = fs.readFileSync(
  new URL('./report-p0-runtime-evidence-gap.mjs', import.meta.url),
  'utf8',
);

describe('P0 runtime evidence gap report', () => {
  it('uses the canonical P0 runtime evidence catalog', () => {
    expect(source).toContain(
      "import { activeP0RuntimeEvidenceItems } from './p0-runtime-evidence-catalog.mjs';",
    );
    expect(source).toContain('activeP0RuntimeEvidenceItems({');
  });

  it('requires validator success before counting evidence as satisfied', () => {
    expect(source).toContain('validatorFailures.length === 0');
    expect(source).toContain('validatorFailures: evidence.validatorFailures');
    expect(source).toContain("return ['canonical validator is missing'];");
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
