import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  selectExactArtifact,
  validateSanitizedProof,
  validateSourceRun,
} from '../../scripts/enterprise/fetch-stripe-entitlement-runtime-proof.mjs';

const workflow = readFileSync('.github/workflows/stripe-runtime-evidence-promotion.yml', 'utf8');
const promoter = readFileSync('scripts/release/promote-stripe-runtime-evidence.mjs', 'utf8');
const sha = 'a'.repeat(40);

function sourceRun(overrides = {}) {
  return {
    id: 12345,
    path: '.github/workflows/stripe-entitlement-runtime-proof.yml',
    head_sha: sha,
    head_branch: 'main',
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    ...overrides,
  };
}

function proof() {
  return {
    evidence: {
      releaseSha: sha,
      stripeTestModeConfirmed: true,
      containsSensitiveValues: false,
      catalogSha256: 'b'.repeat(64),
      checks: {
        eventProcessed: true,
        snapshotObserved: true,
        policyObserved: true,
        limitsMatch: true,
        reconciliationObserved: true,
        rawEvidenceDeleted: true,
        replaySafe: false,
      },
    },
    replay: {
      sameEventId: true,
      firstDelivery: { processed: true },
      secondDelivery: { duplicate: true },
      before: {
        snapshotCount: 1,
        policyVersion: 7,
        seatLimits: { full: 5, participant: 10, viewer: 20 },
        reconciliationCount: 1,
      },
      after: {
        snapshotCount: 1,
        policyVersion: 7,
        seatLimits: { full: 5, participant: 10, viewer: 20 },
        reconciliationCount: 1,
      },
    },
  };
}

describe('automatic Stripe runtime evidence promotion', () => {
  it('is triggered only from the successful protected runtime-proof producer or explicit recovery dispatch', () => {
    expect(workflow).toContain('workflow_run:');
    expect(workflow).toContain('Stripe Entitlement Runtime Proof');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(workflow).toContain("github.event.workflow_run.event == 'workflow_dispatch'");
    expect(workflow).toContain('PROMOTE_STRIPE_RUNTIME_EVIDENCE');
  });

  it('rejects source-run identity drift', () => {
    expect(validateSourceRun(sourceRun(), { targetSha: sha, sourceRunId: '12345' }).failures).toEqual([]);
    expect(validateSourceRun(sourceRun({ path: '.github/workflows/other.yml' }), { targetSha: sha, sourceRunId: '12345' }).passed).toBe(false);
    expect(validateSourceRun(sourceRun({ head_sha: 'c'.repeat(40) }), { targetSha: sha, sourceRunId: '12345' }).passed).toBe(false);
    expect(validateSourceRun(sourceRun({ conclusion: 'failure' }), { targetSha: sha, sourceRunId: '12345' }).passed).toBe(false);
  });

  it('requires exactly one non-expired exact-SHA source artifact', () => {
    const expected = { id: 1, name: `stripe-entitlement-runtime-proof-${sha}`, expired: false };
    expect(selectExactArtifact([expected], sha)).toEqual(expected);
    expect(selectExactArtifact([expected, { ...expected, id: 2 }], sha)).toBeNull();
    expect(selectExactArtifact([{ ...expected, expired: true }], sha)).toBeNull();
  });

  it('treats replay.json as the authoritative replay proof instead of the source evidence placeholder', () => {
    const { evidence, replay } = proof();
    expect(evidence.checks.replaySafe).toBe(false);
    expect(validateSanitizedProof(evidence, replay, sha).failures).toEqual([]);

    const unsafe = proof();
    unsafe.replay.secondDelivery.duplicate = false;
    const failures = validateSanitizedProof(unsafe.evidence, unsafe.replay, sha).failures;
    expect(failures).toContain('replay_second_delivery_not_duplicate');
    expect(failures).not.toContain('evidence_check_replaySafe_failed');

    expect(promoter).toContain('const replay = JSON.parse');
    expect(promoter).toContain('const replaySafetyObserved = replay?.sameEventId === true');
    expect(promoter).toContain("throw new Error('Runtime replay evidence did not prove idempotency')");
    expect(promoter).toContain('sourceReplayDigest');
  });

  it('uses exact immutable GitHub actions and no artifact-download action dependency', () => {
    expect(workflow).toContain('actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0');
    expect(workflow).toContain('actions/setup-node@820762786026740c76f36085b0efc47a31fe5020');
    expect(workflow).toContain('actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
    expect(workflow).not.toContain('actions/download-artifact@');
    expect(workflow).not.toMatch(/actions\/(checkout|setup-node|upload-artifact)@v\d/);
  });
});
