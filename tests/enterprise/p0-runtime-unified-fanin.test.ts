import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const workflowPath = path.join(root, '.github/workflows/p0-runtime-evidence.yml');
const hydratorPath = path.join(root, 'scripts/release/hydrate-enterprise-retained-runtime-evidence.mjs');

function read(file: string) {
  return fs.readFileSync(file, 'utf8');
}

describe('P0 runtime unified retained-evidence fan-in', () => {
  it('hydrates all independently valid exact-SHA retained producers before P0 validation', () => {
    const workflow = read(workflowPath);
    const hydrateStep = workflow.indexOf('Hydrate all independently valid exact-SHA retained runtime evidence');
    const validateStep = workflow.indexOf('Validate runtime evidence files');

    expect(hydrateStep).toBeGreaterThan(-1);
    expect(validateStep).toBeGreaterThan(hydrateStep);
    expect(workflow).toContain('node scripts/release/hydrate-enterprise-retained-runtime-evidence.mjs');
    expect(workflow).toContain("RETAINED_PROOF_OPTIONAL_ERRORS_AS_MISSING: 'true'");
    expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(workflow).toContain('TARGET_SHA: ${{ env.ASSESSED_SHA }}');
  });

  it('keeps dedicated workflow-run producer validation after the consolidated diagnostic fan-in', () => {
    const workflow = read(workflowPath);
    const hydrateStep = workflow.indexOf('Hydrate all independently valid exact-SHA retained runtime evidence');
    const dedicatedUploadStep = workflow.indexOf('Retrieve exact-SHA upload scanner runtime evidence');
    const dedicatedBranchStep = workflow.indexOf('Retrieve exact-SHA branch protection runtime evidence');

    expect(dedicatedUploadStep).toBeGreaterThan(hydrateStep);
    expect(dedicatedBranchStep).toBeGreaterThan(hydrateStep);
    expect(workflow).toContain("UPLOAD_SCANNER_RUNTIME_EVIDENCE_REQUIRED: ${{ github.event.workflow_run.path == '.github/workflows/upload-security-ci.yml' && 'true' || 'false' }}");
    expect(workflow).toContain("BRANCH_PROTECTION_RUNTIME_EVIDENCE_REQUIRED: ${{ github.event.workflow_run.path == '.github/workflows/branch-protection-runtime-proof.yml' && 'true' || 'false' }}");
  });

  it('uses the existing fail-closed retained-producer allowlist and never promotes missing proofs', () => {
    const hydrator = read(hydratorPath);

    for (const key of [
      'authRbac',
      'supabaseRls',
      'uploadScanner',
      'auditChain',
      'productionProvider',
      'branchProtection',
      'stepUp',
      'stripePromoted',
    ]) {
      expect(hydrator).toContain(`key: '${key}'`);
    }
    expect(hydrator).toContain('repositorySnapshotsClearedBeforeHydration: true');
    expect(hydrator).toContain('statusPromotionPerformedByHydrator: false');
    expect(hydrator).toContain('Invalid optional producer artifacts are cleared and reported as missing rather than aborting the diagnostic report; they receive no PASS credit.');
  });
});
