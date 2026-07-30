import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  activeP0RuntimeEvidenceItems,
  p0EvidenceCatalog,
  p0RegisterRequiredItems,
} from './p0-runtime-evidence-catalog.mjs';

const registerCheckerSource = readFileSync(
  new URL('./check-p0-runtime-evidence-register.mjs', import.meta.url),
  'utf8',
);
const gapReportSource = readFileSync(
  new URL('./report-p0-runtime-evidence-gap.mjs', import.meta.url),
  'utf8',
);

describe('canonical P0 runtime evidence catalog', () => {
  it('defines exactly the 16 controls in the P0 register', () => {
    expect(p0EvidenceCatalog).toHaveLength(16);
    expect(p0RegisterRequiredItems).toHaveLength(16);
    expect(new Set(p0RegisterRequiredItems).size).toBe(16);
  });

  it('defines 14 runtime controls and two repository controls', () => {
    const runtimeItems = p0EvidenceCatalog.filter((entry) => entry.kind === 'runtime');
    const repositoryItems = p0EvidenceCatalog.filter((entry) => entry.kind === 'repository');

    expect(runtimeItems).toHaveLength(14);
    expect(repositoryItems.map((entry) => entry.item)).toEqual([
      'Deterministic npm lockfile committed',
      'Floating dependency specs removed',
    ]);
  });

  it('omits only the final runner while final validation is already in progress', () => {
    expect(activeP0RuntimeEvidenceItems()).toHaveLength(14);
    const duringFinalValidation = activeP0RuntimeEvidenceItems({
      finalValidationInProgress: true,
    });

    expect(duringFinalValidation).toHaveLength(13);
    expect(
      duringFinalValidation.some((entry) => entry.item === 'Final validation runner'),
    ).toBe(false);
  });

  it('binds every runtime control to reviewable evidence and a validator', () => {
    for (const entry of activeP0RuntimeEvidenceItems()) {
      expect(entry.file).toMatch(/^[a-z0-9-]+\.json$/);
      expect(typeof entry.validator).toBe('function');
    }
  });

  it('keeps Auth/RBAC inside the strict release inventory', () => {
    const authRbac = activeP0RuntimeEvidenceItems().find(
      (entry) => entry.item === 'Auth/RBAC final runtime validation',
    );

    expect(authRbac).toMatchObject({
      kind: 'runtime',
      file: 'auth-rbac-final-validation.json',
    });
    expect(typeof authRbac?.validator).toBe('function');
  });

  it('is consumed by both register and runtime gap gates', () => {
    expect(registerCheckerSource).toContain(
      "import { p0RegisterRequiredItems } from './p0-runtime-evidence-catalog.mjs';",
    );
    expect(registerCheckerSource).toContain('const requiredItems = p0RegisterRequiredItems;');
    expect(gapReportSource).toContain(
      "import { activeP0RuntimeEvidenceItems } from './p0-runtime-evidence-catalog.mjs';",
    );
    expect(gapReportSource).toContain('const requiredRuntimeItems = activeP0RuntimeEvidenceItems({');
  });
});
