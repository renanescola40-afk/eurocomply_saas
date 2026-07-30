import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildSafeRuntimeEvidence } from '../../scripts/compliance/generate-eu-ai-act-safe-runtime-bundle.mjs';
import {
  generateCoverage,
  validateLegalRulesRuntimeEvidenceDocument,
  validateRuntimeEvidenceDocument,
} from '../../scripts/compliance/generate-eu-ai-act-product-coverage.mjs';

const SHA = 'a'.repeat(40);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function withDigest(document) {
  return {
    ...document,
    artifactSha256: createHash('sha256').update(JSON.stringify(stable(document))).digest('hex'),
  };
}

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

  it('accepts deployed legal-rules proof only after full integrity validation', () => {
    const base = {
      schema: 'risck-comply.legal-rules-runtime-evidence.v1',
      repository: REPOSITORY,
      environment: 'preview',
      deploymentUrl: 'https://example.vercel.app',
      deploymentSha: SHA,
      legalRulesVersion: '2026-07-30.1',
      sourceRegulations: ['Regulation (EU) 2024/1689', 'Regulation (EU) 2026/1744'],
      effectiveDate: '2026-07-27',
      effectiveDateMeaning: 'entry into force',
      rulesDigest: 'b'.repeat(64),
      testCases: Array.from({ length: 8 }, (_, index) => ({
        id: `case-${index}`,
        description: 'runtime case',
        expected: true,
        actual: true,
        status: 'PASS',
      })),
      status: 'PASS',
      timestamp: '2026-07-30T12:00:00.000Z',
      requestIds: ['runtime-request-12345678'],
      evidenceBoundary: 'deployed exact-SHA behaviour only',
    };
    const valid = withDigest(base);

    expect(validateLegalRulesRuntimeEvidenceDocument(valid, SHA)).toBe(true);
    expect(validateRuntimeEvidenceDocument(valid, SHA)).toBe(true);
    expect(validateLegalRulesRuntimeEvidenceDocument({ ...valid, deploymentSha: 'c'.repeat(40) }, SHA)).toBe(false);
    expect(validateLegalRulesRuntimeEvidenceDocument({ ...valid, status: 'NOT_EXECUTED' }, SHA)).toBe(false);
    expect(validateLegalRulesRuntimeEvidenceDocument({ ...valid, artifactSha256: '0'.repeat(64) }, SHA)).toBe(false);
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
