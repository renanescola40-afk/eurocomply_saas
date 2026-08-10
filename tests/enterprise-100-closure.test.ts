import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const originalSha = process.env.ENTERPRISE_CLOSURE_EXPECTED_SHA;
const TARGET_SHA = 'a'.repeat(40);

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.chdir(originalCwd);
  if (originalSha === undefined) delete process.env.ENTERPRISE_CLOSURE_EXPECTED_SHA;
  else process.env.ENTERPRISE_CLOSURE_EXPECTED_SHA = originalSha;
});

function evidenceRootAt(evidencePath: string, document: Record<string, unknown>) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'enterprise-100-evidence-'));
  const absolute = path.join(root, evidencePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(document, null, 2)}\n`);
  return root;
}

function evidenceRoot(document: Record<string, unknown>) {
  return evidenceRootAt('release-validation/proof.json', document);
}

const singleControlConfig = {
  requiredDecision: 'GO',
  controls: [
    {
      id: 'production-smoke',
      owner: 'sre',
      evidence: 'release-validation/proof.json',
      acceptedStatuses: ['PASS'],
    },
  ],
};

describe('enterprise 100 closure contract', () => {
  it('fails closed when no exact SHA or evidence is available', async () => {
    delete process.env.ENTERPRISE_CLOSURE_EXPECTED_SHA;
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');

    const result = evaluateEnterpriseClosure({
      expectedSha: null,
      config: {
        requiredDecision: 'GO',
        controls: [
          {
            id: 'production-smoke',
            owner: 'sre',
            evidence: 'release-validation/does-not-exist.json',
            acceptedStatuses: ['PASS'],
          },
        ],
      },
    });

    expect(result.passed).toBe(false);
    expect(result.decision).toBe('NO_GO');
    expect(result.blockers).toContain('exact_sha_unavailable');
    expect(result.blockers).toContain('production-smoke:evidence_missing');
  });

  it('does not accept evidence that is not bound to the promoted SHA', async () => {
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');
    const root = evidenceRoot({ status: 'PASS', releaseSha: 'b'.repeat(40) });

    const result = evaluateEnterpriseClosure({
      expectedSha: TARGET_SHA,
      config: singleControlConfig,
      evidenceRoots: [root],
    });

    expect(result.passed).toBe(false);
    expect(result.controls[0]?.accepted).toBe(false);
    expect(result.controls[0]?.reason).toBe('exact_sha_not_proven');
  });

  it('accepts exact-SHA evidence discovered through an isolated evidence root', async () => {
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');
    const root = evidenceRoot({
      status: 'PASS',
      releaseSha: TARGET_SHA,
      evidenceIntegrity: { containsSensitiveValues: false },
    });

    const result = evaluateEnterpriseClosure({
      expectedSha: TARGET_SHA,
      config: singleControlConfig,
      evidenceRoots: [root],
    });

    expect(result.passed).toBe(true);
    expect(result.decision).toBe('GO');
    expect(result.acceptedControls).toBe(1);
    expect(result.controls[0]?.shaMatches).toBe(true);
  });

  it('normalizes Complete plus passed runtime evidence to PASS', async () => {
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');
    const root = evidenceRoot({
      status: 'Complete',
      outcome: 'passed',
      releaseSha: TARGET_SHA,
      evidenceIntegrity: { containsSensitiveValues: false },
    });

    const result = evaluateEnterpriseClosure({
      expectedSha: TARGET_SHA,
      config: singleControlConfig,
      evidenceRoots: [root],
    });

    expect(result.passed).toBe(true);
    expect(result.controls[0]?.status).toBe('PASS');
  });

  it('does not convert Complete plus failed evidence into PASS', async () => {
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');
    const root = evidenceRoot({
      status: 'Complete',
      outcome: 'failed',
      releaseSha: TARGET_SHA,
    });

    const result = evaluateEnterpriseClosure({
      expectedSha: TARGET_SHA,
      config: singleControlConfig,
      evidenceRoots: [root],
    });

    expect(result.passed).toBe(false);
    expect(result.controls[0]?.status).toBe('COMPLETE');
    expect(result.controls[0]?.reason).toBe('status_not_accepted');
  });

  it('prioritizes an explicit final Go decision over generic Complete status', async () => {
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');
    const evidencePath = 'release-validation/final-go-no-go.json';
    const root = evidenceRootAt(evidencePath, {
      schema: 'risck-comply.release-go-no-go.v1',
      status: 'Complete',
      outcome: 'passed',
      finalDecision: 'Go',
      commitSha: TARGET_SHA,
      evidenceIntegrity: { containsSensitiveValues: false },
    });
    const config = {
      requiredDecision: 'GO',
      controls: [{
        id: 'final-go-no-go',
        owner: 'release',
        evidence: evidencePath,
        acceptedStatuses: ['GO', 'APPROVED'],
      }],
    };

    const result = evaluateEnterpriseClosure({ expectedSha: TARGET_SHA, config, evidenceRoots: [root] });

    expect(result.passed).toBe(true);
    expect(result.controls[0]?.status).toBe('GO');
  });

  it('accepts counsel publication only when publicationStatus and expectedSha are exact', async () => {
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');
    const evidencePath = 'artifacts/legal-review/final-legal-publication-gate.json';
    const root = evidenceRootAt(evidencePath, {
      schema: 'risck-comply.final-legal-publication-gate.v1',
      expectedSha: TARGET_SHA,
      publicationStatus: 'COUNSEL_ACCEPTED',
      accepted: true,
    });
    const config = {
      requiredDecision: 'GO',
      controls: [{
        id: 'legal-publication',
        owner: 'legal',
        evidence: evidencePath,
        acceptedStatuses: ['COUNSEL_ACCEPTED'],
      }],
    };

    const result = evaluateEnterpriseClosure({ expectedSha: TARGET_SHA, config, evidenceRoots: [root] });

    expect(result.passed).toBe(true);
    expect(result.controls[0]?.status).toBe('COUNSEL_ACCEPTED');
    expect(result.controls[0]?.sha).toBe(TARGET_SHA);
  });

  it('rejects exact-SHA evidence explicitly marked sensitive', async () => {
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');
    const root = evidenceRoot({
      status: 'PASS',
      releaseSha: TARGET_SHA,
      containsSensitiveValues: true,
    });

    const result = evaluateEnterpriseClosure({
      expectedSha: TARGET_SHA,
      config: singleControlConfig,
      evidenceRoots: [root],
    });

    expect(result.passed).toBe(false);
    expect(result.controls[0]?.reason).toBe('sensitive_evidence_rejected');
  });

  it('fails closed when two evidence roots disagree for the same exact SHA', async () => {
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');
    const first = evidenceRoot({ status: 'PASS', releaseSha: TARGET_SHA, probe: 'first' });
    const second = evidenceRoot({ status: 'PASS', releaseSha: TARGET_SHA, probe: 'second' });

    const result = evaluateEnterpriseClosure({
      expectedSha: TARGET_SHA,
      config: singleControlConfig,
      evidenceRoots: [first, second],
    });

    expect(result.passed).toBe(false);
    expect(result.controls[0]?.reason).toBe('ambiguous_exact_sha_evidence');
  });
});
