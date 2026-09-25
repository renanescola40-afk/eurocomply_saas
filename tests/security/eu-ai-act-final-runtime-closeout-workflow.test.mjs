import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/eu-ai-act-final-runtime-closeout.yml', 'utf8');
const platformProof = readFileSync('scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs', 'utf8');
const prPlatformProof = readFileSync('scripts/compliance/build-platform-controls-runtime-proof.mjs', 'utf8');

describe('EU AI Act final runtime closeout workflow', () => {
  it('uses read-only permissions and immutable action pins', () => {
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0');
    expect(workflow).toContain('actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
  });

  it('requires exact-SHA checkout and strict closeout outside pull requests', () => {
    expect(workflow).toContain('Verify exact assessed checkout');
    expect(workflow).toContain("STRICT_CLOSEOUT: ${{ github.event_name == 'pull_request' && '0' || '1' }}");
    expect(workflow).toContain('strict runtime closeout requires 100%');
  });

  it('promotes safe and final evidence roots with the generator delimiter contract', () => {
    expect(workflow).toContain('EU_AI_ACT_RUNTIME_EVIDENCE_ROOTS: ${{ env.SAFE_EVIDENCE_ROOT }},${{ env.RUNTIME_EVIDENCE_ROOT }}');
    expect(workflow).not.toContain('EU_AI_ACT_RUNTIME_EVIDENCE_ROOTS: ${{ env.SAFE_EVIDENCE_ROOT }}:${{ env.RUNTIME_EVIDENCE_ROOT }}');
    expect(workflow).toContain('final overlay must promote readiness and provider evidence');
    expect(workflow).toContain('report.scores.runtimeEvidenceCoverage < 96');
  });

  it('uses an exact-SHA, ruleset-aware platform proof without widening workflow permissions', () => {
    expect(workflow).toContain("if: github.event_name == 'pull_request'");
    expect(workflow).toContain('node scripts/compliance/build-platform-controls-runtime-proof.mjs');
    expect(workflow).toContain("if: github.event_name != 'pull_request'");
    expect(workflow).toContain('node scripts/enterprise/fetch-branch-protection-runtime-evidence.mjs');
    expect(workflow).toContain("BRANCH_PROTECTION_RUNTIME_EVIDENCE_REQUIRED: 'true'");
    expect(workflow).toContain('tests/security/platform-controls-runtime-proof.test.mjs');
    expect(prPlatformProof).toContain('/branches/main/protection');
    expect(prPlatformProof).toContain('/rules/branches/main');
    expect(platformProof).toContain("const WORKFLOW_NAME = 'Branch Protection Runtime Proof'");
    expect(platformProof).toContain('selectLatestExactShaArtifact');
    expect(platformProof).toContain('branch-protection-required-checks.json');
    expect(platformProof).toContain('validateDownloadedEvidence');
    expect(workflow).not.toContain('administration: read');
    expect(workflow).toContain('waiting for deployment producer');
    expect(workflow).toContain('waiting for branch-proof producer');
    expect(workflow).toContain('for attempt in $(seq 1 30)');
    expect(workflow).toContain('No valid exact-SHA Branch Protection runtime artifact is available after bounded producer wait.');
  });

  it('keeps qualified human review outside automated promotion', () => {
    expect(workflow).toContain('human review boundary must remain NO_GO');
    expect(workflow).not.toContain('EU_AI_ACT_PRODUCT_COVERAGE_GO');
  });
});
