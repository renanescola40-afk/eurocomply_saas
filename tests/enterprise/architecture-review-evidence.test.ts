import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildArchitectureReviewEvidence,
  scanArchitectureDecisions,
} from '../../scripts/enterprise/build-architecture-review-evidence.mjs';

const temporaryDirectories: string[] = [];
const SHA = 'a'.repeat(40);

function temporaryDecisionDirectory() {
  const root = mkdtempSync(join(tmpdir(), 'risck-adr-evidence-'));
  temporaryDirectories.push(root);
  const decisions = join(root, 'docs', 'decisions');
  mkdirSync(decisions, { recursive: true });
  return decisions;
}

function validDecision(number: number, status = 'Accepted') {
  const id = String(number).padStart(4, '0');
  return `# ADR-${id}: Example architecture decision ${id}

- Status: ${status}
- Date: 2026-07-15
- Scope: enterprise evidence

## Context

The service requires a durable architecture decision that explains the operational and security context for a material implementation choice. This record intentionally contains enough detail to remain useful during review, incident response, maintenance and future migration work.

## Decision

Use a small, testable and reversible implementation with explicit trust boundaries, exact-SHA evidence provenance, deterministic validation and fail-closed behavior whenever required inputs are unavailable or invalid.

## Impact

The implementation becomes reviewable and measurable without storing credentials, customer data, tokens, provider payloads or other access-granting values in the architecture record or generated evidence.

## Risks and trade-offs

The additional validation creates a small maintenance cost and can truthfully block completion when a decision record becomes malformed. That cost is preferred to silently accepting incomplete architecture documentation.

## Tests and evidence

Repository tests validate the decision contract. GitHub Actions remains authoritative for the exact reviewed commit and does not claim runtime provider behavior from repository documentation alone.

## Rollback

Revert the implementation and its decision record together. No customer-data rewrite, provider rollback or credential rotation is required for this documentation-only example.
`;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('architecture review evidence', () => {
  it('validates a reviewable ADR inventory and produces a stable digest', () => {
    const decisionsDir = temporaryDecisionDirectory();
    for (let index = 1; index <= 10; index += 1) {
      writeFileSync(join(decisionsDir, `ADR-${String(index).padStart(4, '0')}-decision-${index}.md`), validDecision(index));
    }

    const first = scanArchitectureDecisions({ decisionsDir, minimumDecisions: 10 });
    const second = scanArchitectureDecisions({ decisionsDir, minimumDecisions: 10 });

    expect(first.passed).toBe(true);
    expect(first.decisions).toHaveLength(10);
    expect(first.aggregateDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(second.aggregateDigest).toBe(first.aggregateDigest);
  });

  it('fails closed for malformed metadata, missing sections and duplicate ADR numbers', () => {
    const decisionsDir = temporaryDecisionDirectory();
    writeFileSync(join(decisionsDir, 'ADR-0001-first.md'), validDecision(1).replace('- Status: Accepted', '- Status: Unknown'));
    writeFileSync(join(decisionsDir, 'ADR-0001-duplicate.md'), validDecision(1).replace('## Rollback', '## Recovery'));

    const scan = scanArchitectureDecisions({ decisionsDir, minimumDecisions: 2 });

    expect(scan.passed).toBe(false);
    expect(scan.failures).toEqual(expect.arrayContaining([
      expect.stringContaining('invalid or missing Status'),
      expect.stringContaining('duplicates ADR number'),
      expect.stringContaining('missing section(s): Rollback'),
    ]));
  });

  it('marks evidence Complete only with trusted exact-SHA GitHub provenance', () => {
    const scan = {
      passed: true,
      failures: [],
      aggregateDigest: 'b'.repeat(64),
      decisions: Array.from({ length: 10 }, (_, index) => ({
        path: `docs/decisions/ADR-${String(index + 1).padStart(4, '0')}-example.md`,
        number: String(index + 1).padStart(4, '0'),
        status: 'Accepted',
        date: '2026-07-15',
        digest: 'c'.repeat(64),
        requiredSectionsPresent: true,
      })),
    };

    const evidence = buildArchitectureReviewEvidence({
      scan,
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'main',
      targetSha: SHA,
      observedSha: SHA,
      runId: '12345',
      githubActions: true,
    });

    expect(evidence.status).toBe('Complete');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.controlsVerified).toEqual(['Architecture decisions recorded']);
    expect(evidence.evidenceIntegrity.containsSensitiveValues).toBe(false);
    expect(evidence.decisionInventory).not.toHaveProperty('content');
  });

  it('keeps local or SHA-mismatched evidence Open', () => {
    const evidence = buildArchitectureReviewEvidence({
      scan: {
        passed: true,
        failures: [],
        aggregateDigest: 'd'.repeat(64),
        decisions: Array.from({ length: 10 }, (_, index) => ({
          path: `docs/decisions/ADR-${String(index + 1).padStart(4, '0')}-example.md`,
          number: String(index + 1).padStart(4, '0'),
          status: 'Proposed',
          date: '2026-07-15',
          digest: 'e'.repeat(64),
          requiredSectionsPresent: true,
        })),
      },
      repository: 'renanescola40-afk/eurocomply_saas',
      branch: 'agent/example',
      targetSha: SHA,
      observedSha: 'f'.repeat(40),
      runId: '',
      githubActions: false,
    });

    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('not_verified');
    expect(evidence.controlsVerified).toEqual([]);
    expect(evidence.failures).toEqual(expect.arrayContaining([
      'evidence must be generated by GitHub Actions',
      'checked-out SHA must equal targetSha',
      'runId must be numeric',
    ]));
  });
});
