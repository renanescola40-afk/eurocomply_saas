import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildSafeRuntimeEvidence } from '../../scripts/compliance/generate-eu-ai-act-safe-runtime-bundle.mjs';
import { generateCoverage, validateRuntimeEvidenceDocument } from '../../scripts/compliance/generate-eu-ai-act-product-coverage.mjs';

const SHA = 'a'.repeat(40);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

function minimalRegistry(runtimePath) {
  return {
    schema: 'risck-comply.eu-ai-act-product-coverage-registry.v1',
    totalWeight: 100,
    workstreams: [{
      id: 'SAFE-PROOF', name: 'Safe proof', weight: 100,
      implementationEvidence: [], testEvidence: [], runtimeEvidence: [runtimePath], humanReviewEvidence: [],
    }],
  };
}

describe('EU AI Act safe runtime promotion', () => {
  it('generates twelve isolated exact-SHA evidence documents', () => {
    const evidence = buildSafeRuntimeEvidence({ targetSha: SHA, runId: '12345', repository: REPOSITORY });
    expect(evidence).toHaveLength(12);
    expect(new Set(evidence.map((item) => item.document.workstreamId)).size).toBe(12);
    for (const item of evidence) {
      expect(item.document.targetSha).toBe(SHA);
      expect(item.document.status).toBe('VERIFIED');
      expect(item.document.syntheticData).toBe(true);
      expect(item.document.limitations.length).toBeGreaterThan(0);
    }
  });

  it('accepts a valid artifact overlay without writing evidence into the repository', () => {
    const root = mkdtempSync(join(tmpdir(), 'eu-ai-act-runtime-'));
    const path = 'docs/security/evidence/runtime/example.json';
    const output = join(root, path);
    mkdirSync(dirname(output), { recursive: true });
    const document = {
      schema: 'risck-comply.eu-ai-act-runtime-evidence.v1', repository: REPOSITORY,
      targetSha: SHA, status: 'VERIFIED', syntheticData: true,
      limitations: ['isolated proof only'],
    };
    writeFileSync(output, JSON.stringify(document));
    const report = generateCoverage({ registry: minimalRegistry(path), targetSha: SHA, evidenceRoots: [root] });
    expect(report.scores.runtimeEvidenceCoverage).toBe(100);
  });

  it('rejects stale, cross-repository, malformed and unqualified runtime evidence', () => {
    const valid = {
      schema: 'risck-comply.eu-ai-act-runtime-evidence.v1', repository: REPOSITORY,
      targetSha: SHA, status: 'VERIFIED', syntheticData: true, limitations: ['isolated proof only'],
    };
    expect(validateRuntimeEvidenceDocument(valid, SHA)).toBe(true);
    expect(validateRuntimeEvidenceDocument({ ...valid, targetSha: 'b'.repeat(40) }, SHA)).toBe(false);
    expect(validateRuntimeEvidenceDocument({ ...valid, repository: 'other/repo' }, SHA)).toBe(false);
    expect(validateRuntimeEvidenceDocument({ ...valid, status: 'PENDING' }, SHA)).toBe(false);
    expect(validateRuntimeEvidenceDocument({ ...valid, syntheticData: false }, SHA)).toBe(false);
    expect(validateRuntimeEvidenceDocument({ ...valid, limitations: [] }, SHA)).toBe(false);
  });
});
