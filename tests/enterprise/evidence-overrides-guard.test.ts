import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  APPROVED_EVIDENCE_OVERRIDES,
  validateEvidenceOverrides,
} from '../../scripts/enterprise/check-evidence-overrides.mjs';

const controls = JSON.parse(readFileSync('docs/enterprise/controls.json', 'utf8'));
const committedOverrides = JSON.parse(readFileSync('docs/enterprise/evidence-overrides.json', 'utf8'));

function clone<T>(value: T): T {
  return structuredClone(value);
}

describe('enterprise evidence override guard', () => {
  it('accepts only the committed approved control and evidence pairs', () => {
    expect(validateEvidenceOverrides(controls, committedOverrides)).toEqual([]);
    expect(Object.keys(APPROVED_EVIDENCE_OVERRIDES)).toEqual(['TRU-01', 'TRU-02', 'TRU-03']);
  });

  it('rejects an arbitrary repository JSON path', () => {
    const document = clone(committedOverrides);
    document.overrides[0].evidence.path = 'docs/security/evidence/runtime/final.json';

    expect(validateEvidenceOverrides(controls, document)).toContain(
      'TRU-01 evidence.path is not approved',
    );
  });

  it('rejects an unsupported or omitted exact-SHA check', () => {
    const unsupported = clone(committedOverrides);
    unsupported.overrides[0].evidence.check = 'build';
    expect(validateEvidenceOverrides(controls, unsupported)).toContain(
      'TRU-01 evidence.check is not approved',
    );

    const omitted = clone(committedOverrides);
    delete omitted.overrides[0].evidence.check;
    expect(validateEvidenceOverrides(controls, omitted)).toContain(
      'TRU-01 evidence fields must be exactly path and check',
    );
  });

  it('rejects added, removed, duplicate, unknown, or policy-changing entries', () => {
    const added = clone(committedOverrides);
    added.overrides.push({
      controlId: 'REL-01',
      evidence: { path: 'artifacts/trust-claims/trust-claims-validation.json', check: 'publicClaims' },
    });
    expect(validateEvidenceOverrides(controls, added)).toEqual(
      expect.arrayContaining([
        'evidence overrides must contain exactly 3 approved entries',
        'evidence override is not approved: REL-01',
      ]),
    );

    const removed = clone(committedOverrides);
    removed.overrides = removed.overrides.filter((entry: { controlId: string }) => entry.controlId !== 'TRU-03');
    expect(validateEvidenceOverrides(controls, removed)).toEqual(
      expect.arrayContaining([
        'evidence overrides must contain exactly 3 approved entries',
        'approved evidence override is missing: TRU-03',
      ]),
    );

    const duplicate = clone(committedOverrides);
    duplicate.overrides[2].controlId = 'TRU-02';
    expect(validateEvidenceOverrides(controls, duplicate)).toContain('duplicate evidence override: TRU-02');

    const policyChanging = clone(committedOverrides);
    policyChanging.overrides[0].critical = false;
    expect(validateEvidenceOverrides(controls, policyChanging)).toContain(
      'each evidence override must contain exactly controlId and evidence',
    );
  });
});
